'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, User, ChevronDown, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/contexts/AuthContext';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, push, set, serverTimestamp, update } from 'firebase/database';

interface HelpChatProps {
  externalOpen?: boolean;
  setExternalOpen?: (open: boolean) => void;
  customToggle?: React.ReactNode;
}

export default function HelpChat({ externalOpen, setExternalOpen, customToggle }: HelpChatProps) {
  const { user } = useAuth();
  const [localOpen, setLocalOpen] = useState(false);

  const isOpen = externalOpen !== undefined ? externalOpen : localOpen;
  const setIsOpen = setExternalOpen !== undefined ? setExternalOpen : setLocalOpen;

  const [message, setMessage] = useState('');
  const [chatData, setChatData] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !user) return;

    // Listen to chat metadata
    const chatRef = ref(rtdb, `support_chats/${user.uid}`);
    const unsubscribeChat = onValue(chatRef, (snap) => {
      setChatData(snap.val());
    }, (error) => {
      if (!error.message.includes('permission_denied')) {
        console.warn("RTDB Metadata Access Restricted:", error);
      }
    });

    // Listen to messages
    const msgsRef = ref(rtdb, `support_messages/${user.uid}`);
    const unsubscribeMsgs = onValue(msgsRef, (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id, ...val
        })).sort((a, b) => a.timestamp - b.timestamp);

        const now = Date.now();
        const filtered = list.filter(m => now - m.timestamp < 86400000);
        setMessages(filtered);
      } else {
        setMessages([]);
      }
    }, (error) => {
      if (!error.message.includes('permission_denied')) {
        console.warn("RTDB Message Access Restricted:", error);
      }
    });

    return () => {
      unsubscribeChat();
      unsubscribeMsgs();
    };
  }, [mounted, user, isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    const msgText = message.trim();
    setMessage('');

    const chatPath = `support_chats/${user.uid}`;
    const msgsPath = `support_messages/${user.uid}`;

    // Update or create chat metadata
    await update(ref(rtdb, chatPath), {
      id: user.uid,
      name: user.displayName || 'Guest',
      lastMessage: msgText,
      updatedAt: serverTimestamp(),
      status: chatData?.status || 'open',
      createdAt: chatData?.createdAt || serverTimestamp(),
    });

    // Push message
    const newMsgRef = push(ref(rtdb, msgsPath));
    await set(newMsgRef, {
      text: msgText,
      senderId: user.uid,
      senderName: user.displayName || 'Guest',
      timestamp: Date.now(),
    });
  };

  if (!mounted) return null;

  return (
    <div style={{ position: externalOpen === undefined ? 'fixed' : 'relative', bottom: externalOpen === undefined ? '2rem' : 'auto', right: externalOpen === undefined ? '2rem' : 'auto', zIndex: 9999999 }}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 1rem)',
              right: 0,
              width: '380px',
              height: '550px',
              backgroundColor: 'var(--background)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid var(--outline-color)',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'none',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              background: 'linear-gradient(90deg, var(--primary), #ffd700)',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 900,
              fontSize: '1rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={18} />
                <span>Operator Support</span>
              </div>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            {/* Chat Area */}
            <div
              ref={scrollRef}
              style={{
                flex: 1,
                padding: '1rem',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                backgroundColor: 'transparent',
              }}
            >
              <div style={{ textAlign: 'center', opacity: 0.4, fontSize: '0.7rem', marginBottom: '1rem' }}>
                Transmissions are stored for 24 hours.
              </div>

              {messages.length === 0 && (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.5,
                  textAlign: 'center',
                  padding: '1rem'
                }}>
                  <Clock size={32} style={{ marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '0.8rem' }}>Establish a new uplink. Type your message below.</p>
                </div>
              )}

              {messages.map((m) => {
                const isMe = m.senderId === user?.uid;
                return (
                  <div key={m.id} style={{
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{
                      padding: '0.75rem 1rem',
                      borderRadius: !isMe ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                      backgroundColor: !isMe ? 'var(--primary)' : 'transparent',
                      color: !isMe ? '#000' : 'var(--foreground)',
                      border: !isMe ? 'none' : '1px solid var(--outline-color)',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      wordBreak: 'break-word',
                      boxShadow: 'none'
                    }}>
                      {m.text}
                    </div>
                    <span style={{ fontSize: '0.6rem', opacity: 0.5, marginTop: '2px' }}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} style={{
              padding: '1rem',
              borderTop: '1px solid var(--outline-color)',
              display: 'flex',
              gap: '0.5rem',
            }}>
              <input
                type="text"
                placeholder="Type your transmission..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--outline-color)',
                  borderRadius: '8px',
                  padding: '0.6rem 0.8rem',
                  color: 'var(--foreground)',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!message.trim()}
                style={{
                  background: 'var(--primary)',
                  border: 'none',
                  borderRadius: '8px',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  opacity: message.trim() ? 1 : 0.5,
                }}
              >
                <Send size={18} color="#000" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      {!customToggle ? (
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: 'var(--primary)',
            color: '#000',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: 'none',
          }}
        >
          {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </motion.button>
      ) : customToggle}
    </div>
  );
}
