'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './LiveCursors.module.css';
import { MousePointer2, Eye, EyeOff } from 'lucide-react';
import { auth, rtdb } from '../lib/firebase';
import { ref, onValue, set, onDisconnect, push, remove, update, runTransaction } from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';
import { useModals } from '../lib/contexts/ModalContext';
import { usePathname } from 'next/navigation';

interface PresenceData {
  id: string;
  uid?: string;
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

const GUEST_PREFIXES = ['Operative', 'Recruit', 'Shadow', 'Ghost', 'Specter', 'Agent', 'Runner', 'Infiltrator', 'Stalker', 'Wraith'];

export default function LiveCursors() {
  const [mounted, setMounted] = useState(false);
  const [isMobileOS, setIsMobileOS] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [partner, setPartner] = useState<PresenceData | null>(null);
  const [userName, setUserName] = useState('Ghost');
  const [userUid, setUserUid] = useState<string | null>(null);
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
  const pairingLockRef = useRef<boolean>(false);

  const cleanupPartnerWatch = useCallback(() => {
    if (partnerWatchUnsubRef.current) {
        partnerWatchUnsubRef.current();
        partnerWatchUnsubRef.current = null;
    }
    partnerIdRef.current = null;
    setPartner(null);
  }, []);

  const setupPartnerWatch = useCallback((pid: string) => {
    if (partnerIdRef.current === pid || !pid) return;
    cleanupPartnerWatch();
    partnerIdRef.current = pid;
    
    const pRef = ref(rtdb, `presence/${pid}`);
    partnerWatchUnsubRef.current = onValue(pRef, (snap) => {
        const data = snap.val();
        if (data && data.partnerId === myIdRef.current) {
            setPartner((prev) => ({ ...prev, ...data }));
        } else {
            // Partner left, record deleted, or partner paired with someone else
            if (myIdRef.current) update(ref(rtdb, `presence/${myIdRef.current}`), { partnerId: '' });
            cleanupPartnerWatch();
        }
    });
  }, [cleanupPartnerWatch]);
  useEffect(() => {
    const mobileOS = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobileOS(mobileOS);
    const saved = localStorage.getItem('cursors_enabled');
    if (saved === 'false') setIsEnabled(false);
    setMounted(true);
    setUserColor(COLORS[Math.floor(Math.random() * COLORS.length)]);

    // Generate random guest identity
    const prefix = GUEST_PREFIXES[Math.floor(Math.random() * GUEST_PREFIXES.length)];
    const suffix = Math.floor(100 + Math.random() * 899);
    setUserName(`${prefix}#${suffix}`);
  }, []);

  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  useEffect(() => {
    let isMounted = true;

    // Wait until Firebase absolutely finishes loading the initial session from IndexedDB
    auth.authStateReady().then(() => {
      if (!isMounted) return;
      if (!auth.currentUser) {
        // Only if absolutely no user is logged in, trigger anonymous log in
        signInAnonymously(auth).catch(() => console.warn("Cursor sync restricted to standard mode."));
      }
    });

    const unsub = auth.onAuthStateChanged((u) => {
      if (u) {
        if (u.displayName) setUserName(u.displayName.split(' ')[0]);
        setUserUid(u.uid);
      } else {
        setUserUid(null);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!mounted || isMobileOS || !isEnabled || !userUid) {
        if (myIdRef.current) {
            remove(ref(rtdb, `presence/${myIdRef.current}`));
            myIdRef.current = null;
        }
        cleanupPartnerWatch();
        return;
    }

    const presenceRef = ref(rtdb, 'presence');
    const myPresenceRef = push(presenceRef);
    const myId = myPresenceRef.key as string;
    myIdRef.current = myId;

    const myData = {
        id: myId, x: 0, y: 0,
        uid: userUid || '',
        name: userNameRef.current,
        color: userColor,
        lastActive: Date.now(),
        partnerId: ''
    };

    set(myPresenceRef, myData);
    onDisconnect(myPresenceRef).remove();

    // High-Stability Pairing Engine
    const discoveryUnsub = onValue(presenceRef, (snapshot) => {
        if (pairingLockRef.current) return;
        
        const allUsers = snapshot.val() || {};
        const me = allUsers[myId];
        
        // 1. If I have a partner, ensure I'm watching them
        if (me?.partnerId) {
            if (me.partnerId !== partnerIdRef.current) {
                setupPartnerWatch(me.partnerId);
            }
            return;
        }

        // 2. If I'm alone, find an available partner
        const entries = Object.entries(allUsers) as [string, PresenceData][];
        const potentialPartner = entries.find(([id, data]) => 
            id !== myId && 
            !data.partnerId && 
            (Date.now() - data.lastActive < 7000)
        );

        if (potentialPartner) {
            pairingLockRef.current = true;
            const [pid] = potentialPartner;
            
            // Re-sync pairing for both instantly
            const updates: any = {};
            updates[`presence/${myId}/partnerId`] = pid;
            updates[`presence/${pid}/partnerId`] = myId;
            
            update(ref(rtdb), updates)
                .then(() => {
                    setupPartnerWatch(pid);
                })
                .finally(() => {
                    pairingLockRef.current = false;
                });
        } else {
            cleanupPartnerWatch();
        }
    });

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (!myIdRef.current) return;
      const x = parseFloat(((e.clientX / window.innerWidth) * 100).toFixed(2));
      const y = parseFloat(((e.clientY / window.innerHeight) * 100).toFixed(2));
      setMyPos({ x, y });
      if (now - lastUpdateRef.current > 40) {
        update(ref(rtdb, `presence/${myIdRef.current}`), { x, y, lastActive: now });
        lastUpdateRef.current = now;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      discoveryUnsub();
      cleanupPartnerWatch();
      if (myIdRef.current) remove(ref(rtdb, `presence/${myIdRef.current}`));
    };
  }, [mounted, userColor, isMobileOS, isEnabled, userName, userUid, cleanupPartnerWatch, setupPartnerWatch]);

  useEffect(() => {
    if (!mounted || isMobileOS || !isEnabled) return;
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
  }, [isTyping, mounted, isMobileOS, isEnabled]);

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

  const toggleCursors = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    localStorage.setItem('cursors_enabled', String(newState));
    if (!newState) {
        setPartner(null);
        setIsTyping(false);
    }
  };

  const { isBlogChatOpen } = useModals();
  const pathname = usePathname();
  const isBlogPage = pathname?.includes('/blog');

  if (!mounted || isMobileOS) return null;

  return (
    <>
      <div className={styles.controls} style={{ 
        right: isBlogChatOpen && isBlogPage ? 'calc(25% + 2rem)' : '2rem',
        transition: 'right 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <button 
          onClick={toggleCursors} 
          className={`${styles.toggleBtn} ${!isEnabled ? styles.disabled : ''}`}
          title={isEnabled ? "Disable Cursors" : "Enable Cursors"}
        >
          <MousePointer2 size={16} fill={isEnabled ? "var(--primary)" : "none"} />
          <span>{isEnabled ? "CURSORS ON" : "CURSORS OFF"}</span>
        </button>
      </div>

      <div className={styles.cursorLayer} style={{ display: isEnabled ? 'block' : 'none' }}>
        <AnimatePresence>
          {partner && isEnabled && (
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

          {isTyping && isEnabled && (
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

          {!isTyping && myMessage && isEnabled && (
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
    </>
  );
}
