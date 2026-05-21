'use client';
import React from 'react';
import { motion } from 'framer-motion';

export default function GlitchLoading({ text = "PROCESSING..." }: { text?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem' }}>
      <style>
        {`
          .glitch-wrapper {
            position: relative;
            font-size: 1.5rem;
            font-weight: 800;
            color: var(--primary, #FEB60C);
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          .glitch-wrapper::before,
          .glitch-wrapper::after {
            content: attr(data-text);
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0.8;
          }
          .glitch-wrapper::before {
            left: 2px;
            text-shadow: -1px 0 red;
            animation: glitch-anim 2s infinite linear alternate-reverse;
          }
          .glitch-wrapper::after {
            left: -2px;
            text-shadow: -1px 0 blue;
            animation: glitch-anim-2 3s infinite linear alternate-reverse;
          }
          @keyframes glitch-anim {
            0% { clip-path: inset(20% 0 80% 0); transform: translate(-2px, 2px); }
            20% { clip-path: inset(60% 0 10% 0); transform: translate(2px, -2px); }
            40% { clip-path: inset(40% 0 50% 0); transform: translate(2px, 2px); }
            60% { clip-path: inset(80% 0 5% 0); transform: translate(-2px, -2px); }
            80% { clip-path: inset(10% 0 70% 0); transform: translate(2px, -2px); }
            100% { clip-path: inset(30% 0 50% 0); transform: translate(-2px, 2px); }
          }
          @keyframes glitch-anim-2 {
            0% { clip-path: inset(10% 0 60% 0); transform: translate(2px, 2px); }
            20% { clip-path: inset(30% 0 20% 0); transform: translate(-2px, -2px); }
            40% { clip-path: inset(70% 0 10% 0); transform: translate(2px, -2px); }
            60% { clip-path: inset(20% 0 50% 0); transform: translate(-2px, 2px); }
            80% { clip-path: inset(50% 0 30% 0); transform: translate(-2px, -2px); }
            100% { clip-path: inset(5% 0 80% 0); transform: translate(2px, 2px); }
          }
          
          .cyber-loader {
            width: 100%;
            height: 4px;
            background: rgba(255,255,255,0.1);
            position: relative;
            overflow: hidden;
            border-radius: 4px;
            margin-top: 10px;
          }
          .cyber-loader-bar {
            height: 100%;
            background: var(--primary, #FEB60C);
            width: 50%;
            position: absolute;
            animation: loadingBar 1s ease-in-out infinite alternate;
          }
          @keyframes loadingBar {
            0% { left: -50%; width: 50%; }
            100% { left: 100%; width: 50%; }
          }
        `}
      </style>
      <div className="glitch-wrapper" data-text={text}>
        {text}
      </div>
      <div style={{ width: '150px' }}>
        <div className="cyber-loader">
          <div className="cyber-loader-bar"></div>
        </div>
      </div>
    </div>
  );
}
