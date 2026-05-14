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
      background: '#0B0F13', // Deep dark background
      color: 'var(--foreground)',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Outfit', sans-serif"
    }}>
      {/* Background Ripple Effect */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.1, scale: 1.5 }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: i * 1.3,
            ease: "linear"
          }}
          style={{
            position: 'absolute',
            width: '600px',
            height: '600px',
            border: '2px solid var(--primary)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }}
        />
      ))}

      <div className="scanline" style={{ opacity: 0.05 }} />

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          textAlign: 'center',
          padding: '2rem',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: 'min(12rem, 25vw)', 
            lineHeight: 0.9, 
            fontWeight: 900, 
            color: 'var(--primary)',
            margin: 0,
            letterSpacing: '-0.02em',
            textShadow: '0 0 40px rgba(var(--primary-rgb), 0.3)'
          }}>
            404
          </h1>
        </div>

        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
        >
            <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 900, 
                textTransform: 'uppercase', 
                letterSpacing: '0.4em',
                marginBottom: '1.5rem',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem'
            }}>
                Mission Failed
            </h2>
            
            <p style={{ 
                maxWidth: '430px', 
                margin: '0 auto 3rem', 
                fontSize: '0.95rem', 
                color: 'var(--text-muted)',
                lineHeight: 1.7,
                fontWeight: 500
            }}>
                The page you are looking for has been moved, deleted, or never existed in this dimension. Check your coordinates and try again.
            </p>

            <div style={{ 
                display: 'flex', 
                gap: '1.25rem', 
                justifyContent: 'center',
                flexWrap: 'wrap'
            }}>
                <Link href="/" className="btnSolid" style={{ 
                    textDecoration: 'none', 
                    padding: '1rem 2rem',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    borderRadius: '4px'
                }}>
                    <Home size={18} />
                    RETURN TO BASE
                </Link>
                <button 
                    onClick={() => window.history.back()} 
                    className="btnOutline"
                    style={{ 
                        textDecoration: 'none', 
                        padding: '1rem 2rem',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        borderRadius: '4px'
                    }}
                >
                    <ArrowLeft size={18} />
                    GO BACK
                </button>
            </div>
        </motion.div>
      </motion.div>

      {/* Aesthetic Accents */}
      <div style={{
        position: 'absolute',
        bottom: '3rem',
        left: '3rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        opacity: 0.4,
        fontSize: '0.75rem',
        fontWeight: 800,
        letterSpacing: '2px',
        color: 'var(--text-muted)'
      }}>
        <AlertTriangle size={14} />
        ERROR_CODE: CORRUPT_LINK_0x404
      </div>

      <div style={{
        position: 'absolute',
        top: '4rem',
        right: '4rem',
        opacity: 0.05,
        fontSize: '6rem',
        fontWeight: 900,
        userSelect: 'none',
        pointerEvents: 'none',
        letterSpacing: '0.1em'
      }}>
        CRACK ORIGINS
      </div>
    </div>
  );
}
