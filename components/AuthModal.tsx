'use client';

import React, { useState } from 'react';
import Modal from './Modal';
import { User, ShieldCheck, CheckSquare, Square, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void | Promise<void>;
  title?: string;
  description?: string;
  actionText?: string;
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  onLogin, 
  title = "Authentication Required", 
  description = "To proceed with this action, please sign in with your Google account.",
  actionText = "Continue with Google"
}: AuthModalProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLoginClick = async () => {
    if (acceptedTerms && !isLoggingIn) {
      setIsLoggingIn(true);
      try {
        await onLogin();
      } finally {
        setIsLoggingIn(false);
      }
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.95rem', color: 'var(--foreground)', fontWeight: 600 }}>
            {description}
          </p>
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', 
            background: 'var(--outline-color)', borderRadius: '8px', border: '1px solid var(--outline-color)',
            marginTop: '0.5rem'
          }}>
            <Info size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'left', lineHeight: 1.4 }}>
              Your data is protected. We only collect necessary information to manage your account and deliver products.
            </p>
          </div>
        </div>

        <div 
          onClick={() => setAcceptedTerms(!acceptedTerms)}
          style={{ 
            display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', 
            width: '100%', padding: '0.75rem', border: '1px solid var(--outline-color)',
            transition: 'border-color 0.2s ease',
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
          onClick={handleLoginClick}
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
              <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '16px', height: '16px' }} />
              {actionText}
            </>
          )}
        </button>

        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Secure Authentication via Google. We don't see your password.
        </p>
      </div>
    </Modal>
  );
}
