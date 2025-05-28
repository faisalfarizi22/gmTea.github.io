import React, { useState, useEffect } from 'react';
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
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize theme on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const shouldBeDark = forceTheme 
      ? forceTheme === 'dark'
      : savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDarkMode(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, [forceTheme]);

  // Handle forced theme changes from parent
  useEffect(() => {
    if (forceTheme !== null) {
      const newDarkMode = forceTheme === 'dark';
      if (isDarkMode !== newDarkMode) {
        setIsDarkMode(newDarkMode);
        document.documentElement.classList.toggle('dark', newDarkMode);
      }
    }
  }, [forceTheme, isDarkMode]);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    
    // Update DOM class
    document.documentElement.classList.toggle('dark', newTheme);
    
    // Save preference
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    
    // Notify parent component if callback provided
    if (onThemeChange) {
      onThemeChange(newTheme ? 'dark' : 'light');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className={`relative p-2 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm ${className}`}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative w-5 h-5">
        {/* Sun Icon */}
        <FaSun
          className={`absolute inset-0 w-5 h-5 text-yellow-500 transition-all duration-300 ${
            isDarkMode 
              ? 'opacity-0 rotate-90 scale-75' 
              : 'opacity-100 rotate-0 scale-100'
          }`}
        />
        
        {/* Moon Icon */}
        <FaMoon
          className={`absolute inset-0 w-5 h-5 text-gray-600 dark:text-gray-300 transition-all duration-300 ${
            isDarkMode 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 -rotate-90 scale-75'
          }`}
        />
      </div>
      
      {/* Subtle glow effect */}
      <div className={`absolute inset-0 rounded-lg transition-all duration-300 ${
        isDarkMode 
          ? 'bg-blue-500/10 shadow-inner' 
          : 'bg-yellow-500/10'
      }`} />
    </button>
  );
};

export default ThemeToggle;