'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getSupportChats, getSupportMessages, sendSupportMessage, assignChat, getUserSupportData } from '@/lib/admin-actions';
import { MessageSquare, Send, User, Clock, Search, Shield, ChevronLeft, AlertCircle, ShoppingCart, Globe, Calendar } from 'lucide-react';
import { useToast } from '../Toast';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminSupportProps {
    adminUid: string;
    adminName: string;
}

export default function AdminSupport({ adminUid, adminName }: AdminSupportProps) {
    const { showToast } = useToast();
    const [allChats, setAllChats] = useState<any[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [reply, setReply] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedUserData, setSelectedUserData] = useState<any>(null);
    const [userDataLoading, setUserDataLoading] = useState(false);
    const [activeView, setActiveView] = useState<'chat' | 'data'>('chat');

    const fetchAllChats = async () => {
        const res = await getSupportChats(adminUid);
        if (res.success && res.chats) {
            setAllChats(res.chats);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAllChats();
        const interval = setInterval(fetchAllChats, 10000); // Poll chats every 10s
        return () => clearInterval(interval);
    }, []);

    const fetchMessages = async () => {
        if (!selectedChatId) return;
        const res = await getSupportMessages(selectedChatId);
        if (res.success && res.messages) {
            setMessages(res.messages);
        }
    };

    useEffect(() => {
        setSelectedUserData(null);
        setMessages([]);
        setActiveView('chat');

        const fetchUserData = async () => {
            if (!selectedChatId) return;
            setUserDataLoading(true);
            const res = await getUserSupportData(adminUid, selectedChatId);
            if (res.success) {
                setSelectedUserData(res);
            }
            setUserDataLoading(false);
        };
        fetchUserData();
        fetchMessages();

        const interval = setInterval(fetchMessages, 5000); // Poll messages every 5s
        return () => clearInterval(interval);
    }, [selectedChatId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reply.trim() || !selectedChatId) return;

        const replyText = reply.trim();
        setReply('');

        const chatData = allChats.find(c => c.id === selectedChatId);

        // Assignment logic: If chat has no owner, assign this admin
        if (!chatData?.ownerId) {
            await assignChat(adminUid, adminName, selectedChatId);
            showToast("You have been assigned to this mission.", "success");
        }

        // Push reply
        await sendSupportMessage(selectedChatId, {
            text: replyText,
            senderId: adminUid,
            senderName: adminName,
        });

        // Optimistic update
        setMessages(prev => [...prev, {
            id: 'temp-' + Date.now(),
            text: replyText,
            senderId: adminUid,
            senderName: adminName,
            timestamp: Date.now(),
        }]);
    };

    // Filter chats based on privacy rules:
    // 1. Unassigned chats are visible to everyone.
    // 2. Assigned chats are only visible to the assigned owner.
    const filteredChats = allChats.filter(chat => {
        const matchesSearch = chat.name.toLowerCase().includes(search.toLowerCase()) ||
            chat.lastMessage.toLowerCase().includes(search.toLowerCase());

        const isUnassigned = !chat.ownerId;
        const isMine = chat.ownerId === adminUid;

        return matchesSearch && (isUnassigned || isMine);
    });

    const selectedChat = allChats.find(c => c.id === selectedChatId);

    return (
        <div style={{ display: 'flex', height: '100%', gap: '1.5rem' }}>
            {/* Sidebar - Chat List */}
            <div style={{
                width: '320px',
                borderRight: '1px solid var(--outline-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                backgroundColor: 'transparent',
            }}>
                <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <input
                        type="text"
                        placeholder="Search uplinks..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.85rem 1rem 0.85rem 2.8rem',
                            background: 'transparent',
                            border: '1px solid var(--outline-color)',
                            borderRadius: '12px',
                            color: 'var(--foreground)',
                            outline: 'none',
                            fontSize: '0.9rem'
                        }}
                    />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <div className="spinner" style={{ width: '24px', height: '24px', border: '2px solid rgba(var(--primary-rgb), 0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }}></div>
                            <p style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.5rem' }}>Synchronizing Archives Index...</p>
                        </div>
                    ) : (
                        filteredChats.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.4, fontSize: '0.8rem' }}>
                                <AlertCircle size={40} style={{ marginBottom: '1.5rem', opacity: 0.2 }} />
                                <div style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>No Active Uplinks</div>
                                <p style={{ marginTop: '0.5rem', fontSize: '0.7rem' }}>Waiting for incoming operative transmissions...</p>
                            </div>
                        ) : (
                            filteredChats.map(chat => (
                                <button
                                    key={chat.id}
                                    onClick={() => setSelectedChatId(chat.id)}
                                    className="adminChatBtn"
                                    style={{
                                        textAlign: 'left',
                                        border: '1px solid',
                                        borderColor: selectedChatId === chat.id ? 'var(--primary)' : 'var(--outline-color)',
                                        background: selectedChatId === chat.id ? 'var(--primary)' : 'transparent',
                                        padding: '1.25rem',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: selectedChatId === chat.id ? '#000' : 'var(--foreground)' }}>{chat.name}</span>
                                        <span style={{ fontSize: '0.6rem', opacity: 0.5, color: selectedChatId === chat.id ? '#000' : 'var(--foreground)' }}>{new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: selectedChatId === chat.id ? 'rgba(0,0,0,0.7)' : 'inherit' }}>
                                        {chat.lastMessage}
                                    </div>
                                    {!chat.ownerId && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            right: 0,
                                            background: '#ff4d4d',
                                            color: '#fff',
                                            fontSize: '0.5rem',
                                            padding: '2px 6px',
                                            fontWeight: 900,
                                            textTransform: 'uppercase'
                                        }}>
                                            UNASSIGNED
                                        </div>
                                    )}
                                </button>
                            ))
                        ))}
                </div>
            </div>

            {/* Main Content - Selected Chat */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'transparent',
                borderRadius: '16px',
                border: '1px solid var(--outline-color)',
                overflow: 'hidden'
            }}>
                {selectedChatId && selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--outline-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '40px', height: '40px', background: 'var(--primary)', color: '#000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <User size={20} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '0.9rem' }}>{selectedChat.name}</div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Clock size={10} /> 24-hour lifetime active
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '8px', border: '1px solid var(--outline-color)' }}>
                                    {(['chat', 'data'] as const).map(v => (
                                        <button
                                            key={v}
                                            onClick={() => setActiveView(v)}
                                            style={{
                                                padding: '0.4rem 1rem',
                                                border: 'none',
                                                background: activeView === v ? 'var(--primary)' : 'transparent',
                                                color: activeView === v ? '#000' : 'var(--foreground)',
                                                borderRadius: '6px',
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {v === 'chat' ? 'View Chat' : 'User Data'}
                                        </button>
                                    ))}
                                </div>
                                {selectedChat.ownerId && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', borderRadius: '4px', fontSize: '0.7rem', border: '1px solid rgba(74, 222, 128, 0.2)' }}>
                                        <Shield size={12} /> Assigned to {selectedChat.ownerId === adminUid ? "You" : selectedChat.ownerName}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                            {activeView === 'chat' ? (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div
                                        ref={scrollRef}
                                        style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}
                                    >
                                        {messages.map((m, idx) => {
                                            const isMe = m.senderId === adminUid;
                                            return (
                                                <div key={m.id || idx} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                                    <div style={{ fontSize: '0.65rem', opacity: 0.5, marginBottom: '0.25rem', padding: '0 0.5rem' }}>
                                                        {m.senderName}
                                                    </div>
                                                    <div style={{
                                                        padding: '0.75rem 1.25rem',
                                                        borderRadius: !isMe ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                                                        backgroundColor: !isMe ? 'var(--primary)' : 'transparent',
                                                        color: !isMe ? '#000' : 'var(--foreground)',
                                                        border: !isMe ? 'none' : '1px solid var(--outline-color)',
                                                        fontSize: '0.9rem',
                                                        fontWeight: 500,
                                                        boxShadow: 'none'
                                                    }}>
                                                        {m.text}
                                                    </div>
                                                    <span style={{ fontSize: '0.6rem', opacity: 0.4, marginTop: '4px' }}>
                                                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Reply Area */}
                                    <form onSubmit={handleSendReply} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--outline-color)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <input
                                            type="text"
                                            placeholder={!selectedChat.ownerId ? "Claim channel & send response..." : "Transmit data..."}
                                            value={reply}
                                            onChange={(e) => setReply(e.target.value)}
                                            style={{
                                                flex: 1,
                                                padding: '0.85rem 1.25rem',
                                                background: 'transparent',
                                                border: '1px solid var(--outline-color)',
                                                borderRadius: '12px',
                                                color: 'var(--foreground)',
                                                outline: 'none',
                                                fontSize: '0.9rem'
                                            }}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!reply.trim()}
                                            style={{
                                                width: '45px',
                                                height: '45px',
                                                borderRadius: '50%',
                                                background: 'var(--primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: 'none',
                                                cursor: 'pointer',
                                                flexShrink: 0
                                            }}
                                        >
                                            <Send size={20} color="#000" />
                                        </button>
                                    </form>
                                </div>
                            ) : (
                                <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                                    <AnimatePresence mode="wait">
                                        {userDataLoading ? (
                                            <motion.div
                                                key="loading"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                style={{ textAlign: 'center', padding: '4rem' }}
                                            >
                                                <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(var(--primary-rgb), 0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }}></div>
                                                <p style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.5 }}>Retrieving Operative Archives...</p>
                                            </motion.div>
                                        ) : selectedUserData ? (
                                            <motion.div
                                                key="data"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                style={{ maxWidth: '800px', margin: '0 auto' }}
                                            >
                                                <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
                                                    {/* Profile Info */}
                                                    <div style={{ flex: '1 1 300px' }}>
                                                        <h4 style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.1em', marginBottom: '1.5rem' }}>Operative Profile</h4>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                                                            {selectedUserData.profile.photoURL ? (
                                                                <img src={selectedUserData.profile.photoURL} alt="" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--primary)' }} />
                                                            ) : (
                                                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                                                                    <User size={40} />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div style={{ fontWeight: 900, fontSize: '1.2rem' }}>{selectedUserData.profile.name}</div>
                                                                <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>{selectedUserData.profile.email}</div>
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                                                            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--outline-color)', borderRadius: '12px' }}>
                                                                <div style={{ fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', fontWeight: 800 }}>Location</div>
                                                                <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.2rem' }}>{selectedUserData.profile.country}</div>
                                                            </div>
                                                            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--outline-color)', borderRadius: '12px' }}>
                                                                <div style={{ fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', fontWeight: 800 }}>Member Since</div>
                                                                <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.2rem' }}>{selectedUserData.profile.joined ? new Date(selectedUserData.profile.joined).toLocaleDateString() : 'N/A'}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Mission History */}
                                                    <div style={{ flex: '1 1 300px' }}>
                                                        <h4 style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.1em', marginBottom: '1.5rem' }}>Mission Archive</h4>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                            {selectedUserData.payments.length === 0 ? (
                                                                <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dotted var(--outline-color)' }}>
                                                                    <p style={{ fontSize: '0.8rem', opacity: 0.4 }}>No prior acquisitions detected.</p>
                                                                </div>
                                                            ) : (
                                                                selectedUserData.payments.map((p: any) => (
                                                                    <div key={p.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--outline-color)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <div>
                                                                            <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{p.game}</div>
                                                                            <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{new Date(p.purchaseDate).toLocaleDateString()}</div>
                                                                        </div>
                                                                        <div style={{ fontWeight: 900, fontSize: '0.9rem', color: 'var(--primary)' }}>${p.amount}</div>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ) : (
                                            <div style={{ textAlign: 'center', opacity: 0.3, padding: '4rem' }}>
                                                <AlertCircle size={48} style={{ marginBottom: '1rem' }} />
                                                <p>Information extraction failed.</p>
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3, textAlign: 'center', padding: '3rem' }}>
                        <MessageSquare size={64} style={{ marginBottom: '1.5rem' }} />
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase' }}>Command Center</h3>
                        <p style={{ maxWidth: '400px' }}>Select an active uplink from the archive to begin communication with the operative.</p>
                    </div>
                )}
            </div>

        </div>
    );
}
