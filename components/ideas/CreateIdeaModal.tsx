'use client';

import React, { useState } from 'react';
import { FileText, Type, AlignLeft, ImageIcon, Plus, Sparkles, Loader2, CheckSquare, Square, BadgeCheck } from 'lucide-react';
import Modal from '../Modal';
import { useAuth } from '../../lib/contexts/AuthContext';
import { useToast } from '../Toast';
import { publishIdea } from '../../lib/idea-actions';
import { getLicenses } from '@/lib/admin-actions';
import styles from '../../app/page.module.css';

interface CreateIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateIdeaModal({ isOpen, onClose }: CreateIdeaModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [selectedLicense, setSelectedLicense] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
  });

  React.useEffect(() => {
    if (isOpen && user) {
      getLicenses(user.uid).then(res => {
        if (res.success && res.licenses) {
          setLicenses(res.licenses);
        }
      });
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast("Please login to share your ideas.", "error");
      return;
    }

    if (!formData.title || !formData.description) {
      showToast("Title and description are required.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await publishIdea(user.uid, {
        title: formData.title,
        description: formData.description,
        image: formData.image,
        isPrivate: isPrivate,
        author: user.displayName || user.email || 'Anonymous',
        authorPhoto: user.photoURL || '',
        licenseCode: selectedLicense,
      });

      if (result.success) {
        showToast("Idea shared successfully!", "success");
        setFormData({ title: '', description: '', image: '' });
        setIsPrivate(false);
        onClose();
      } else {
        showToast(result.error || "Failed to share idea.", "error");
      }
    } catch (error) {
      console.error("Error calling publishIdea: ", error);
      showToast("An unexpected error occurred.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Publish New Story" maxWidth="550px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem 0' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(254, 182, 12, 0.1) 0%, rgba(254, 182, 12, 0.05) 100%)',
          padding: '1.25rem',
          borderRadius: '12px',
          border: '1px solid rgba(254, 182, 12, 0.2)',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <div style={{
            background: 'var(--primary)',
            color: 'black',
            padding: '0.75rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)' }}>CRAFT YOUR LORE</h4>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', opacity: 0.7 }}>Share your imagination with the Crack Origins community.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Type size={14} className="text-primary" /> Story Title
            </label>
            <input
              type="text"
              placeholder="e.g. The Shadows of Neo-Tokyo"
              className={styles.adminInput}
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <AlignLeft size={14} className="text-primary" /> Short Description / Excerpt
            </label>
            <textarea
              placeholder="Give a brief overview of your story..."
              className={styles.adminInput}
              style={{ minHeight: '120px', resize: 'vertical', paddingTop: '0.8rem' }}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <ImageIcon size={14} className="text-primary" /> Cover Image URL
            </label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              className={styles.adminInput}
              value={formData.image}
              onChange={e => setFormData({ ...formData, image: e.target.value })}
            />
            <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>Recommended: 16:9 aspect ratio high-quality visuals.</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <BadgeCheck size={14} className="text-primary" /> Apply License (Verification)
            </label>
            <select
              className={styles.adminInput}
              value={selectedLicense}
              onChange={e => setSelectedLicense(e.target.value)}
              style={{ background: 'var(--background)', color: 'var(--foreground)' }}
            >
              <option value="">No License (Open Source / Free Use)</option>
              {licenses.map(lic => (
                <option key={lic._id} value={lic.code}>
                  {lic.code} - {lic.name}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>Official studio-verified licenses only. Select "No License" for fan-made stories.</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div 
              onClick={() => setIsPrivate(!isPrivate)}
          style={{ 
            display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', 
            width: '100%', padding: '0.75rem', border: '1px solid var(--outline-color)',
            transition: 'border-color 0.2s ease', borderRadius: '8px',
            borderColor: isPrivate ? 'var(--primary)' : 'var(--outline-color)'
          }}
        >
          <div style={{ marginTop: '0.1rem', color: isPrivate ? 'var(--primary)' : 'var(--text-muted)' }}>
            {isPrivate ? <CheckSquare size={18} /> : <Square size={18} />}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--foreground)', textAlign: 'left', lineHeight: 1.4, fontWeight: 500 }}>
            This Is Private (Only visible to you in your profile & you can edite and collaborate using this url) 
          </span>
        </div>
          </div>

          <div style={{
            marginTop: '0.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--outline-color)',
            display: 'flex',
            justifyContent: 'flex-end'
          }}>
            <button
              type="submit"
              className={`btnSolid ${isSubmitting ? 'glitchLoader' : ''}`}
              disabled={isSubmitting}
              style={{
                padding: '0.8rem 2rem',
                gap: '0.6rem',
                minWidth: '160px',
                justifyContent: 'center'
              }}

            >
              {isSubmitting ? (
                <>Publishing...</>
                // <><Loader2 size={18} className="spinIcon" /> Publishing...</>
              ) : (
                <><Plus size={18} /> Publish Story</>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
