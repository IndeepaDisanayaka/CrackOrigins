'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'default';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('default');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setThemeState(savedTheme);
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light-theme', 'dark-theme');

    if (theme === 'default') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-theme' : 'light-theme';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(`${theme}-theme`);
    }
  }, [theme]);

  // Listen for system theme changes if default is selected
  useEffect(() => {
    if (theme !== 'default') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove('light-theme', 'dark-theme');
      root.classList.add(mediaQuery.matches ? 'dark-theme' : 'light-theme');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
