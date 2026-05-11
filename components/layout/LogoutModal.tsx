'use client';

import React, { useState } from 'react';
import { LogOut, Trash2, Database, AlertTriangle } from 'lucide-react';
import Modal from '../Modal';
import CheckCircle from '../CheckCircle';

interface LogoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (options: { clearLocalStorage: boolean; clearSessionStorage: boolean }) => void;
}

export default function LogoutModal({ isOpen, onClose, onConfirm }: LogoutModalProps) {
    const [clearLocal, setClearLocal] = useState(true);
    const [clearSession, setClearSession] = useState(true);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Security Logout">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem 0' }}>
                <div style={{ 
                    background: 'rgba(255, 107, 107, 0.1)', 
                    border: '1px solid rgba(255, 107, 107, 0.2)', 
                    padding: '1rem', 
                    borderRadius: '8px',
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center'
                }}>
                    <AlertTriangle color="#ff6b6b" size={24} />
                    <p style={{ fontSize: '0.85rem', opacity: 0.9, lineHeight: '1.4' }}>
                        You are about to end your session. For maximum security on shared devices, consider clearing your local trace.
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6 }}>
                        Cleanup Options
                    </label>

                    {/* Local Storage Checkbox (Using ListNewGame Style) */}
                    <div 
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '1rem', 
                            background: 'rgba(var(--foreground-rgb), 0.05)', 
                            padding: '1rem', 
                            borderRadius: '8px', 
                            cursor: 'pointer',
                            border: `1px solid ${clearLocal ? 'rgba(var(--primary-rgb), 0.3)' : 'rgba(var(--foreground-rgb), 0.05)'}`,
                            transition: 'all 0.2s ease',
                        }} 
                        onClick={() => setClearLocal(!clearLocal)}
                    >
                        <CheckCircle checked={clearLocal} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Database size={14} /> Clear Local Cache
                            </span>
                            <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>Removes persistent login artifacts and saved preferences.</span>
                        </div>
                    </div>

                    {/* Session Storage Checkbox */}
                    <div 
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '1rem', 
                            background: 'rgba(var(--foreground-rgb), 0.05)', 
                            padding: '1rem', 
                            borderRadius: '8px', 
                            cursor: 'pointer',
                            border: `1px solid ${clearSession ? 'rgba(var(--primary-rgb), 0.3)' : 'rgba(var(--foreground-rgb), 0.05)'}`,
                            transition: 'all 0.2s ease',
                        }} 
                        onClick={() => setClearSession(!clearSession)}
                    >
                        <CheckCircle checked={clearSession} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Trash2 size={14} /> Wipe Session Data
                            </span>
                            <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>Clears temporary page state and active tab memory.</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button className="btnOutline" onClick={onClose} style={{ flex: 1 }}>Stay Connected</button>
                    <button 
                        className="btnSolid" 
                        onClick={() => onConfirm({ clearLocalStorage: clearLocal, clearSessionStorage: clearSession })}
                        style={{ flex: 1.5, gap: '0.6rem' }}
                    >
                        <LogOut size={16} /> Confirm Logout
                    </button>
                </div>
            </div>
        </Modal>
    );
}
