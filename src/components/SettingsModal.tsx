import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaLeaf, FaVolumeUp, FaVolumeMute, FaMoon, FaSun } from 'react-icons/fa';
import ThemeToggle from './ThemeToggle';

interface SettingsModalProps {
  onClose: () => void;
  currentTheme?: 'light' | 'dark';
  onThemeChange?: (theme: 'light' | 'dark') => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  onClose, 
  currentTheme = 'dark',
  onThemeChange = () => {} 
}) => {
  const [isDarkMode, setIsDarkMode] = useState(currentTheme === 'dark');
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);

  const handleThemeToggle = (theme: 'light' | 'dark') => {
    setIsDarkMode(theme === 'dark');
    onThemeChange(theme);
  };

  const handleMusicToggle = () => {
    const newMusicState = !isMusicEnabled;
    setIsMusicEnabled(newMusicState);
    
    window.dispatchEvent(new CustomEvent('toggle-music', { 
      detail: { enabled: newMusicState } 
    }));
    
    localStorage.setItem('musicEnabled', newMusicState.toString());
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
    
    const savedMusicEnabled = localStorage.getItem('musicEnabled');
    if (savedMusicEnabled !== null) {
      setIsMusicEnabled(savedMusicEnabled === 'true');
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      ></motion.div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${
          isDarkMode 
            ? 'bg-gray-900/95 border-emerald-500/20 text-white' 
            : 'bg-white/95 border-emerald-600/20 text-gray-800'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500"></div>
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className={`relative p-6 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="flex items-center">
            <div className={`h-10 w-10 rounded-full ${
              isDarkMode 
                ? 'bg-emerald-900/50 border-emerald-500/20' 
                : 'bg-emerald-100 border-emerald-200'
              } border flex items-center justify-center mr-3`}>
              <FaLeaf className={`h-5 w-5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
            </div>
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Settings</h2>
            
            <button 
              onClick={onClose}
              className={`ml-auto rounded-full h-8 w-8 flex items-center justify-center ${
                isDarkMode 
                  ? 'text-gray-400 hover:text-white hover:bg-gray-800' 
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
              } transition-colors`}
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className={`group transition-all duration-300 relative rounded-xl p-4 shadow-sm ${
            isDarkMode 
              ? 'bg-gray-800/50 hover:bg-gray-800 border-gray-700 hover:border-emerald-500/30 hover:shadow-emerald-500/5' 
              : 'bg-gray-100/80 hover:bg-gray-100 border-gray-200 hover:border-emerald-300/50 hover:shadow-emerald-300/10'
            } border`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {isDarkMode ? (
                  <FaMoon className="h-5 w-5 text-blue-400 mr-3" />
                ) : (
                  <FaSun className="h-5 w-5 text-yellow-500 mr-3" />
                )}
                <div>
                  <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Theme</div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                  </div>
                </div>
              </div>
              
              <ThemeToggle 
                className="bg-transparent hover:bg-transparent p-0"
                onThemeChange={handleThemeToggle}
                forceTheme={isDarkMode ? 'dark' : 'light'}
              />
            </div>
            <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          
          <div className={`group transition-all duration-300 relative rounded-xl p-4 shadow-sm ${
            isDarkMode 
              ? 'bg-gray-800/50 hover:bg-gray-800 border-gray-700 hover:border-emerald-500/30 hover:shadow-emerald-500/5' 
              : 'bg-gray-100/80 hover:bg-gray-100 border-gray-200 hover:border-emerald-300/50 hover:shadow-emerald-300/10'
            } border`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {isMusicEnabled ? (
                  <FaVolumeUp className="h-5 w-5 text-purple-500 dark:text-purple-400 mr-3" />
                ) : (
                  <FaVolumeMute className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3" />
                )}
                <div>
                  <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Background Music</div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {isMusicEnabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <button 
                  onClick={handleMusicToggle}
                  className="relative w-12 h-6 transition-colors duration-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  aria-label={isMusicEnabled ? "Disable background music" : "Enable background music"}
                >
                  <div className={`absolute inset-0 rounded-full transition-colors duration-300 ${
                    isMusicEnabled 
                      ? 'bg-purple-600 dark:bg-purple-700' 
                      : isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
                  }`}></div>
                  
                  {isMusicEnabled && (
                    <div className="absolute left-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-0.5 scale-75 pointer-events-none">
                      <div className="w-0.5 h-2 bg-white dark:bg-purple-300 animate-music-bar1 rounded-full"></div>
                      <div className="w-0.5 h-3 bg-white dark:bg-purple-300 animate-music-bar2 rounded-full"></div>
                      <div className="w-0.5 h-1.5 bg-white dark:bg-purple-300 animate-music-bar3 rounded-full"></div>
                    </div>
                  )}
                  
                  <div 
                    className={`absolute top-0.5 w-5 h-5 rounded-full transform transition-transform duration-300 border-2 ${
                      isMusicEnabled 
                        ? isDarkMode
                          ? 'bg-purple-300 border-purple-200 translate-x-6' 
                          : 'bg-white border-white translate-x-6'
                        : isDarkMode
                          ? 'bg-gray-400 border-gray-300 translate-x-0.5'
                          : 'bg-white border-white translate-x-0.5'
                    }`}
                  ></div>
                </button>
              </div>
            </div>
            <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        </div>
        
        <div className={`p-4 text-center border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className={`text-xs flex items-center justify-center ${
            isDarkMode ? 'text-emerald-500/50' : 'text-emerald-600/50'
          }`}>
            <FaLeaf className="h-3 w-3 mr-1" />
            <span>GM TEA v0.2.2 • Testnet</span>
          </div>
        </div>
      </motion.div>
      
      <style jsx global>{`
        @keyframes music-bar1 {
          0%, 100% { height: 4px; }
          50% { height: 10px; }
        }
        
        @keyframes music-bar2 {
          0%, 100% { height: 6px; }
          40% { height: 8px; }
          80% { height: 10px; }
        }
        
        @keyframes music-bar3 {
          0%, 100% { height: 3px; }
          25% { height: 9px; }
          75% { height: 5px; }
        }
        
        .animate-music-bar1 {
          animation: music-bar1 0.8s ease-in-out infinite;
        }
        
        .animate-music-bar2 {
          animation: music-bar2 1.2s ease-in-out infinite;
        }
        
        .animate-music-bar3 {
          animation: music-bar3 0.9s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default SettingsModal;