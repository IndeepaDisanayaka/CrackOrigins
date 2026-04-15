'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="themeToggle" style={{ opacity: 0 }} />;
  }

  return (
    <div className="themeToggle">
      <button 
        className={`toggleBtn ${theme === 'light' ? 'toggleBtnActive' : ''}`}
        onClick={() => setTheme('light')}
        title="Light Mode"
      >
        <Sun size={14} />
      </button>
      <button 
        className={`toggleBtn ${theme === 'dark' ? 'toggleBtnActive' : ''}`}
        onClick={() => setTheme('dark')}
        title="Dark Mode"
      >
        <Moon size={14} />
      </button>
      <button 
        className={`toggleBtn ${theme === 'default' ? 'toggleBtnActive' : ''}`}
        onClick={() => setTheme('default')}
        title="System Default"
      >
        <Monitor size={14} />
      </button>
    </div>
  );
}
