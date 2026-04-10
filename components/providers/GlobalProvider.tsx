'use client';

import React from 'react';
import { AuthProvider } from '../../lib/contexts/AuthContext';
import { ModalProvider } from '../../lib/contexts/ModalContext';
import { ToastProvider } from '../Toast';
import { ThemeProvider } from '../ThemeProvider';

export function GlobalProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <ModalProvider>
            {children}
          </ModalProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
