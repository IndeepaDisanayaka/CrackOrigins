'use client';

import React, { useState, useEffect } from 'react';
import { X, Send, FileText, CheckCircle2, XCircle, FileUp, Sparkles, Gamepad2, Info } from 'lucide-react';
import { useToast } from '../Toast';
import { useAuth } from '@/lib/contexts/AuthContext';
import Modal from '../Modal';
import { getGames } from '@/lib/admin-actions';
import styles from '../../app/page.module.css';

interface DispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DispatchModal({ isOpen, onClose, onSuccess }: DispatchModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    image: '',
    author: 'Crack Origins Core',
    tags: '',
    type: 'blog', // 'blog' or 'game-update'
    gameId: ''
  });
  const [games, setGames] = useState<any[]>([]);
  const [isFileLoaded, setIsFileLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      const fetchGames = async () => {
        const res = await getGames();
        if (res.success && res.games) {
          setGames(res.games);
        }
      };
      fetchGames();
    }
  }, [isOpen]);

  const isFullyValid = formData.title && formData.image && formData.author && formData.description && formData.content.length > 50 && (formData.type === 'blog' || formData.gameId);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const frontmatterRegex = /^---[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]*/;
      const match = text.match(frontmatterRegex);
      
      if (match) {
        const fm = match[1];
        const titleMatch = fm.match(/title:\s*['"]?(.*?)['"]?$/m);
        const descMatch = fm.match(/description:\s*['"]?(.*?)['"]?$/m);
        const imgMatch = fm.match(/image:\s*['"]?(.*?)['"]?$/m);
        const authMatch = fm.match(/author:\s*['"]?(.*?)['"]?$/m);
        const tagsMatch = fm.match(/tags:\s*\[(.*?)\]/m);
        
        setFormData(prev => ({
          ...prev,
          title: titleMatch ? titleMatch[1] : '',
          description: descMatch ? descMatch[1] : '',
          image: imgMatch ? imgMatch[1] : '',
          author: authMatch ? authMatch[1] : 'Crack Origins Core',
          tags: tagsMatch ? tagsMatch[1].replace(/['"]/g, '') : '',
          content: text.replace(frontmatterRegex, '').trim()
        }));
        setIsFileLoaded(true);
        showToast('System Manifest Parsed.', 'success');
      } else {
        showToast('Invalid File: Missing Frontmatter (--- ... ---)', 'error');
        setIsFileLoaded(false);
      }
    } catch(err) {
      showToast('Failed to read file.', 'error');
    } finally {
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

      const resData = await response.json();

      if (response.ok) {
        showToast('Dispatch Authorized. Deployment initiated.', 'success');
        if (onSuccess) onSuccess();
        onClose();
        setFormData({ title: '', description: '', content: '', image: '', author: 'Crack Origins Core', tags: '', type: 'blog', gameId: '' });
      } else {
        showToast(resData.error || 'Transmission Failed.', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Network error during transmission.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="List New Dispatch" maxWidth="500px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75 }}>Post Type</label>
              <select 
                className={styles.adminInput} 
                value={formData.type} 
                onChange={e => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="blog">Normal Blog</option>
                <option value="game-update">Game Update</option>
              </select>
            </div>
            {formData.type === 'game-update' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75 }}>Select Game</label>
                <select 
                  className={styles.adminInput} 
                  value={formData.gameId} 
                  onChange={e => setFormData({ ...formData, gameId: e.target.value })}
                  required
                >
                  <option value="">-- Choose Game --</option>
                  {games.map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {formData.type === 'game-update' && (
             <div style={{ padding: '1rem', background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid var(--primary)', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 900, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <Info size={14} /> Requirement Manifest
                </h4>
                <ul style={{ paddingLeft: '1.2rem', fontSize: '0.7rem', opacity: 0.8, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                   <li>Must include <strong>Version</strong> string (e.g. v1.0.4)</li>
                   <li>Tags should include "Update" or "Patch"</li>
                </ul>
             </div>
          )}

          <div style={{ 
            padding: '1.5rem 1rem', 
            border: '1px dashed var(--outline-color)', 
            borderRadius: '12px', 
            textAlign: 'center', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '1rem',
          }}>
             <FileUp size={30} opacity={0.5} color="var(--primary)" />
             <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--foreground)' }}>Upload Markdown Payload</h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.7rem', color: 'var(--foreground)', opacity: 0.6, lineHeight: 1.4 }}>
                  System will automatically extract Meta Tags.
                </p>
             </div>
             
             {!isFileLoaded && (
               <div style={{ 
                 background: 'var(--background)', 
                 border: '1px solid var(--outline-color)', 
                 borderRadius: '8px', 
                 padding: '0.75rem', 
                 textAlign: 'left', 
                 width: '100%',
               }}>
                 <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.7rem', fontWeight: 800, color: 'var(--foreground)' }}>Required Frontmatter:</p>
                 <pre style={{ 
                   margin: 0, 
                   fontSize: '0.65rem', 
                   fontFamily: 'monospace', 
                   color: 'var(--foreground)',
                   opacity: 0.8,
                   lineHeight: 1.3
                 }}>
                   ---{'\n'}
                   title: "Your Title"{'\n'}
                   image: "https://..."{'\n'}
                   author: "Author"{'\n'}
                   tags: ["tag1"]{'\n'}
                   description: "Short desc..."{'\n'}
                   ---
                 </pre>
               </div>
             )}

             <label className="btnSolid" style={{ cursor: 'pointer', padding: '0.6rem 1.2rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem' }}>
                Select .MD File
                <input type="file" accept=".md" style={{ display: 'none' }} onChange={handleFileUpload} />
             </label>
          </div>

          {isFileLoaded && (
             <div style={{ padding: '1rem', background: 'transparent', borderRadius: '12px', border: '1px solid var(--outline-color)' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Sparkles size={14} color="var(--primary)" /> Validation Check
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                   <ChecklistRow isValid={!!formData.title} label={`Title: ${formData.title.substring(0, 20)}...`} />
                   <ChecklistRow isValid={!!formData.image} label="Cover Image URL Connected" />
                   <ChecklistRow isValid={!!formData.author} label={`Author: ${formData.author}`} />
                   <ChecklistRow isValid={formData.content.length > 50} label="Content Payload Verified" />
                   {formData.type === 'game-update' && (
                      <ChecklistRow isValid={formData.content.toLowerCase().includes('version') || formData.content.toLowerCase().includes('v1.') || formData.content.toLowerCase().includes('v0.')} label="Version Info Detected" />
                   )}
                </div>
             </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btnSolid" disabled={isSubmitting || (!isFullyValid && isFileLoaded)} style={{ flex: 1, width: '100%', justifyContent: 'center' }}>
              {isSubmitting ? "Authorizing..." : (
                <><Send size={16} /> Publish {formData.type === 'blog' ? 'Dispatch' : 'Game Update'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
