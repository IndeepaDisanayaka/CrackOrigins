'use client';

import React, { useState } from 'react';
import { X, Send, FileText, CheckCircle2, XCircle, FileUp, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '../Toast';
import { useAuth } from '@/lib/contexts/AuthContext';
import Modal from '../Modal';
import styles from '../../app/page.module.css';

interface DispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DispatchModal({ isOpen, onClose }: DispatchModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    image: '',
    author: 'Crack Origins Core',
    tags: ''
  });
  const [isFileLoaded, setIsFileLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();
  const { user } = useAuth();

  const isFullyValid = formData.title && formData.image && formData.author && formData.description && formData.content.length > 50;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      // Use resilient regex to handle both MacOS \n and Windows \r\n line endings correctly
      const frontmatterRegex = /^---[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]*/;
      const match = text.match(frontmatterRegex);
      
      if (match) {
        const fm = match[1];
        const titleMatch = fm.match(/title:\s*['"]?(.*?)['"]?$/m);
        const descMatch = fm.match(/description:\s*['"]?(.*?)['"]?$/m);
        const imgMatch = fm.match(/image:\s*['"]?(.*?)['"]?$/m);
        const authMatch = fm.match(/author:\s*['"]?(.*?)['"]?$/m);
        const tagsMatch = fm.match(/tags:\s*\[(.*?)\]/m);
        
        setFormData({
          title: titleMatch ? titleMatch[1] : '',
          description: descMatch ? descMatch[1] : '',
          image: imgMatch ? imgMatch[1] : '',
          author: authMatch ? authMatch[1] : 'Crack Origins Core',
          tags: tagsMatch ? tagsMatch[1].replace(/['"]/g, '') : '',
          content: text.replace(frontmatterRegex, '').trim()
        });
        setIsFileLoaded(true);
        showToast('System Manifest Parsed.', 'success');
      } else {
        showToast('Invalid File: Missing Frontmatter (--- ... ---)', 'error');
        setIsFileLoaded(false);
      }
    } catch(err) {
      showToast('Failed to read file.', 'error');
    } finally {
      // Free the input so the user can re-upload the exact same file after modifying it
      e.target.value = '';
    }
  };

  const ChecklistRow = ({ isValid, label }: { isValid: boolean; label: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', opacity: isValid ? 1 : 0.6 }}>
      {isValid ? <CheckCircle2 size={16} color="var(--primary)" /> : <XCircle size={16} color="var(--foreground)" style={{ opacity: 0.5 }} />}
      <span style={{ color: 'var(--foreground)', fontWeight: isValid ? 700 : 400 }}>{label}</span>
    </div>
  );

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Authentication required.', 'error');
      return;
    }
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/blog/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userId: user.uid,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          date: new Date().toISOString()
        })
      });

      if (response.ok) {
        showToast('Dispatch Authorized. Deployment initiated.', 'success');
        onClose();
        setFormData({ title: '', description: '', content: '', image: '', author: 'Crack Origins Core', tags: '' });
      } else {
        showToast('Transmission Failed. Check system logs.', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Network error during transmission.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="List New Dispatch" maxWidth="450px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ 
            padding: '2rem 1rem', 
            border: '1px dashed var(--outline-color)', 
            borderRadius: '12px', 
            textAlign: 'center', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '1.25rem',
          }}>
             <FileUp size={36} opacity={0.5} color="var(--primary)" />
             <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--foreground)' }}>Upload Markdown Payload</h3>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.75rem', color: 'var(--foreground)', opacity: 0.6, lineHeight: 1.4 }}>
                  System will automatically extract Meta Tags.<br/>Fully complete and validated files only.
                </p>
             </div>
             
             {!isFileLoaded && (
               <div style={{ 
                 background: 'var(--background)', 
                 border: '1px solid var(--outline-color)', 
                 borderRadius: '8px', 
                 padding: '1rem', 
                 textAlign: 'left', 
                 width: '100%',
                 maxWidth: '350px'
               }}>
                 <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--foreground)' }}>Required Format:</p>
                 <pre style={{ 
                   margin: 0, 
                   fontSize: '0.7rem', 
                   fontFamily: 'monospace', 
                   color: 'var(--foreground)',
                   opacity: 0.9,
                   lineHeight: 1.4
                 }}>
                   ---{'\n'}
                   title: "Your Title"{'\n'}
                   image: "https://..."{'\n'}
                   author: "Author Name"{'\n'}
                   tags: ["tag1", "tag2"]{'\n'}
                   description: "Short desc..."{'\n'}
                   ---{'\n\n'}
                   # Your Content Here
                 </pre>
               </div>
             )}

             <label className="btnSolid" style={{ cursor: 'pointer', padding: '0.75rem 1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                Select .MD File
                <input type="file" accept=".md" style={{ display: 'none' }} onChange={handleFileUpload} />
             </label>
          </div>

          {isFileLoaded && (
             <div style={{ padding: '1.25rem', background: 'transparent', borderRadius: '12px', border: '1px solid var(--outline-color)' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Sparkles size={14} color="var(--primary)" /> Quality Control Check
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                   <ChecklistRow isValid={!!formData.title} label={`Title: ${formData.title.substring(0, 25) || 'Missing'}...`} />
                   <ChecklistRow isValid={!!formData.image} label="Cover Image URL Connected" />
                   <ChecklistRow isValid={!!formData.author} label={`Author: ${formData.author}`} />
                   <ChecklistRow isValid={!!formData.description} label="Short Description Confirmed" />
                   <ChecklistRow isValid={formData.content.length > 50} label="Content Payload Verified (>50 chars)" />
                </div>
             </div>
          )}

          {isFileLoaded && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                   <FileText size={12} /> Post Body Preview
                </label>
                <textarea
                   readOnly
                   rows={6}
                   className={styles.adminInput}
                   style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: 'transparent', border: '1px solid var(--outline-color)' }}
                   value={formData.content}
                />
             </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btnSolid" disabled={isSubmitting || (!isFullyValid && isFileLoaded)} style={{ flex: 1, width: '100%' }}>
              {isSubmitting ? "Authorizing..." : (
                <>Authorize & Publish Dispatch <Send size={16} /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
