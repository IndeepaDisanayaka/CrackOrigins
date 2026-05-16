'use client';

import React from 'react';
import { 
  X, Music, Volume2, VolumeX, Play, Pause, SkipForward, SkipBack, ExternalLink, Trash, Info
} from 'lucide-react';
import styles from './idea-chat-sidebar.module.css';
import { motion, AnimatePresence } from 'framer-motion';

interface IdeaSoundtrackSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: string[];
  currentIndex: number;
  isPlaying: boolean;
  isMobile?: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSelectTrack: (index: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
}

export default function IdeaSoundtrackSidebar({
  isOpen,
  onClose,
  tracks,
  currentIndex,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  onSelectTrack,
  volume,
  onVolumeChange,
  isMobile = false
}: IdeaSoundtrackSidebarProps) {
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className={styles.container}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          style={{ width: isMobile ? '100%' : '25%', zIndex: 10002 }} // Ensure it's above other things
        >
          <div className={styles.header}>
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={24} />
            </button>
            <div className={styles.badge}>
              <Music size={14} /> Intelligence Audio
            </div>
            <div className={styles.headerTitle}>
              <h3>Sound <span>Center</span></h3>
            </div>
          </div>

          <div className={styles.chatArea} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Legal Warning at top */}
            <div style={{ padding: '1rem', background: 'rgba(255, 100, 100, 0.05)', border: '1px solid rgba(255, 100, 100, 0.1)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#ff6666' }}>
                    <Info size={14} /> <span style={{ fontSize: '0.65rem', fontWeight: 900 }}>DISCLOSURE</span>
                </div>
                <p style={{ fontSize: '0.7rem', color: '#ff6666', lineHeight: 1.4, margin: 0, opacity: 0.8 }}>
                    None of these sounds belong to Crack Origins; they are obtained from third-party platforms.
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.5, letterSpacing: '1px', textTransform: 'uppercase' }}>Current Playlist ({tracks.length})</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {tracks.map((url, i) => {
                  const active = i === currentIndex;
                  return (
                    <div 
                      key={i} 
                      onClick={() => onSelectTrack(i)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '15px', 
                        padding: '15px', 
                        background: active ? 'rgba(var(--primary-rgb), 0.08)' : 'rgba(255,255,255,0.02)',
                        border: `1.5px solid ${active ? 'var(--primary)' : 'var(--outline-color)'}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {active && isPlaying && (
                          <div style={{ position: 'absolute', bottom: 0, left: 0, height: '2px', background: 'var(--primary)', width: '100%', animation: 'dna-flow 2s infinite linear' }} />
                      )}
                      
                      <div style={{ 
                        width: '36px', 
                        height: '36px', 
                        background: active ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: active ? '#000' : 'inherit',
                        flexShrink: 0
                      }}>
                        {active && isPlaying ? <Volume2 size={18} className="animate-pulse" /> : <Music size={18} style={{ opacity: active ? 1 : 0.3 }} />}
                      </div>
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 900, color: active ? 'var(--primary)' : 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Intelligence Track {String(i + 1).padStart(2, '0')}
                        </div>
                        <div style={{ fontSize: '0.6rem', opacity: 0.4, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          YouTube Platform
                        </div>
                      </div>
                      
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                          padding: '8px', 
                          color: active ? 'var(--primary)' : 'var(--foreground)', 
                          opacity: 0.5,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={styles.inputArea} style={{ padding: '2rem 1.5rem' }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Visualizer placeholder / Pulse */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', height: '30px' }}>
                    {[...Array(12)].map((_, i) => (
                        <div 
                            key={i} 
                            style={{ 
                                width: '2px', 
                                height: '100%', 
                                background: 'var(--primary)', 
                                opacity: isPlaying ? 0.8 : 0.2,
                                transformOrigin: 'bottom',
                                animation: isPlaying ? `musicWave ${0.5 + Math.random() * 0.5}s infinite ease-in-out ${i * 0.05}s` : 'none'
                            }} 
                        />
                    ))}
                </div>

                {/* Main Controls */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem' }}>
                    <button onClick={onPrev} style={{ background: 'none', border: '1px solid var(--outline-color)', color: 'var(--foreground)', padding: '10px', borderRadius: '4px', cursor: 'pointer' }}><SkipBack size={20} /></button>
                    <button 
                        onClick={onPlayPause} 
                        style={{ 
                            width: '60px', 
                            height: '60px', 
                            background: 'var(--primary)', 
                            border: 'none',
                            color: '#000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        {isPlaying ? <Pause size={28} fill="#000" /> : <Play size={28} fill="#000" style={{ marginLeft: '4px' }} />}
                    </button>
                    <button onClick={onNext} style={{ background: 'none', border: '1px solid var(--outline-color)', color: 'var(--foreground)', padding: '10px', borderRadius: '4px', cursor: 'pointer' }}><SkipForward size={20} /></button>
                </div>

                {/* Volume Slider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '0 0.5rem' }}>
                    {volume === 0 ? <VolumeX size={18} opacity={0.5} /> : <Volume2 size={18} color="var(--primary)" />}
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={volume} 
                        onChange={(e) => onVolumeChange(parseInt(e.target.value))}
                        style={{ 
                            flex: 1, 
                            height: '2px', 
                            background: `linear-gradient(to right, var(--primary) ${volume}%, var(--outline-color) ${volume}%)`,
                            appearance: 'none',
                            outline: 'none',
                            cursor: 'pointer'
                        }} 
                    />
                    <span style={{ fontSize: '0.7rem', fontWeight: 900, minWidth: '35px', color: 'var(--primary)' }}>{String(volume).padStart(3, '0')}%</span>
                </div>
             </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
