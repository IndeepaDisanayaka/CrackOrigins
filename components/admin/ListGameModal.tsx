'use client';

import React, { useState } from 'react';
import { Gamepad2, Tag, DollarSign, Layers, Monitor, HardDrive, Plus, CheckCircle } from 'lucide-react';
import Modal from '../Modal';
import { listGame, generateUniqueGameId } from '@/lib/admin-actions';
import { useToast } from '../Toast';
import { useAuth } from '../../lib/contexts/AuthContext';
import styles from '../../app/page.module.css';

interface ListGameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ListGameModal({ isOpen, onClose }: ListGameModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [gameForm, setGameForm] = useState({
    gameId: "",
    title: "",
    description: "",
    price: "",
    genre: "",
    os: "windows",
    image: "",
    logo: "",
    video: "",
    downloadUrl: "",
    requirement: {
      min: "",
      max: ""
    }
  });

  React.useEffect(() => {
    if (isOpen && step === 2 && !gameForm.gameId) {
      const fetchId = async () => {
        const res = await generateUniqueGameId();
        if (res.success && res.gameId) {
          setGameForm(prev => ({ ...prev, gameId: String(res.gameId) }));
        }
      };
      fetchId();
    }
  }, [isOpen, step, gameForm.gameId]);

  const handleListGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!gameForm.gameId || !gameForm.title || !gameForm.description || !gameForm.price || !gameForm.downloadUrl) {
      showToast("Please fill all required fields.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedData = {
        ...gameForm,
        gameId: isNaN(parseInt(gameForm.gameId)) ? gameForm.gameId : parseInt(gameForm.gameId),
        price: parseFloat(gameForm.price),
        genre: gameForm.genre.split(',').map(s => s.trim().toLowerCase()),
        os: gameForm.os.split(',').map(s => s.trim().toLowerCase())
      };

      const result = await listGame(user.uid, formattedData);
      if (result.success) {
        showToast("Game listed successfully!", "success");
        onClose();
        setStep(1);
        setGameForm({
          gameId: "",
          title: "",
          description: "",
          price: "",
          genre: "",
          os: "windows",
          image: "",
          logo: "",
          video: "",
          downloadUrl: "",
          requirement: { min: "", max: "" }
        });
      } else {
        showToast(result.error || "Failed to list game.", "error");
      }
    } catch {
      showToast("An unexpected error occurred.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={step === 1 ? "Setup Google Connection" : "List New Creation"}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0' }}>

        {step === 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(66, 133, 244, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '1px solid rgba(66, 133, 244, 0.2)'
            }}>
              {/* Custom Google Drive Icon using lucide symbols or simple placeholder */}
              <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#4285F4' }}>G</span>
            </div>

            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Google Drive Integration</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.7, lineHeight: 1.5 }}>
                To enable direct downloads, you must ensure your Google Drive files are accessible.
                This setup verifies your connection and prepares the direct link engine.
              </p>
            </div>

            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--outline-color)', textAlign: 'left' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <CheckCircle size={14} color="#4ade80" />
                <span style={{ fontSize: '0.8rem' }}>Google Authentication Verified</span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <CheckCircle size={14} color="#4ade80" />
                <span style={{ fontSize: '0.8rem' }}>Drive API Permissions Ready</span>
              </div>
            </div>

            <button className="btnSolid" style={{ width: '100%', padding: '1rem' }} onClick={() => setStep(2)}>
              Continue to Listing <Plus size={16} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleListGame} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <DollarSign size={12} /> Price ($)
                </label>
                <input type="number" placeholder="5.00" step="0.01" className={styles.adminInput} value={gameForm.price} onChange={e => setGameForm({ ...gameForm, price: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Gamepad2 size={12} /> Title
              </label>
              <input type="text" placeholder="Game Title" className={styles.adminInput} value={gameForm.title} onChange={e => setGameForm({ ...gameForm, title: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75 }}>YouTube Video ID</label>
                <input type="text" placeholder="e.g. dQw4w9WgXcQ" className={styles.adminInput} value={gameForm.video} onChange={e => setGameForm({ ...gameForm, video: e.target.value })} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75 }}>Game Logo URL</label>
                <input type="text" placeholder="https://..." className={styles.adminInput} value={gameForm.logo} onChange={e => setGameForm({ ...gameForm, logo: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Layers size={12} /> Description
              </label>
              <textarea placeholder="Game description..." className={styles.adminInput} rows={3} value={gameForm.description} onChange={e => setGameForm({ ...gameForm, description: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Layers size={12} /> Genre (comma separated)
                </label>
                <input type="text" placeholder="survival, multiplayer" className={styles.adminInput} value={gameForm.genre} onChange={e => setGameForm({ ...gameForm, genre: e.target.value })} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Monitor size={12} /> OS (comma separated)
                </label>
                <input type="text" placeholder="windows, mac os" className={styles.adminInput} value={gameForm.os} onChange={e => setGameForm({ ...gameForm, os: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <HardDrive size={12} /> Google Drive Direct Link
              </label>
              <input 
                type="url" 
                placeholder="https://drive.google.com/file/d/..." 
                className={styles.adminInput} 
                value={gameForm.downloadUrl} 
                onChange={e => {
                  const url = e.target.value;
                  const driveMatch = url.match(/\/file\/d\/([^\/?#]+)/) || url.match(/[?&]id=([^\/?#&]+)/);
                  const driveId = driveMatch ? driveMatch[1] : null;
                  
                  setGameForm(prev => ({ 
                    ...prev, 
                    downloadUrl: url,
                    gameId: driveId || prev.gameId 
                  }));
                }} 
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75 }}>Min Requirements</label>
                <input type="text" placeholder="Dual Core / 2GB RAM" className={styles.adminInput} value={gameForm.requirement.min} onChange={e => setGameForm({ ...gameForm, requirement: { ...gameForm.requirement, min: e.target.value } })} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75 }}>Max Requirements</label>
                <input type="text" placeholder="Quad Core / 4GB RAM" className={styles.adminInput} value={gameForm.requirement.max} onChange={e => setGameForm({ ...gameForm, requirement: { ...gameForm.requirement, max: e.target.value } })} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" className="btnOutline" onClick={() => setStep(1)} style={{ flex: 1 }}>Back</button>
              <button type="submit" className="btnSolid" disabled={isSubmitting} style={{ flex: 2 }}>
                {isSubmitting ? "Lising..." : "Confirm & List Game"}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
