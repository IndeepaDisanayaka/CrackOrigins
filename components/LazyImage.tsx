'use client';

import React, { useState } from 'react';

interface LazyImageProps {
    src: string;
    alt: string;
    width?: number | string;
    height?: number | string;
    style?: React.CSSProperties;
    className?: string;
    objectFit?: 'cover' | 'contain' | 'fill' | 'none';
}

export default function LazyImage({ src, alt, width, height, style, className, objectFit = 'cover' }: LazyImageProps) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    return (
        <div style={{ position: 'relative', width, height, overflow: 'hidden', ...style }} className={className}>
            {/* Skeleton shimmer shown while loading */}
            {!loaded && !error && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite',
                    borderRadius: 'inherit',
                }} />
            )}
            {!error && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={src}
                    alt={alt}
                    onLoad={() => setLoaded(true)}
                    onError={() => { setLoaded(true); setError(true); }}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit,
                        opacity: loaded ? 1 : 0,
                        transition: 'opacity 0.4s ease',
                        display: 'block',
                    }}
                />
            )}
            {error && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.03)',
                    fontSize: '0.65rem',
                    opacity: 0.4,
                    letterSpacing: '1px',
                    textTransform: 'uppercase'
                }}>
                    No Image
                </div>
            )}
        </div>
    );
}
