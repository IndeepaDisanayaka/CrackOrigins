'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, ArrowRight, Sparkles, MessageSquare, Zap } from 'lucide-react';
import Link from 'next/link';
import { revealVariants, staggerContainer } from '../../lib/constants';
import styles from '../ExtraSections.module.css';

export default function IdeasTeaser() {
  return (
    <motion.section
      className={styles.section}
      id="ideas-teaser"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={revealVariants}
      style={{ marginBottom: '6rem' }}
    >
      <div className={styles.teaserGrid} style={{ 
        background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.05) 0%, transparent 100%)',
        border: '1px solid var(--outline-color)',
        borderRadius: '24px',
        padding: '4rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        
        {/* Animated Background Elements */}
        <motion.div 
            style={{ position: 'absolute', top: '-10%', right: '-10%', opacity: 0.1, color: 'var(--primary)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        >
            <Sparkles size={400} />
        </motion.div>

        <div>
            <span className="sectionLabel" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lightbulb size={14} /> The Creator Hub
            </span>
            <h2 className={styles.teaserTitle}>
                Got a <span style={{ color: 'var(--primary)' }}>Masterpiece</span> in mind?
            </h2>
            <p style={{ fontSize: '1.1rem', opacity: 0.7, lineHeight: 1.6, marginBottom: '2.5rem', maxWidth: '600px' }}>
                Crack Origins isn't just a studio; it's an incubator. We take the most daring ideas from our community and turn them into reality. Share your vision, collaborate with pros, and watch your concept come to life.
            </p>
            
            <div style={{ display: 'flex', gap: '1.5rem' }}>
                <Link href="/ideas" className="btnSolid" style={{ padding: '1rem 2rem', fontSize: '0.9rem' }}>
                    Launch Your Idea <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
                </Link>
                <Link href="/blog" className="btnOutline" style={{ padding: '1rem 2rem', fontSize: '0.9rem' }}>
                    Read Dispatches
                </Link>
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {[
                { icon: <MessageSquare size={24} />, title: "Community Driven", desc: "Every project starts with a spark from you." },
                { icon: <Zap size={24} />, title: "Rapid Prototyping", desc: "We move fast from concept to playable build." },
                { icon: <Sparkles size={24} />, title: "Visual Excellence", desc: "Premium aesthetics for every community idea." },
                { icon: <Lightbulb size={24} />, title: "Open Collab", desc: "Join our dev cycles and see the process." }
            ].map((feature, i) => (
                <motion.div 
                    key={i}
                    style={{ 
                        background: 'var(--background)',
                        border: '1px solid var(--outline-color)',
                        padding: '1.5rem',
                        borderRadius: '16px'
                    }}
                    whileHover={{ y: -5, borderColor: 'var(--primary)' }}
                >
                    <div style={{ color: 'var(--primary)', marginBottom: '1rem' }}>{feature.icon}</div>
                    <h4 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>{feature.title}</h4>
                    <p style={{ fontSize: '0.8rem', opacity: 0.6, lineHeight: 1.4 }}>{feature.desc}</p>
                </motion.div>
            ))}
        </div>
      </div>
    </motion.section>
  );
}
