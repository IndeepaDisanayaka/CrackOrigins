'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, Mail, Lock, AlertCircle, ArrowLeft, CheckSquare, Square } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import LiveCursors from '@/components/LiveCursors';
import styles from '@/app/page.module.css';

export default function SignupPage() {
  return (
    <React.Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <SignupContent />
    </React.Suspense>
  );
}

function SignupContent() {
  const { login, user, isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isAuthLoading && user) {
      if (window.history.length > 2) {
        router.back();
      } else {
        router.push('/');
      }
    }
  }, [user, isAuthLoading, router]);

  const submitAuth = async (type: 'google' | 'email-signup') => {
    if (type !== 'google' && (!email || !password)) {
      setErrorMsg('Please fill out all fields.');
      return;
    }
    if (!acceptedTerms) {
      setErrorMsg('Please accept the Terms of Service to continue.');
      return;
    }

    setIsLoggingIn(true);
    setErrorMsg('');
    try {
      const refId = searchParams?.get('ref');
      const res = await login(type, type === 'google' ? undefined : { email, password }, refId);
      if (res && res.success === false) {
        setErrorMsg(res.error);
      } else {
        const returnUrl = searchParams?.get('returnUrl') || '/';
        router.push(returnUrl);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "An error occurred");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isAuthLoading || user) return null;

  return (
    <>
      <LiveCursors />
      <div className={styles.backgroundAnimation}></div>

      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', position: 'relative', zIndex: 10 }}>
        <button 
            onClick={() => { if(window.history.length > 2) router.back(); else router.push('/'); }} 
            style={{ 
                position: 'fixed', top: '2rem', left: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', 
                background: 'var(--card-bg)', border: '1px solid var(--outline-color)', color: 'var(--foreground)', 
                padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', zIndex: 20, transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--outline-color)'}
        >
            <ArrowLeft size={18} /> Back
        </button>

        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{ 
                maxWidth: '430px', width: '100%', padding: '2.5rem 2rem', 
                background: 'var(--card-bg)', 
                border: '1px solid var(--outline-color)', borderRadius: '12px', 
                display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center',
                boxShadow: 'none'
            }}
        >
          <div style={{ 
            width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--primary)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000',
            boxShadow: '0 0 20px var(--highlight-glow)'
          }}>
            <UserPlus size={32} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', width: '100%' }}>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--foreground)' }}>Create Account</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Join us and unlock full access</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
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
                          placeholder="Create a strong password" 
                          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--outline-color)', borderRadius: '8px', padding: '0.75rem 1rem 0.75rem 2.5rem', color: 'var(--foreground)', outline: 'none' }}
                      />
                  </div>
              </div>

              {errorMsg && (
                  <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }} 
                      style={{ background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)', padding: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: '#ff6b6b', fontSize: '0.8rem', textAlign: 'left' }}
                  >
                      <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                      <span>{errorMsg}</span>
                  </motion.div>
              )}

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
                  onClick={() => submitAuth('email-signup')}
                  style={{ 
                      width: '100%', padding: '1rem', gap: '0.75rem', justifyContent: 'center',
                      opacity: (!acceptedTerms || isLoggingIn) ? 0.5 : 1, transform: 'none',
                      cursor: (!acceptedTerms || isLoggingIn) ? 'not-allowed' : 'pointer'
                  }}
              >
                  {isLoggingIn ? <div className="glitchLoader">INITIALIZING...</div> : "Create Account"}
              </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '1rem' }}>
              <div style={{ height: '1px', background: 'var(--outline-color)', flex: 1 }}></div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>OR</span>
              <div style={{ height: '1px', background: 'var(--outline-color)', flex: 1 }}></div>
          </div>

          <button 
            disabled={!acceptedTerms || isLoggingIn}
            onClick={() => submitAuth('google')}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
              width: '100%', padding: '0.85rem', background: 'transparent', color: 'var(--foreground)',
              border: '1px solid var(--outline-color)', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600,
              cursor: (!acceptedTerms || isLoggingIn) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: (!acceptedTerms || isLoggingIn) ? 0.5 : 1
            }}
            onMouseOver={(e) => { if(acceptedTerms && !isLoggingIn) e.currentTarget.style.borderColor = 'var(--primary)' }}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--outline-color)'}
          >
             <Image src="https://www.google.com/favicon.ico" alt="Google" width={16} height={16} quality={75} />
             Continue with Google
          </button>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Already have an account? <Link href="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
          </p>
        </motion.div>
      </main>
    </>
  );
}
