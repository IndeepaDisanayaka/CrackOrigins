'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

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
