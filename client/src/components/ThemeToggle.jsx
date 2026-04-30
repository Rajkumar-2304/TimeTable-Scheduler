import React from 'react';
import { useApp } from '../context/AppContext';

export default function ThemeToggle() {
  const { theme, setTheme } = useApp();

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  return (
    <div className="theme-toggle-container">
      <span className="theme-label">
        {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
      </span>
      <button 
        onClick={toggleTheme} 
        className="theme-toggle-btn"
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? '☀' : '◐'}
      </button>
    </div>
  );
}
