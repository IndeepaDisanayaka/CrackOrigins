'use client';
import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './LiveCursors.module.css';
import { MousePointer2 } from 'lucide-react';
import { auth } from '../lib/firebase';

interface PresenceData {
  id: string;
  x: number;
  y: number;
  name: string;
  color: string;
  message?: string;
}

const COLORS = [
  '#feb60c', '#ff4d4d', '#4ade80', '#60a5fa', '#c084fc', '#f472b6'
];

export default function LiveCursors() {
  const [mounted, setMounted] = useState(false);
  const [isMobileOS, setIsMobileOS] = useState(false);
  const [partner, setPartner] = useState<PresenceData | null>(null);
  const [userName, setUserName] = useState('Ghost');
  const [userColor, setUserColor] = useState('#feb60c');
  const [isTyping, setIsTyping] = useState(false);
  const [typedMessage, setTypedMessage] = useState('');
  const [myPos, setMyPos] = useState({ x: 0, y: 0 });
  const [myMessage, setMyMessage] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(true);
  
  const socketRef = useRef<Socket | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const userNameRef = useRef(userName);
  const lastUpdateRef = useRef<number>(0);

  // Fix Hydration & OS-Based Detection
  useEffect(() => {
    // 100% OS-based check: Avoid using screen width (max-width) to allow desktop resizing
    const mobileOS = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (mobileOS) {
      setIsMobileOS(true);
    }
    
    setMounted(true);
    setUserColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
  }, []);

  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u?.displayName) {
        setUserName(u.displayName.split(' ')[0]);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Physically Disable for Mobile OS only
    if (!mounted || isMobileOS) return;

    const serverUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : `http://${window.location.hostname}:3001`;

    const socket = io(serverUrl, {
        reconnection: true,
        transports: ['websocket']
    });
    socketRef.current = socket;

    socket.emit('profile', { name: userNameRef.current, color: userColor });

    socket.on('waiting', () => {
      setIsWaiting(true);
      setPartner(null);
    });

    socket.on('paired', (partnerProfile: any) => {
      setIsWaiting(false);
      setPartner((prev) => ({
        ...prev,
        ...partnerProfile,
        x: prev?.x ?? 0,
        y: prev?.y ?? 0
      }));
    });

    socket.on('user-moved', (data: PresenceData) => {
      setPartner((prev) => ({
        ...prev,
        ...data,
        message: prev?.message
      }));
    });

    socket.on('user-chat', ({ message }: { message: string }) => {
      setPartner((prev) => {
        const base = prev || { id: 'unknown', x: 0, y: 0, name: 'Partner', color: '#fff' };
        return { ...base, message };
      });
      setTimeout(() => {
        setPartner((prev) => {
          if (!prev) return null;
          return { ...prev, message: undefined };
        });
      }, 5000);
    });

    socket.on('user-left', () => {
      setPartner(null);
      setIsWaiting(true);
    });

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMyPos({ x, y });

      if (now - lastUpdateRef.current > 30) {
        socket.emit('move', { x, y });
        lastUpdateRef.current = now;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      socket.disconnect();
    };
  }, [mounted, userColor, isMobileOS]);

  useEffect(() => {
    if (!mounted || isMobileOS) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        setIsTyping(true);
        setTypedMessage('');
        setTimeout(() => inputRef.current?.focus(), 10);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTyping, mounted, isMobileOS]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedMessage.trim() && socketRef.current) {
      socketRef.current.emit('chat', typedMessage.trim());
      setMyMessage(typedMessage.trim());
      setIsTyping(false);
      setTypedMessage('');
      setTimeout(() => setMyMessage(null), 5000);
    } else {
      setIsTyping(false);
    }
  };

  // 100% Disable for Mobile OS or unmounted
  if (!mounted || isMobileOS) return null;

  return (
    <div className={styles.cursorLayer}>
      <AnimatePresence>
        {/* Remote Partner Cursor */}
        {partner && (
          <motion.div
            key={partner.id}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1, 
              left: `${partner.x}%`,
              top: `${partner.y}%`,
            }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 45, stiffness: 400, mass: 0.5 }}
            className={styles.remoteCursor}
            style={{ color: partner.color }}
          >
            <MousePointer2 size={18} fill="currentColor" />
            <div className={styles.label} style={{ backgroundColor: partner.color }}>
              <AnimatePresence mode="wait">
                <motion.span
                  key={partner.message ? 'msg' : 'name'}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                >
                  {partner.message || partner.name}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className={styles.pulse} style={{ borderColor: partner.color }}></div>
          </motion.div>
        )}

        {/* My Cursor Chat Input */}
        {isTyping && (
          <motion.div 
            key="my-chat-input"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={styles.myChatContainer}
            style={{ left: `${myPos.x}%`, top: `${myPos.y}%`, color: userColor }}
          >
            <form onSubmit={handleSendMessage}>
              <input
                ref={inputRef}
                type="text"
                className={styles.chatInput}
                placeholder="Talk..."
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                onBlur={() => !typedMessage && setIsTyping(false)}
                maxLength={50}
                style={{ borderColor: userColor }}
              />
            </form>
          </motion.div>
        )}

        {/* My Own Cursor Message Display */}
        {!isTyping && myMessage && (
          <motion.div 
            key="my-cursor-bubble"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={styles.myMessageBubbleContainer}
            style={{ left: `${myPos.x}%`, top: `${myPos.y}%` }}
          >
            <div className={styles.label} style={{ backgroundColor: userColor, transform: 'translate(15px, 15px)' }}>
                {myMessage}
            </div>
          </motion.div>
        )}

        {isWaiting && (
          <motion.div 
            key="waiting-status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={styles.systemNote}
          >
            Finding a gamer...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
