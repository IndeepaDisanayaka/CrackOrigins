import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { model, customPrompt } = await request.json();
    const targetModel = model || 'gemini-2.5-pro';

    const defaultPrompt = `
      You are an expert gaming industry analyst and journalist. 
      Your task is to:
      1. Search the internet for the absolute latest and most trending news specifically in the gaming field (PC, Console, Mobile, Esports, etc.).
      2. Carefully evaluate the gathered information ("deep think" about it). Assess the truthfulness and accuracy.
      3. Analyze the legal aspects or behaviors associated with these updates (e.g., copyright issues, lawsuits, DMCA).
      4. Write purely professional, journalistic text. NEVER use conversational fillers like "Here is the response" or "As an AI model".
      
      FORMAT REQUIREMENT - CRITICAL:
      You MUST separate each topic clearly. Start EVERY trending topic exactly with:
      ## TOPIC: [Title of the Topic]
      
      Then include sections for "Overview", "Truthfulness", and "Legal Analysis".
    `;

    const prompt = customPrompt && customPrompt.trim().length > 0 ? customPrompt : defaultPrompt;

    const responseStream = await ai.models.generateContentStream({
      model: targetModel,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            if (chunk.text) {
              controller.enqueue(new TextEncoder().encode(chunk.text));
            }
          }
        } catch (e: any) {
          controller.enqueue(new TextEncoder().encode(`\n\n**Error during streaming: ${e.message}**`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch trending topics" }, { status: 500 });
  }
}
