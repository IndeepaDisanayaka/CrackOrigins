'use client';

import React from 'react';
import { Shield } from 'lucide-react';

export default function AuthLoadingOverlay() {
    return (
        <div className="authLoadingOverlay">
            <div className="authLoadingLogo">
                <Shield size={48} strokeWidth={1.5} />
            </div>
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: 900, 
                    textTransform: 'uppercase', 
                    letterSpacing: '3px', 
                    color: 'var(--primary)' 
                }}>
                    Authorizing
                </p>
                <p style={{ 
                    fontSize: '0.65rem', 
                    opacity: 0.5, 
                    letterSpacing: '1px',
                    textTransform: 'uppercase'
                }}>
                    Verifying credentials...
                </p>
            </div>
            <div className="authLoadingBar" />
        </div>
    );
}
