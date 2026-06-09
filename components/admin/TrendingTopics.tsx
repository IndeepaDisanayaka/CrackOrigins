'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, AlertCircle, Settings, FileText, UploadCloud, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { saveBlogPost } from '@/lib/admin-actions/blogs';
import { useToast } from '../Toast';

export default function TrendingTopics({ userUid }: { userUid: string }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'insights' | 'casestudies'>('insights');
  
  const [data, setData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-pro');
  
  const [showSettings, setShowSettings] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  // Case Study State
  const [caseStudyData, setCaseStudyData] = useState<string | null>(null);
  const [caseStudyLoading, setCaseStudyLoading] = useState(false);
  const [caseStudyTopic, setCaseStudyTopic] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [blogImage, setBlogImage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem('admin_trending_prompt');
    if (saved) setCustomPrompt(saved);
  }, []);

  const saveCustomPrompt = () => {
    localStorage.setItem('admin_trending_prompt', customPrompt);
    showToast("Prompt defaults saved locally.", "success");
    setShowSettings(false);
  };

  const models = [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Best & Accurate)' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast but light)' }
  ];

  const handleStreamError = (err: any, errSetter: Function) => {
    let errorMessage = err?.message || "An unknown error occurred.";
    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      errorMessage = "API Quota Exceeded: You have sent too many requests or run out of free usage limits. Please wait a moment and try again.";
    } else if (errorMessage.includes('503') || errorMessage.includes('UNAVAILABLE')) {
      errorMessage = "Model Overloaded: The selected model is currently experiencing high traffic. Please try selecting a different model.";
    }
    errSetter(errorMessage);
  };

  const fetchTrendingTopics = async () => {
    setLoading(true);
    setError(null);
    setData(""); 
    setActiveTab('insights');
    try {
      const res = await fetch('/api/admin/trending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: userUid, model: selectedModel, customPrompt })
      });
      
      if (!res.ok) {
        const json = await res.json().catch(()=>({}));
        throw new Error(json.error || `Server returned status ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Stream not supported");
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) setData(prev => (prev || "") + decoder.decode(value, { stream: true }));
      }
    } catch (err: any) {
      handleStreamError(err, setError);
    } finally {
      setLoading(false);
    }
  };

  const generateCaseStudy = async (topicTitle: string) => {
    setCaseStudyTopic(topicTitle);
    setActiveTab('casestudies');
    setCaseStudyLoading(true);
    setCaseStudyData("");
    setError(null);
    setBlogImage(""); // Reset image on new case study
    
    try {
      const res = await fetch('/api/admin/casestudy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: userUid, model: selectedModel, topic: topicTitle })
      });
      
      if (!res.ok) {
        const json = await res.json().catch(()=>({}));
        throw new Error(json.error || `Server status ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Stream not supported");
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) setCaseStudyData(prev => (prev || "") + decoder.decode(value, { stream: true }));
      }
    } catch (err: any) {
      handleStreamError(err, setError);
    } finally {
      setCaseStudyLoading(false);
    }
  };

  // Convert raw stream into sections dynamically
  const parseSections = (rawText: string | null) => {
      if (!rawText) return [];
      const chunks = rawText.split('## TOPIC:');
      return chunks.map((chunk, index) => {
         const content = chunk.trim();
         if (!content) return null;
         
         const lines = content.split('\n');
         const rawTitle = lines[0]?.trim();
         const title = rawTitle.replace(/\*\*/g, '').replace(/#/g, '').trim(); 
         const body = lines.slice(1).join('\n').trim();

         if (index === 0 && !title.toLowerCase().includes('topic')) {
            return { title: 'AI Introduction', body: content, isPreamble: true };
         }

         return { title, body, isPreamble: false };
      }).filter(Boolean);
  };

  const sections = parseSections(data);

  const publishAsBlog = async () => {
    if (!caseStudyData || !caseStudyTopic) return;
    
    if (!blogImage.trim()) {
       showToast("Please provide a cover image URL for the blog.", "error");
       return;
    }
    
    setPublishing(true);
    try {
       // Extract SEO Tags if AI generated them
       let extractedTags = "gaming, news, trend, indepth";
       let finalContent = caseStudyData;
       const tagsMatch = caseStudyData.match(/SEO_TAGS:\s*(.*)/i);
       if (tagsMatch && tagsMatch[1]) {
           extractedTags = tagsMatch[1].trim();
           // Remove the mapping from final content
           finalContent = caseStudyData.replace(/SEO_TAGS:\s*(.*)/i, '').trim();
       }

       // Parse an H1 Title from content if it exists to be precise, otherwise caseStudyTopic
       const h1Match = finalContent.match(/^#\s+(.*)/m);
       const finalTitle = h1Match && h1Match[1] ? h1Match[1].trim() : caseStudyTopic;
       // Strip markdown for description
       const plainText = finalContent.replace(/[#*`_\]\[]/g, '').replace(/\n+/g, ' ').trim();
       const description = plainText.substring(0, 150) + "...";
       
       const slug = finalTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
       
       const blogData = {
           slug,
           title: finalTitle,
           description,
           content: finalContent,
           tags: extractedTags,
           image: blogImage
       };

       const res = await saveBlogPost(userUid, blogData);
       if (res.success) {
           showToast("Successfully published as a Blog Post!", "success");
       } else {
           showToast(res.error || "Failed to publish blog.", "error");
       }
    } catch(err) {
       showToast("An unexpected error occurred publishing the blog.", "error");
    } finally {
       setPublishing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Settings Modal */}
      {showSettings && (
        <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid var(--outline-color)' }}>
           <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', fontWeight: 700 }}><Settings size={18} /> Customize AI Base Prompt</h4>
           <p style={{ opacity: 0.7, fontSize: '0.8rem', marginBottom: '1rem' }}>
             Provide custom instructions for how Gemini should search and format data. Your changes will be stored locally in your browser. Leave blank to use the strict default instructions.
           </p>
           <textarea 
             value={customPrompt} 
             onChange={(e) => setCustomPrompt(e.target.value)} 
             placeholder="Optional: Instruct Gemini here..."
             style={{ width: '100%', height: '150px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid var(--outline-color)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}
           />
           <div style={{ display: 'flex', gap: '1rem' }}>
             <button className="btnSolid" onClick={saveCustomPrompt}>Save Config Locally</button>
             <button className="btnOutline" onClick={() => setShowSettings(false)}>Cancel</button>
           </div>
        </div>
      )}

      {/* Main Header Controller */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--outline-color)', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Search size={18} color="var(--primary)" /> AI Insights & Trending 
          </h3>
          <p style={{ fontSize: '0.85rem', opacity: 0.7, maxWidth: '600px' }}>
            Select an official model, scan the internet, separate topics easily, and turn findings into comprehensive case studies or published blogs.
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button className="btnOutline" onClick={() => setShowSettings(!showSettings)} style={{ padding: '0.7rem' }}>
             <Settings size={18} />
          </button>
          <select 
             value={selectedModel}
             onChange={(e) => setSelectedModel(e.target.value)}
             disabled={loading || caseStudyLoading}
             style={{ 
               padding: '0.7rem 1rem', borderRadius: '8px', background: 'transparent', 
               color: 'var(--foreground)', border: '1px solid var(--outline-color)', outline: 'none'
             }}
          >
            {models.map(m => (
              <option key={m.value} value={m.value} style={{ background: '#111', color: '#fff' }}>{m.label}</option>
            ))}
          </select>
          <button className="btnSolid" style={{ padding: '0.7rem 1.5rem', gap: '0.5rem' }} onClick={fetchTrendingTopics} disabled={loading || caseStudyLoading}>
            {loading ? <RefreshCw className="spin" size={16} /> : <Search size={16} />}
            Gather Market Data
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', border: '1px solid rgba(255, 77, 77, 0.3)' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--outline-color)', paddingBottom: '0.5rem' }}>
         <div onClick={() => setActiveTab('insights')} style={{ cursor: 'pointer', padding: '0.5rem 1rem', borderBottom: activeTab === 'insights' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'insights' ? 'var(--primary)' : 'inherit', fontWeight: activeTab === 'insights' ? 800 : 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
           <FileText size={16} /> Trending Insights
         </div>
         <div onClick={() => setActiveTab('casestudies')} style={{ cursor: 'pointer', padding: '0.5rem 1rem', borderBottom: activeTab === 'casestudies' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'casestudies' ? 'var(--primary)' : 'inherit', fontWeight: activeTab === 'casestudies' ? 800 : 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
           <BookOpen size={16} /> Case Studies
         </div>
      </div>

      {/* Content Area for Trending Insights */}
      {activeTab === 'insights' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sections.length > 0 ? sections.map((sec: any, idx: number) => (
             <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--outline-color)' }}>
               {sec.isPreamble ? (
                 <div className="blog-content" style={{ opacity: 0.8 }}><ReactMarkdown remarkPlugins={[remarkGfm]}>{sec.body}</ReactMarkdown></div>
               ) : (
                 <>
                   <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem' }}>{sec.title}</h2>
                   <div className="blog-content" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                     <ReactMarkdown remarkPlugins={[remarkGfm]}>{sec.body}</ReactMarkdown>
                   </div>
                   <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--outline-color)', paddingTop: '1.5rem' }}>
                     <button className="btnSolid" style={{ gap: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.8rem' }} onClick={() => generateCaseStudy(sec.title)} disabled={loading || caseStudyLoading}>
                        {caseStudyLoading && caseStudyTopic === sec.title ? <RefreshCw className="spin" size={14} /> : <BookOpen size={14} />}
                        Analyze Deep Case Study
                     </button>
                   </div>
                 </>
               )}
             </div>
          )) : (!loading && !error && (
             <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>Click "Gather Market Data" to begin pulling trends.</div>
          ))}

          {loading && (
             <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', padding: '2rem', fontWeight: 600 }}>
               <RefreshCw className="spin" size={18} /> Mining data from the web iteratively...
             </div>
          )}
        </div>
      )}

      {/* Content Area for Case Studies */}
      {activeTab === 'casestudies' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
           {caseStudyTopic && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(var(--primary-rgb), 0.1)', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid var(--primary)', color: 'var(--primary)' }}>
                <div>
                   <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>Active Study Target</span>
                   <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{caseStudyTopic}</div>
                </div>
                {!caseStudyLoading && caseStudyData && (
                   <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                     <input 
                       type="text" 
                       placeholder="Paste Blog Cover Image URL here..." 
                       value={blogImage}
                       onChange={(e) => setBlogImage(e.target.value)}
                       style={{ 
                         padding: '0.6rem 1rem', 
                         borderRadius: '8px', 
                         background: 'rgba(0,0,0,0.4)', 
                         color: 'var(--primary)',
                         border: '1px solid var(--primary)',
                         outline: 'none',
                         width: '300px',
                         fontSize: '0.85rem'
                       }}
                     />
                     <button className="btnSolid" style={{ gap: '0.5rem' }} onClick={publishAsBlog} disabled={publishing}>
                       {publishing ? <RefreshCw className="spin" size={16} /> : <UploadCloud size={16} />}
                       Publish as Blog Post
                     </button>
                   </div>
                )}
              </div>
           )}

           {caseStudyData ? (
              <div className="blog-content" style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--outline-color)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{caseStudyData}</ReactMarkdown>
                
                {caseStudyLoading && (
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', marginTop: '2rem', fontWeight: 600 }}>
                     <RefreshCw className="spin" size={16} /> Analyzing deep internet archives, legal journals, and sources...
                   </div>
                )}
              </div>
           ) : (!caseStudyLoading && !error && (
              <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>No active case study. Generate one from the Insights tab!</div>
           ))}
        </div>
      )}
    </div>
  );
}
