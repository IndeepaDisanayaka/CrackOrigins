'use client';

import React, { useState } from 'react';
import { Gamepad2, Tag, DollarSign, Layers, Monitor, HardDrive, Plus, Image as ImageIcon, Cpu, MemoryStick, Box, Laptop, Activity, ToggleLeft as Toggle, HelpCircle, RefreshCw, ChevronDown } from 'lucide-react';
import Modal from '../Modal';
import { listGame, updateGame } from '@/lib/admin-actions';
import { useToast } from '../Toast';
import CheckCircle from '../CheckCircle';
import { useAuth } from '../../lib/contexts/AuthContext';
import styles from '../../app/page.module.css';

interface ListGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editData?: any;
}

export default function ListGameModal({ isOpen, onClose, onSuccess, editData }: ListGameModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // itch.io selector state
  const [itchGames, setItchGames] = useState<any[]>([]);
  const [itchLoading, setItchLoading] = useState(false);
  const [selectedItchId, setSelectedItchId] = useState<string>('');
  const [itchUploads, setItchUploads] = useState<any[]>([]);
  const [selectedCover, setSelectedCover] = useState<string>('');

  const [gameForm, setGameForm] = useState({
    title: "",
    description: "",
    price: "",
    genre: "",
    os: "windows",
    logo: "",
    video: "",
    downloadUrl: "",
    itchUploadId: "",
    itchGameId: "",
    images: "",
    storageValue: "",
    storageUnit: "GB",
    showVideo: true,
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

  React.useEffect(() => {
    if (isOpen && editData) {
      let storageValue = "";
      let storageUnit = "GB";
      if (editData.storage) {
        const parts = editData.storage.split(' ');
        if (parts.length >= 2) {
          storageValue = parts[0];
          storageUnit = parts[1];
        }
      }

      setGameForm({
        title: editData.title || "",
        description: editData.description || "",
        price: editData.price === 'Free' ? '0' : (typeof editData.price === 'string' ? editData.price.replace('$', '') : String(editData.price || "")),
        genre: editData.genre || "",
        os: editData.os || "windows",
        logo: editData.logo || "",
        video: editData.video || "",
        downloadUrl: editData.downloadUrl || "",
        itchUploadId: editData.itchUploadId || "",
        itchGameId: editData.itchGameId || "",
        images: Array.isArray(editData.images) ? editData.images.join(', ') : (editData.images || ""),
        storageValue,
        storageUnit,
        showVideo: editData.showVideo ?? true,
        vrSupported: editData.vrSupported ?? false,
        status: editData.status || "released",
        requirement: {
          min: {
            processor: editData.requirements?.min?.processor || "",
            memory: editData.requirements?.min?.memory || "",
            graphics: editData.requirements?.min?.graphics || "",
            directx: editData.requirements?.min?.directx || "Version 11"
          },
          max: {
            processor: editData.requirements?.max?.processor || "",
            memory: editData.requirements?.max?.memory || "",
            graphics: editData.requirements?.max?.graphics || "",
            directx: editData.requirements?.max?.directx || "Version 11"
          }
        }
      });
      setSelectedItchId(editData.itchGameId || '');
      setSelectedCover(editData.logo || '');
    } else if (isOpen && !editData) {
      // Reset form
      setGameForm({
        title: "",
        description: "",
        price: "",
        genre: "",
        os: "windows",
        logo: "",
        video: "",
        downloadUrl: "",
        itchUploadId: "",
        itchGameId: "",
        images: "",
        storageValue: "",
        storageUnit: "GB",
        showVideo: true,
        vrSupported: false,
        status: "released",
        requirement: {
          min: { processor: "", memory: "", graphics: "", directx: "Version 11" },
          max: { processor: "", memory: "", graphics: "", directx: "Version 11" }
        }
      });
      setSelectedItchId('');
      setItchUploads([]);
      setSelectedCover('');
    }
  }, [isOpen, editData]);

  const handleListGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!gameForm.title || !gameForm.description || !gameForm.price || !gameForm.itchUploadId) {
      showToast("Please fill all required fields (including itch.io Upload ID).", "error");
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
        downloadCount: editData ? editData.downloadCount : 0,
        showVideo: gameForm.showVideo,
        storage: `${gameForm.storageValue} ${gameForm.storageUnit} available space`,
        vrSupported: gameForm.vrSupported,
        requirement: {
            min: { 
              processor: gameForm.requirement.min.processor, 
              memory: gameForm.requirement.min.memory, 
              graphics: gameForm.requirement.min.graphics, 
              directx: gameForm.requirement.min.directx 
            },
            max: { 
              processor: gameForm.requirement.max.processor, 
              memory: gameForm.requirement.max.memory, 
              graphics: gameForm.requirement.max.graphics, 
              directx: gameForm.requirement.max.directx 
            }
        }
      };

      // Remove legacy/unused fields from final data
      const finalData: any = { ...formattedData };
      delete finalData.downloadUrl;
      delete finalData.storageValue;
      delete finalData.storageUnit;

      const result = editData 
        ? await updateGame(user.uid, editData.id, finalData)
        : await listGame(user.uid, finalData);
        
      if (result.success) {
        showToast(editData ? "Game updated successfully!" : "Game listed successfully!", "success");
        if (onSuccess) onSuccess();
        onClose();
      } else {
        showToast(result.error || (editData ? "Failed to update game." : "Failed to list game."), "error");
      }
    } catch {
      showToast("An unexpected error occurred.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch game list from itch.io via server proxy
  const fetchItchGames = React.useCallback(async () => {
    setItchLoading(true);
    try {
      const res = await fetch('/api/itch-games');
      const data = await res.json();
      if (data.games) {
        setItchGames(data.games);
      } else {
        showToast(data.error || 'Failed to load itch.io games.', 'error');
      }
    } catch {
      showToast('Could not connect to itch.io API.', 'error');
    } finally {
      setItchLoading(false);
    }
  }, [showToast]);

  // Load game list when modal opens
  React.useEffect(() => {
    if (isOpen && itchGames.length === 0) {
      fetchItchGames();
    }
  }, [isOpen, fetchItchGames, itchGames.length]);

  // When a game is selected from the dropdown, auto-fill the form
  const handleItchSelect = async (itchGameId: string) => {
    setSelectedItchId(itchGameId);
    if (!itchGameId) return;

    const itchGame = itchGames.find(g => String(g.id) === itchGameId);
    if (!itchGame) return;

    // Determine OS from platforms
    const platforms = itchGame.platforms ?? {};
    const osArr: string[] = [];
    if (platforms.windows) osArr.push('windows');
    if (platforms.linux) osArr.push('linux');
    if (platforms.osx) osArr.push('mac os');
    if (platforms.android) osArr.push('android');

    setSelectedCover(itchGame.cover_url || '');

    // Initial fill from the list data
    setGameForm(prev => {
      let initialImages = prev.images;
      if (Array.isArray((itchGame as any).screenshots)) {
        initialImages = (itchGame as any).screenshots.map((s: any) => s.url || s).filter(Boolean).join(', ');
      }

      return {
        ...prev,
        title: itchGame.title || prev.title,
        description: itchGame.short_text || prev.description,
        logo: itchGame.cover_url || prev.logo,
        os: osArr.length > 0 ? osArr.join(', ') : 'windows',
        itchGameId: String(itchGame.id),
        images: initialImages || prev.images,
        price: (itchGame as any).min_price ? String((itchGame as any).min_price / 100) : prev.price,
        genre: itchGame.classification && itchGame.classification !== 'game' ? itchGame.classification : prev.genre,
      };
    });

    // Fetch uploads and full details for more precise data
    try {
      const res = await fetch(`/api/itch-games?gameId=${itchGameId}`);
      const data = await res.json();
      
      console.log('Itch Game Data:', data); // Log for debugging

      const uploads: any[] = data.uploads ?? [];
      setItchUploads(uploads);

      if (uploads.length > 0) {
        setGameForm(prev => ({
          ...prev,
          itchUploadId: String(uploads[0].id),
        }));
      }

      const gameDetail = data.game;
      if (gameDetail) {
        let cleanDesc = gameDetail.description || gameDetail.short_text || '';
        cleanDesc = cleanDesc.replace(/<[^>]*>?/gm, '');

        setGameForm(prev => {
          // Find screenshots in gameDetail or itchGame
          const rawScreenshots = gameDetail.screenshots || (itchGame as any).screenshots;
          let galleryImages = prev.images;
          
          if (Array.isArray(rawScreenshots)) {
            const urls = rawScreenshots.map((s: any) => s.url || s).filter(Boolean);
            if (urls.length > 0) {
              galleryImages = urls.join(', ');
            }
          }

          // Try to get video if missing
          let videoId = prev.video;
          if (!videoId && gameDetail.video_url) {
            // Extract YT ID from URL
            const ytMatch = gameDetail.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:v\/|u\/\w\/|embed\/|watch\?v=))([^#&?]*)/);
            if (ytMatch && ytMatch[1]) videoId = ytMatch[1];
          }

          return {
            ...prev,
            title: gameDetail.title || prev.title,
            description: cleanDesc || prev.description,
            logo: gameDetail.cover_url || prev.logo,
            images: galleryImages,
            video: videoId,
          };
        });
      }
    } catch (err) {
      console.error('Error fetching itch details:', err);
      showToast('Could not fetch upload details from itch.io.', 'error');
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
    <Modal isOpen={isOpen} onClose={onClose} title={editData ? "Edit Creation" : "List New Creation"}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0', maxHeight: '80vh', overflowY: 'auto' }}>
          <form onSubmit={handleListGame} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* ── itch.io Game Selector ── */}
            <div style={{
              background: 'rgba(var(--primary-rgb), 0.04)',
              border: '1px solid rgba(var(--primary-rgb), 0.2)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              borderRadius: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)' }}>
                  Auto-fill from itch.io
                </span>
                <button
                  type="button"
                  onClick={fetchItchGames}
                  disabled={itchLoading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: 'transparent', border: 'none',
                    fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
                    cursor: 'pointer', opacity: itchLoading ? 0.5 : 1,
                  }}
                >
                  <RefreshCw size={11} style={{ animation: itchLoading ? 'spin 1s linear infinite' : 'none' }} />
                  {itchLoading ? 'Loading…' : 'Refresh'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                {/* Cover preview */}
                {selectedCover && (
                  <div style={{ width: 80, height: 80, flexShrink: 0, position: 'relative', overflow: 'hidden', border: '1px solid rgba(var(--foreground-rgb),0.1)', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                    <img src={selectedCover} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* Game select */}
                  <div style={{ position: 'relative' }}>
                    <select
                      className={styles.adminInput}
                      value={selectedItchId}
                      onChange={e => handleItchSelect(e.target.value)}
                      disabled={itchLoading}
                      style={{ 
                        background: 'rgba(var(--foreground-rgb), 0.05)', 
                        color: 'var(--foreground)', 
                        width: '100%', 
                        paddingRight: '2rem',
                        border: '1px solid rgba(var(--primary-rgb), 0.3)',
                        fontWeight: 600
                      }}
                    >
                      <option value="">{itchLoading ? 'Fetching games…' : itchGames.length === 0 ? 'No games found' : '— Select a game —'}</option>
                      {itchGames.map(g => (
                        <option key={g.id} value={String(g.id)}>
                          {g.title} (ID: {g.id})
                        </option>
                      ))}
                    </select>
                    <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }}>
                      <ChevronDown size={14} />
                    </div>
                  </div>

                  {/* Upload select (shown after a game is picked) */}
                  {itchUploads.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.68rem', fontWeight: 900, opacity: 0.8, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Select Primary Upload (Download ID)
                      </label>
                      <div style={{ position: 'relative' }}>
                        <select
                          className={styles.adminInput}
                          value={gameForm.itchUploadId}
                          onChange={e => setGameForm(prev => ({ ...prev, itchUploadId: e.target.value }))}
                          style={{ background: 'rgba(var(--foreground-rgb), 0.05)', color: 'var(--foreground)', width: '100%', paddingRight: '2rem' }}
                        >
                          {itchUploads.map(u => (
                            <option key={u.id} value={String(u.id)}>
                              {u.display_name || u.filename || `Upload #${u.id}`} (ID: {u.id})
                            </option>
                          ))}
                        </select>
                        <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }}>
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

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
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="number" placeholder="60" className={styles.adminInput} value={gameForm.storageValue} onChange={e => setGameForm({ ...gameForm, storageValue: e.target.value })} style={{ flex: 2 }} />
                  <select className={styles.adminInput} value={gameForm.storageUnit} onChange={e => setGameForm({ ...gameForm, storageUnit: e.target.value })} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--foreground)' }}>
                    <option value="MB">MB</option>
                    <option value="GB">GB</option>
                    <option value="TB">TB</option>
                  </select>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    background: 'rgba(255,255,255,0.05)', 
                    padding: '0.8rem 1rem', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.2s ease',
                    flex: 1
                  }} 
                  onClick={() => setGameForm({ ...gameForm, vrSupported: !gameForm.vrSupported })}
                >
                  <CheckCircle checked={gameForm.vrSupported} />
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', opacity: 0.9 }}>VR Supported</label>
                </div>
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    background: 'rgba(255,255,255,0.05)', 
                    padding: '0.8rem 1rem', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.2s ease',
                    flex: 1
                  }} 
                  onClick={() => setGameForm({ ...gameForm, showVideo: !gameForm.showVideo })}
                >
                  <CheckCircle checked={gameForm.showVideo} />
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', opacity: 0.9 }}>Show Video Header</label>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <HardDrive size={12} /> itch.io Upload ID <span style={{ color: 'var(--primary)', marginLeft: '0.25rem' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 16013605"
                  className={styles.adminInput}
                  value={gameForm.itchUploadId}
                  onChange={e => setGameForm({ ...gameForm, itchUploadId: e.target.value })}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Box size={12} /> itch.io Game ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123456"
                  className={styles.adminInput}
                  value={gameForm.itchGameId}
                  onChange={e => setGameForm({ ...gameForm, itchGameId: e.target.value })}
                />
              </div>
            </div>

            <span style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '-0.5rem' }}>
              The Upload ID is used for secure server-side downloads. No Google Drive link required.
            </span>

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
                {isSubmitting ? "Saving..." : (editData ? "Save Changes" : "Confirm & List Game")}
              </button>
            </div>
          </form>
      </div>
    </Modal>
  );
}
