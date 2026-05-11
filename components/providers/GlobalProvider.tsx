'use client';

import { AuthProvider } from '../../lib/contexts/AuthContext';
import { ModalProvider } from '../../lib/contexts/ModalContext';
import { ToastProvider } from '../Toast';
import { ThemeProvider } from '../ThemeProvider';
import { SessionProvider } from 'next-auth/react';

export function GlobalProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <ModalProvider>
              {children}
            </ModalProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
