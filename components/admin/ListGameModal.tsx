'use client';

import React, { useState } from 'react';
import { Gamepad2, Tag, DollarSign, Layers, Monitor, HardDrive, Plus, Image as ImageIcon, Cpu, MemoryStick, Box, Laptop, Activity, ToggleLeft as Toggle, HelpCircle } from 'lucide-react';
import Modal from '../Modal';
import { listGame } from '@/lib/admin-actions';
import { useToast } from '../Toast';
import CheckCircle from '../CheckCircle';
import { useAuth } from '../../lib/contexts/AuthContext';
import styles from '../../app/page.module.css';

interface ListGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ListGameModal({ isOpen, onClose, onSuccess }: ListGameModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [gameForm, setGameForm] = useState({
    title: "",
    description: "",
    price: "",
    genre: "",
    os: "windows",
    logo: "",
    video: "",
    downloadUrl: "",
    images: "",
    storage: "",
    vrSupported: false,
    status: "released", // Default to released
    requirement: {
      min: {
        processor: "",
        memory: "",
        graphics: "",
        directx: "Version 11"
      },
      max: {
        processor: "",
        memory: "",
        graphics: "",
        directx: "Version 11"
      }
    }
  });

  const handleListGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!gameForm.title || !gameForm.description || !gameForm.price || !gameForm.downloadUrl) {
      showToast("Please fill all required fields.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedData = {
        ...gameForm,
        price: parseFloat(gameForm.price),
        genre: gameForm.genre.split(',').map(s => s.trim().toLowerCase()),
        os: gameForm.os.split(',').map(s => s.trim().toLowerCase()),
        images: gameForm.images.split(',').map(s => s.trim()).filter(Boolean),
        downloadCount: 0,
        requirement: {
            min: { ...gameForm.requirement.min, storage: gameForm.storage, vrSupported: gameForm.vrSupported },
            max: { ...gameForm.requirement.max, storage: gameForm.storage, vrSupported: gameForm.vrSupported }
        }
      };

      const result = await listGame(user.uid, formattedData);
      if (result.success) {
        showToast("Game listed successfully!", "success");
        if (onSuccess) onSuccess();
        onClose();
        setGameForm({
          title: "",
          description: "",
          price: "",
          genre: "",
          os: "windows",
          logo: "",
          video: "",
          downloadUrl: "",
          images: "",
          storage: "",
          vrSupported: false,
          status: "released",
          requirement: {
            min: { processor: "", memory: "", graphics: "", directx: "Version 11" },
            max: { processor: "", memory: "", graphics: "", directx: "Version 11" }
          }
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

  const updateRequirement = (type: 'min' | 'max', field: string, value: string) => {
    setGameForm(prev => ({
      ...prev,
      requirement: {
        ...prev.requirement,
        [type]: {
          ...prev.requirement[type],
          [field]: value
        }
      }
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="List New Creation">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0', maxHeight: '80vh', overflowY: 'auto' }}>
          <form onSubmit={handleListGame} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <HelpCircle size={12} /> Status
                </label>
                <select 
                  className={styles.adminInput} 
                  value={gameForm.status} 
                  onChange={e => setGameForm({ ...gameForm, status: e.target.value })}
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--foreground)' }}
                >
                  <option value="released">Released</option>
                  <option value="coming-soon">Coming Soon</option>
                </select>
              </div>
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
                <ImageIcon size={12} /> Gallery Images (comma separated URLs)
              </label>
              <textarea placeholder="https://img1.jpg, https://img2.jpg..." className={styles.adminInput} rows={2} value={gameForm.images} onChange={e => setGameForm({ ...gameForm, images: e.target.value })} />
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
                  <Tag size={12} /> Genre (comma separated)
                </label>
                <input type="text" placeholder="survival, multiplayer" className={styles.adminInput} value={gameForm.genre} onChange={e => setGameForm({ ...gameForm, genre: e.target.value })} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Monitor size={12} /> OS
                </label>
                <input type="text" placeholder="windows, mac os" className={styles.adminInput} value={gameForm.os} onChange={e => setGameForm({ ...gameForm, os: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Box size={12} /> Combined Storage Needed
                </label>
                <input type="text" placeholder="e.g. 60 GB available space" className={styles.adminInput} value={gameForm.storage} onChange={e => setGameForm({ ...gameForm, storage: e.target.value })} />
              </div>
              <div 
                style={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  background: 'rgba(255,255,255,0.05)', 
                  padding: '0.8rem 1rem', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.05)',
                  transition: 'all 0.2s ease'
                }} 
                onClick={() => setGameForm({ ...gameForm, vrSupported: !gameForm.vrSupported })}
              >
                <CheckCircle checked={gameForm.vrSupported} />
                <label style={{ fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', opacity: 0.9 }}>VR Supported</label>
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
                onChange={e => setGameForm({ ...gameForm, downloadUrl: e.target.value })} 
              />
            </div>

            {/* Minimum Requirements */}
            <h4 style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', marginTop: '1rem', color: 'var(--primary)' }}>Hardware Matrix (Minimum)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.6 }}><Cpu size={10} /> Processor</label>
                <input type="text" className={styles.adminInput} value={gameForm.requirement.min.processor} onChange={e => updateRequirement('min', 'processor', e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.6 }}><MemoryStick size={10} /> Memory</label>
                <input type="text" className={styles.adminInput} value={gameForm.requirement.min.memory} onChange={e => updateRequirement('min', 'memory', e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.6 }}><Monitor size={10} /> Graphics</label>
                <input type="text" className={styles.adminInput} value={gameForm.requirement.min.graphics} onChange={e => updateRequirement('min', 'graphics', e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.6 }}>DirectX</label>
                <input type="text" className={styles.adminInput} value={gameForm.requirement.min.directx} onChange={e => updateRequirement('min', 'directx', e.target.value)} />
              </div>
            </div>

            {/* Recommended Requirements */}
            <h4 style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', marginTop: '1rem', color: 'var(--primary)' }}>Hardware Matrix (Recommended)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.6 }}><Cpu size={10} /> Processor</label>
                <input type="text" className={styles.adminInput} value={gameForm.requirement.max.processor} onChange={e => updateRequirement('max', 'processor', e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.6 }}><MemoryStick size={10} /> Memory</label>
                <input type="text" className={styles.adminInput} value={gameForm.requirement.max.memory} onChange={e => updateRequirement('max', 'memory', e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.6 }}><Monitor size={10} /> Graphics</label>
                <input type="text" className={styles.adminInput} value={gameForm.requirement.max.graphics} onChange={e => updateRequirement('max', 'graphics', e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                 <label style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.6 }}>DirectX</label>
                <input type="text" className={styles.adminInput} value={gameForm.requirement.max.directx} onChange={e => updateRequirement('max', 'directx', e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button type="button" className="btnOutline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
              <button type="submit" className="btnSolid" disabled={isSubmitting} style={{ flex: 2 }}>
                {isSubmitting ? "Lising..." : "Confirm & List Game"}
              </button>
            </div>
          </form>
      </div>
    </Modal>
  );
}
