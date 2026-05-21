import React from 'react';
import styles from './ideaDetails.module.css';

export default function IdeaDetailsLoading() {
  return (
    <div className={styles.loadingContainer} style={{ minHeight: '100vh', padding: '100px 5% 0', background: 'var(--background)' }}>
      {/* Hero Skeleton */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className={styles.skeleton} style={{ height: '2.5rem', width: '200px', marginBottom: '1.5rem', opacity: 0.1 }}></div>
        <div className={styles.skeleton} style={{ height: '5rem', width: '80%', marginBottom: '2rem', opacity: 0.2 }}></div>
        <div className={styles.skeleton} style={{ height: '1.2rem', width: '60%', marginBottom: '4rem', opacity: 0.1 }}></div>
        
        {/* Author Bar Skeleton */}
        <div style={{ 
          height: '80px', 
          border: '1px solid var(--outline-color)', 
          background: 'rgba(255,255,255,0.02)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 2rem',
          gap: '1rem',
          marginBottom: '3rem'
        }}>
          <div className={styles.skeleton} style={{ width: '48px', height: '48px', borderRadius: '8px', opacity: 0.1 }}></div>
          <div style={{ flex: 1 }}>
            <div className={styles.skeleton} style={{ height: '0.8rem', width: '120px', marginBottom: '8px', opacity: 0.1 }}></div>
            <div className={styles.skeleton} style={{ height: '1rem', width: '180px', opacity: 0.1 }}></div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className={styles.skeleton} style={{ width: '100px', height: '36px', borderRadius: '20px', opacity: 0.1 }}></div>
            <div className={styles.skeleton} style={{ width: '100px', height: '36px', borderRadius: '20px', opacity: 0.1 }}></div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div style={{ maxWidth: '1000px' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ marginBottom: '4rem' }}>
              <div className={styles.skeleton} style={{ height: '2rem', width: '300px', marginBottom: '1.5rem', opacity: 0.2 }}></div>
              <div className={styles.skeleton} style={{ height: '1.1rem', width: '100%', marginBottom: '0.8rem', opacity: 0.1 }}></div>
              <div className={styles.skeleton} style={{ height: '1.1rem', width: '100%', marginBottom: '0.8rem', opacity: 0.1 }}></div>
              <div className={styles.skeleton} style={{ height: '1.1rem', width: '90%', marginBottom: '0.8rem', opacity: 0.1 }}></div>
              <div className={styles.skeleton} style={{ height: '1.1rem', width: '95%', marginBottom: '2rem', opacity: 0.1 }}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
