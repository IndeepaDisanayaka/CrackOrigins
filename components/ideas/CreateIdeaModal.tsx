'use client';

import React, { useState } from 'react';
import {
  FileText, Type, AlignLeft, ImageIcon, Plus, Sparkles, Loader2, CheckSquare,
  Square, BadgeCheck, ShieldAlert, Tag, UserPlus, Target, Flag, Info, X, Music, Trash
} from 'lucide-react';
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
    tags: [] as string[],
    characters: [] as { name: string, type: string }[],
    environmentType: 'Modern',
    storyType: 'Action',
    targetAudience: '',
    goal: '',
    endingType: 'Happy',
    soundtracks: [] as string[]
  });
  const [newTag, setNewTag] = useState('');
  const [newChar, setNewChar] = useState({ name: '', type: 'Normal' });
  const [newTrack, setNewTrack] = useState('');
  const [isDisclaimerAgreed, setIsDisclaimerAgreed] = useState(false);

  const getWordCount = (str: string) => str.trim() ? str.trim().split(/\s+/).length : 0;

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

    if (!selectedLicense) {
      showToast("License selection required.", "error", { subtitle: "Please select an official studio license to publish." });
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
        tags: formData.tags,
        characters: formData.characters,
        environmentType: formData.environmentType,
        storyType: formData.storyType,
        targetAudience: formData.targetAudience,
        endingType: formData.endingType,
        soundtracks: formData.soundtracks
      });

      if (result.success) {
        showToast("Idea shared successfully!", "success");
        setFormData({
          title: '', description: '', image: '', tags: [], characters: [],
          environmentType: 'Modern', storyType: 'Action', targetAudience: '', goal: '', endingType: 'Happy', soundtracks: []
        });
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
    <Modal isOpen={isOpen} onClose={onClose} title="Publish New Story" maxWidth="800px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0' }}>
        <div style={{
          background: 'rgba(255, 107, 107, 0.08)',
          padding: '1rem',
          borderRadius: '10px',
          border: '1px dashed rgba(255, 107, 107, 0.3)',
          display: 'flex',
          gap: '0.8rem',
          alignItems: 'center'
        }}>
          <ShieldAlert size={20} color="#ff6b6b" />
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#ff6b6b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Warning: Title and License terms are permanent once synchronized with the cloud.
          </p>
        </div>
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

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', gridColumn: '1 / -1' }}>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <AlignLeft size={14} className="text-primary" /> Short Description / Excerpt
            </label>
            <textarea
              placeholder="Give a brief overview of your story..."
              className={styles.adminInput}
              style={{ minHeight: '80px', resize: 'vertical', paddingTop: '0.8rem' }}
              value={formData.description}
              onChange={e => {
                const words = getWordCount(e.target.value);
                if (words <= 200 || e.target.value.length < formData.description.length) {
                  setFormData({ ...formData, description: e.target.value });
                }
              }}
              required
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '0.65rem', opacity: 0.5, color: getWordCount(formData.description) >= 200 ? 'var(--primary)' : 'inherit' }}>
                {getWordCount(formData.description)} / 200 words
              </span>
            </div>
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
            <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>Recommended: 16:9 aspect ratio.</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <BadgeCheck size={14} className="text-primary" /> Apply License
            </label>
            <select
              className={styles.adminInput}
              value={selectedLicense}
              onChange={e => setSelectedLicense(e.target.value)}
              style={{ background: 'var(--background)', color: 'var(--foreground)' }}
              required
            >
              <option value="">Select an Official License...</option>
              {licenses.map(lic => (
                <option key={lic._id} value={lic.code}>
                  {lic.code} - {lic.name}
                </option>
              ))}
            </select>
          </div>

          {/* New Metadata Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase' }}>
              <Tag size={14} className="text-primary" /> Tags (Max 10)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className={styles.adminInput}
                placeholder="Add tag..."
                style={{ flex: 1 }}
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newTag && formData.tags.length < 10) {
                      setFormData({ ...formData, tags: [...formData.tags, newTag] });
                      setNewTag('');
                    }
                  }
                }}
              />
              <button type="button" className="btnSolid" style={{ padding: '0 1rem' }} onClick={() => {
                if (newTag && formData.tags.length < 10) {
                  setFormData({ ...formData, tags: [...formData.tags, newTag] });
                  setNewTag('');
                }
              }}>+</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.2rem' }}>
              {formData.tags.map((tag, i) => (
                <span key={i} style={{ background: 'var(--primary)', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  #{tag} <X size={10} cursor="pointer" onClick={() => setFormData({ ...formData, tags: formData.tags.filter((_, idx) => idx !== i) })} />
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase' }}>
              <UserPlus size={14} className="text-primary" /> Characters
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" className={styles.adminInput} placeholder="Name" style={{ flex: 1 }} value={newChar.name} onChange={e => setNewChar({ ...newChar, name: e.target.value })} />
              <select className={styles.adminInput} value={newChar.type} onChange={e => setNewChar({ ...newChar, type: e.target.value })} style={{ width: '100px', padding: '0 0.5rem' }}>
                <option>Main</option>
                <option>Supporter</option>
                <option>Enemy</option>
                <option>Normal</option>
              </select>
              <button type="button" className="btnSolid" style={{ padding: '0 1rem' }} onClick={() => {
                if (newChar.name) {
                  setFormData({ ...formData, characters: [...formData.characters, newChar] });
                  setNewChar({ name: '', type: 'Normal' });
                }
              }}>+</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8, textTransform: 'uppercase' }}>Environment Type</label>
            <select className={styles.adminInput} value={formData.environmentType} onChange={e => setFormData({ ...formData, environmentType: e.target.value })}>
              <option>Legacy</option>
              <option>Futuristic</option>
              <option>Modern</option>
              <option>Universal</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8, textTransform: 'uppercase' }}>Story Type</label>
            <select className={styles.adminInput} value={formData.storyType} onChange={e => setFormData({ ...formData, storyType: e.target.value })}>
              <option>Puzzle</option>
              <option>Horror</option>
              <option>Action</option>
              <option>Drama</option>
              <option>Syfy</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8, textTransform: 'uppercase' }}>Target Audience</label>
            <input type="text" className={styles.adminInput} placeholder="e.g. All Ages" value={formData.targetAudience} onChange={e => setFormData({ ...formData, targetAudience: e.target.value })} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8, textTransform: 'uppercase' }}>Ending Type</label>
            <select className={styles.adminInput} value={formData.endingType} onChange={e => setFormData({ ...formData, endingType: e.target.value })}>
              <option>Happy</option>
              <option>Sad</option>
              <option>Cliffhanger</option>
              <option>Mysterious</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8, textTransform: 'uppercase' }}>Goal / Objective (Optional)</label>
            <input
              type="text"
              className={styles.adminInput}
              placeholder="What is the mission? (Max 5 words)"
              value={formData.goal}
              onChange={e => {
                const words = getWordCount(e.target.value);
                if (words <= 5 || e.target.value.length < formData.goal.length) {
                  setFormData({ ...formData, goal: e.target.value });
                }
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '0.65rem', opacity: 0.5, color: getWordCount(formData.goal) >= 5 ? 'var(--primary)' : 'inherit' }}>
                {getWordCount(formData.goal)} / 5 words
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Music size={14} className="text-primary" /> Atmospheric Soundtrack Playlist (YouTube URLs)
            </label>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="url"
                className={styles.adminInput}
                placeholder="Paste YouTube URL..."
                style={{ flex: 1 }}
                value={newTrack}
                onChange={e => setNewTrack(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newTrack && isDisclaimerAgreed) {
                      setFormData({ ...formData, soundtracks: [...formData.soundtracks, newTrack] });
                      setNewTrack('');
                    }
                  }
                }}
              />
              <button 
                type="button" 
                className="btnSolid" 
                style={{ padding: '0 1.2rem' }} 
                disabled={!newTrack || !isDisclaimerAgreed}
                onClick={() => {
                  if (newTrack && isDisclaimerAgreed) {
                    setFormData({ ...formData, soundtracks: [...formData.soundtracks, newTrack] });
                    setNewTrack('');
                  }
                }}
              >
                ADD
              </button>
            </div>

            {formData.soundtracks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
                {formData.soundtracks.map((url, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid var(--outline-color)', borderRadius: '6px', fontSize: '0.7rem' }}>
                    <span style={{ opacity: 0.8, wordBreak: 'break-all' }}>{url}</span>
                    <Trash size={12} cursor="pointer" onClick={() => setFormData({ ...formData, soundtracks: formData.soundtracks.filter((_, idx) => idx !== i) })} />
                  </div>
                ))}
              </div>
            )}

            {(newTrack || formData.soundtracks.length > 0) && (
              <div style={{ marginTop: '0.8rem', padding: '1rem', background: 'rgba(255, 100, 100, 0.05)', border: '1px solid rgba(255, 100, 100, 0.2)', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.7rem', color: '#ff6666', lineHeight: 1.4, margin: 0, fontWeight: 700 }}>
                  ⚠️ LEGAL DISCLOSURE: None of these sounds belong to Crack Origins; they are obtained from third-party platforms. All responsibility for these sounds rests with the person who added them.
                </p>
                <div 
                  onClick={() => setIsDisclaimerAgreed(!isDisclaimerAgreed)} 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.8rem', cursor: 'pointer' }}
                >
                  {isDisclaimerAgreed ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} />}
                  <span style={{ fontSize: '0.65rem', fontWeight: 800 }}>I AGREE & UNDERSTAND</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', gridColumn: '1 / -1' }}>
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
            justifyContent: 'flex-end',
            gridColumn: '1 / -1'
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
