'use client';
import React, { useState, useEffect } from 'react';

export default function FlipWords({ words, duration = 3000 }: { words: string[], duration?: number }) {
  const [index, setIndex] = useState(0);
  const [animateValue, setAnimateValue] = useState<'in' | 'out'>('in');

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimateValue('out');
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % words.length);
        setAnimateValue('in');
      }, 500); // Wait for fade out animation
    }, duration);
    return () => clearInterval(interval);
  }, [words, duration]);

  return (
    <span 
      style={{ 
        display: 'inline-flex', 
        justifyContent: 'center',
        position: 'relative', 
        minWidth: '11ch',
        textAlign: 'left',
        verticalAlign: 'bottom'
      }}
    >
      <span
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: animateValue === 'in' ? 1 : 0,
          transform: animateValue === 'in' ? 'translateY(0) rotateX(0)' : 'translateY(15px) rotateX(-45deg)',
          filter: animateValue === 'in' ? 'blur(0px)' : 'blur(4px)',
        }}
      >
        {words[index]}
      </span>
    </span>
  );
}
