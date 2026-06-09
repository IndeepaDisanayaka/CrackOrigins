import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { model, topic } = await request.json();
    
    const targetModel = model || 'gemini-2.5-pro';

    const prompt = `
      You are an expert, professional gaming industry journalist.
      I need you to perform a DEEP DIVE case study on the following topic:
      "${topic}"

      Your task:
      1. Search the internet across multiple authoritative sources for in-depth, long-form information about this specific topic.
      2. Write a highly detailed, comprehensive, and LONG SEO-optimized blog post targeting gaming audiences on Google search.
      
      CRITICAL RULES - READ CAREFULLY:
      - NEVER include conversational dialogue (e.g., "Here is your case study", "For SEO purposes", "As an AI").
      - DO NOT mention that you are an AI or language model. 
      - The output will be published directly to a public blog; it MUST read 100% like a professional human author.
      - Ensure the content is exceptionally LONG and in-depth. Do not skip details.
      - Structure using beautiful Markdown.
      - Start the article with a very catchy, highly SEO-optimized H1 Title (# Title).
      - At the very bottom of the document on a new line, provide SEO tags in this exact format: 
        SEO_TAGS: tag1, tag2, tag3
    `;

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
          controller.enqueue(new TextEncoder().encode(`\n\n**Error during case study streaming: ${e.message}**`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  } catch (error: any) {
    console.error("Gemini Case Study Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch case study" }, { status: 500 });
  }
}
