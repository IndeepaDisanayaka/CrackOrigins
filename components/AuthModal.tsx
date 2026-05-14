'use client';

import React, { useState } from 'react';
import Modal from './Modal';
import { ShieldCheck, CheckSquare, Square, Info, Mail, Lock, AlertCircle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (type: 'google' | 'email-login' | 'email-signup', credentials?: { email: string, password: string }, referralId?: string | null) => Promise<any> | void;
  title?: string;
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  onLogin, 
  title = "Authentication"
}: AuthModalProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'google'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [affiliateCode, setAffiliateCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const submitAuth = async (type: 'google' | 'email-login' | 'email-signup') => {
    if (type !== 'google' && (!email || !password)) {
      setErrorMsg('Please fill out all fields.');
      return;
    }
    if (!acceptedTerms) {
      setErrorMsg('Please accept the terms.');
      return;
    }

    setIsLoggingIn(true);
    setErrorMsg('');
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const refId = affiliateCode || searchParams.get('ref');
      const res = await onLogin(type, type === 'google' ? undefined : { email, password }, refId);
      if (res && res.success === false) {
        setErrorMsg(res.error);
        if (res.error.includes("use Google") || res.error.includes("via Google")) {
            setMode('google');
        } else if (res.error.includes("sync your account") || res.error.includes("log in using Email/Password")) {
            setMode('login');
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || "An error occurred");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center', padding: '0.5rem 0' }}>
        <div style={{ 
          width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--primary)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000',
          boxShadow: '0 0 20px var(--highlight-glow)'
        }}>
          <ShieldCheck size={32} />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', width: '100%', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '8px' }}>
            <button 
                onClick={() => { setMode('google'); setErrorMsg(''); }}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', background: mode === 'google' ? 'var(--primary)' : 'transparent', color: mode === 'google' ? '#000' : 'var(--foreground)', border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
            >
                Google
            </button>
            <button 
                onClick={() => { setMode('login'); setErrorMsg(''); }}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', background: mode === 'login' ? 'var(--primary)' : 'transparent', color: mode === 'login' ? '#000' : 'var(--foreground)', border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
            >
                Log In
            </button>
            <button 
                onClick={() => { setMode('signup'); setErrorMsg(''); }}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', background: mode === 'signup' ? 'var(--primary)' : 'transparent', color: mode === 'signup' ? '#000' : 'var(--foreground)', border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
            >
                Sign Up
            </button>
        </div>

        <AnimatePresence mode="wait">
            <motion.div 
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
                {mode === 'google' ? (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.95rem', color: 'var(--foreground)', fontWeight: 600 }}>
                        Continue instantly with Google
                    </p>
                    <div style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', 
                        background: 'rgba(var(--primary-rgb, 254, 182, 12), 0.05)', borderRadius: '8px', border: '1px solid rgba(var(--primary-rgb, 254, 182, 12), 0.2)',
                        marginTop: '0.5rem'
                    }}>
                        <Info size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'left', lineHeight: 1.4 }}>
                        Your data is protected. We only collect necessary information to manage your account and deliver products.
                        </p>
                    </div>
                   </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', textAlign: 'left' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, paddingLeft: '0.25rem' }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email" 
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--outline-color)', borderRadius: '8px', padding: '0.75rem 1rem 0.75rem 2.5rem', color: 'var(--foreground)', outline: 'none' }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', textAlign: 'left' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, paddingLeft: '0.25rem' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={mode === 'signup' ? "Create a password" : "Enter your password"} 
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--outline-color)', borderRadius: '8px', padding: '0.75rem 1rem 0.75rem 2.5rem', color: 'var(--foreground)', outline: 'none' }}
                                />
                            </div>
                        </div>
                        {mode === 'signup' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', textAlign: 'left' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, paddingLeft: '0.25rem' }}>Affiliate Code (Optional)</label>
                                <div style={{ position: 'relative' }}>
                                    <ShieldCheck size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input 
                                        type="text" 
                                        value={affiliateCode}
                                        onChange={(e) => setAffiliateCode(e.target.value)}
                                        placeholder="e.g. CRACK77" 
                                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--outline-color)', borderRadius: '8px', padding: '0.75rem 1rem 0.75rem 2.5rem', color: 'var(--foreground)', outline: 'none' }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {errorMsg && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        style={{ background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)', padding: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ff6b6b', fontSize: '0.8rem', textAlign: 'left' }}
                    >
                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                        <span>{errorMsg}</span>
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>

        <div 
          onClick={() => setAcceptedTerms(!acceptedTerms)}
          style={{ 
            display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', 
            width: '100%', padding: '0.75rem', border: '1px solid var(--outline-color)',
            transition: 'border-color 0.2s ease', borderRadius: '8px',
            borderColor: acceptedTerms ? 'var(--primary)' : 'var(--outline-color)'
          }}
        >
          <div style={{ marginTop: '0.1rem', color: acceptedTerms ? 'var(--primary)' : 'var(--text-muted)' }}>
            {acceptedTerms ? <CheckSquare size={18} /> : <Square size={18} />}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--foreground)', textAlign: 'left', lineHeight: 1.4, fontWeight: 500 }}>
            I have read and agree to the <Link href="/terms" target="_blank" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 700 }} onClick={(e) => e.stopPropagation()}>Privacy Policy and Terms of Service</Link>.
          </span>
        </div>

        <button 
          className="btnSolid" 
          disabled={!acceptedTerms || isLoggingIn}
          onClick={() => submitAuth(mode === 'login' ? 'email-login' : mode === 'signup' ? 'email-signup' : 'google')}
          style={{ 
            width: '100%', padding: '1rem', gap: '0.75rem', justifyContent: 'center',
            opacity: (acceptedTerms && !isLoggingIn) ? 1 : 0.5,
            cursor: (acceptedTerms && !isLoggingIn) ? 'pointer' : 'not-allowed',
            transform: 'none'
          }}
        >
          {isLoggingIn ? (
            <div className="glitchLoader">INITIALIZING...</div>
          ) : (
            <>
              {mode === 'google' && <Image src="https://www.google.com/favicon.ico" alt="Google" width={16} height={16} quality={75} />}
              {mode === 'google' ? "Continue with Google" : mode === 'login' ? "Sign In" : "Create Account"}
            </>
          )}
        </button>

        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Secure Authentication. {mode === 'google' && "We don't see your password."}
        </p>

        <Link 
          href="/login" 
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            width: '100%', padding: '0.75rem', marginTop: '0.5rem',
            background: 'transparent', border: '1px solid var(--outline-color)',
            color: 'var(--foreground)', borderRadius: '8px', fontSize: '0.85rem',
            cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
          onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--outline-color)'}
        >
          <ExternalLink size={16} /> Open Login Page
        </Link>
      </div>
    </Modal>
  );
}
