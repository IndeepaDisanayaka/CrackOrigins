'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{
      height: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--background)',
      color: 'var(--foreground)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Ambience */}
      <div className="scanline" />
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        background: 'var(--primary)',
        filter: 'blur(150px)',
        opacity: 0.05,
        borderRadius: '50%',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none'
      }} />

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          textAlign: 'center',
          padding: '2rem',
          zIndex: 20
        }}
      >
        <div className="premiumLoader" style={{ marginBottom: '1.5rem' }}>
          <div className="glitchLoader" style={{ fontSize: '10rem', lineHeight: 1 }}>
            404
          </div>
        </div>

        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
        >
            <h1 style={{ 
                fontSize: '1.25rem', 
                fontWeight: 900, 
                textTransform: 'uppercase', 
                letterSpacing: '0.3em',
                marginBottom: '1rem',
                color: 'var(--primary)'
            }}>
                Mission Failed
            </h1>
            
            <p style={{ 
                maxWidth: '400px', 
                margin: '0 auto 2.5rem', 
                fontSize: '0.9rem', 
                opacity: 0.7,
                lineHeight: 1.6
            }}>
                The page you are looking for has been moved, deleted, or never existed in this dimension. Check your coordinates and try again.
            </p>

            <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                justifyContent: 'center',
                flexWrap: 'wrap'
            }}>
                <Link href="/" className="btnSolid" style={{ textDecoration: 'none' }}>
                    <Home size={16} />
                    Return to Base
                </Link>
                <button 
                    onClick={() => window.history.back()} 
                    className="btnOutline"
                    style={{ textDecoration: 'none' }}
                >
                    <ArrowLeft size={16} />
                    Go Back
                </button>
            </div>
        </motion.div>
      </motion.div>

      {/* Aesthetic Accents */}
      <div style={{
        position: 'absolute',
        bottom: '2rem',
        left: '2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        opacity: 0.3,
        fontSize: '0.7rem',
        fontWeight: 800,
        letterSpacing: '1px'
      }}>
        <AlertTriangle size={14} />
        ERROR_CODE: CORRUPT_LINK_0x404
      </div>

      <div style={{
        position: 'absolute',
        top: '2rem',
        right: '2rem',
        opacity: 0.1,
        fontSize: '4rem',
        fontWeight: 900,
        userSelect: 'none',
        pointerEvents: 'none'
      }}>
        CRACK ORIGINS
      </div>
    </div>
  );
}
