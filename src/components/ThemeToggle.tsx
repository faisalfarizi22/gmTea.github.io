import React, { useEffect, useState } from 'react';
import { FaSun, FaMoon } from 'react-icons/fa';

interface ThemeToggleProps {
  className?: string;
  onThemeChange?: (theme: 'light' | 'dark') => void;
  forceTheme?: 'light' | 'dark' | null;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '',
  onThemeChange,
  forceTheme = null
}) => {
  const [darkMode, setDarkMode] = useState<boolean>(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const initialDarkMode = savedTheme 
      ? savedTheme === 'dark' 
      : prefersDark;
    
    setDarkMode(initialDarkMode);
    
    if (initialDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    if (forceTheme !== null) {
      const newDarkMode = forceTheme === 'dark';
      if (darkMode !== newDarkMode) {
        setDarkMode(newDarkMode);
        
        if (newDarkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    }
  }, [forceTheme, darkMode]);

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    
    if (onThemeChange) {
      onThemeChange(newDarkMode ? 'dark' : 'light');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg transition-colors duration-200 ${
        darkMode 
          ? 'bg-gray-800 hover:bg-gray-700' 
          : 'bg-emerald-100 hover:bg-emerald-200'
      } ${className}`}
      aria-label="Toggle dark mode"
    >
      {darkMode ? (
        <FaSun className="h-5 w-5 text-yellow-400" />
      ) : (
        <FaMoon className="h-5 w-5 text-emerald-700" />
      )}
    </button>
  );
};

export default ThemeToggle;