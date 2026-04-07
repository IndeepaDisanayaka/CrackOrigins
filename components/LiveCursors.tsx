'use client';
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './LiveCursors.module.css';
import { MousePointer2 } from 'lucide-react';
import { auth, rtdb } from '../lib/firebase';
import { ref, onValue, set, onDisconnect, push, remove, update } from 'firebase/database';

interface PresenceData {
  id: string;
  x: number;
  y: number;
  name: string;
  color: string;
  message?: string;
  partnerId?: string;
  lastActive: number;
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
  
  const myIdRef = useRef<string | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const partnerIdRef = useRef<string | null>(null);
  const partnerWatchUnsubRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const userNameRef = useRef(userName);

  useEffect(() => {
    const mobileOS = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobileOS(mobileOS);
    setMounted(true);
    setUserColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
  }, []);

  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u?.displayName) setUserName(u.displayName.split(' ')[0]);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!mounted || isMobileOS) return;

    const presenceRef = ref(rtdb, 'presence');
    const myPresenceRef = push(presenceRef);
    const myId = myPresenceRef.key as string;
    myIdRef.current = myId;

    const myData = {
        id: myId,
        x: 0,
        y: 0,
        name: userNameRef.current,
        color: userColor,
        lastActive: Date.now(),
        partnerId: ''
    };

    set(myPresenceRef, myData);
    onDisconnect(myPresenceRef).remove();

    const discoveryUnsub = onValue(presenceRef, (snapshot) => {
        const allUsers = snapshot.val() || {};
        const entries = Object.entries(allUsers) as [string, PresenceData][];
        const me = allUsers[myId];

        if (me?.partnerId && me.partnerId !== partnerIdRef.current) {
            setupPartnerWatch(me.partnerId);
        } else if (!me?.partnerId) {
            const potentialPartner = entries.find(([id, data]) => 
                id !== myId && !data.partnerId && (Date.now() - data.lastActive < 8000)
            );
            if (potentialPartner) {
                const [pid] = potentialPartner;
                update(ref(rtdb, `presence/${myId}`), { partnerId: pid });
                update(ref(rtdb, `presence/${pid}`), { partnerId: myId });
                setupPartnerWatch(pid);
            } else {
                cleanupPartnerWatch();
            }
        }
    });

    const setupPartnerWatch = (pid: string) => {
        if (partnerIdRef.current === pid) return;
        cleanupPartnerWatch();
        partnerIdRef.current = pid;
        const pRef = ref(rtdb, `presence/${pid}`);
        
        partnerWatchUnsubRef.current = onValue(pRef, (snap) => {
            const data = snap.val();
            if (data) {
                setPartner((prev) => ({ ...prev, ...data }));
            } else {
                update(ref(rtdb, `presence/${myId}`), { partnerId: '' });
                cleanupPartnerWatch();
            }
        });
    };

    const cleanupPartnerWatch = () => {
        if (partnerWatchUnsubRef.current) {
            partnerWatchUnsubRef.current();
            partnerWatchUnsubRef.current = null;
        }
        partnerIdRef.current = null;
        setPartner(null);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      const x = parseFloat(((e.clientX / window.innerWidth) * 100).toFixed(2));
      const y = parseFloat(((e.clientY / window.innerHeight) * 100).toFixed(2));
      setMyPos({ x, y });

      if (now - lastUpdateRef.current > 35) {
        update(ref(rtdb, `presence/${myId}`), { x, y, lastActive: now });
        lastUpdateRef.current = now;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      discoveryUnsub();
      cleanupPartnerWatch();
      remove(myPresenceRef);
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
      } else if (e.key === 'Escape' && isTyping) {
        setIsTyping(false);
        setTypedMessage('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTyping, mounted, isMobileOS]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedMessage.trim() && myIdRef.current) {
        const msg = typedMessage.trim().substring(0, 50);
        update(ref(rtdb, `presence/${myIdRef.current}`), { message: msg });
        setMyMessage(msg);
        setIsTyping(false);
        setTypedMessage('');
        setTimeout(() => {
            if (myIdRef.current) update(ref(rtdb, `presence/${myIdRef.current}`), { message: null });
            setMyMessage(null);
        }, 5000);
    } else {
        setIsTyping(false);
    }
  };

  if (!mounted || isMobileOS) return null;

  return (
    <div className={styles.cursorLayer}>
      <AnimatePresence>
        {partner && (
          <motion.div
            key={partner.id}
            className={styles.remoteCursor}
            style={{ color: partner.color }}
            animate={{ 
              left: `${partner.x}%`,
              top: `${partner.y}%`,
            }}
            transition={{ 
                type: 'spring', 
                stiffness: 900, 
                damping: 50, 
                mass: 0.1 
            }}
          >
            <MousePointer2 size={18} fill="currentColor" />
            <div className={styles.label} style={{ backgroundColor: partner.color }}>
              <AnimatePresence mode="wait">
                <motion.span
                  key={partner.message ? 'msg' : 'name'}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.12 }}
                >
                  {partner.message || partner.name}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className={styles.pulse} style={{ borderColor: partner.color }}></div>
          </motion.div>
        )}

        {isTyping && (
          <motion.div 
            key="my-chat-input"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={styles.myChatContainer}
            style={{ left: `${myPos.x}%`, top: `${myPos.y}%`, color: userColor }}
          >
            <form onSubmit={handleSendMessage}>
              <input
                ref={inputRef}
                type="text"
                className={styles.chatInput}
                placeholder="Type here..."
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                onBlur={() => !typedMessage && setIsTyping(false)}
                maxLength={50}
                style={{ borderColor: userColor }}
              />
            </form>
          </motion.div>
        )}

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
      </AnimatePresence>
    </div>
  );
}
