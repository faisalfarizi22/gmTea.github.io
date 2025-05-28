import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaLeaf, FaSpinner, FaDice, FaArrowRight, FaPaperPlane, FaTimes } from 'react-icons/fa';
import { DEFAULT_MESSAGES, CHECKIN_FEE } from '@/utils/constants';

interface CheckinButtonProps {
  canCheckin: boolean;
  onCheckin: (message: string) => Promise<void>;
  isLoading: boolean;
}

const CheckinButton: React.FC<CheckinButtonProps> = ({
  canCheckin,
  onCheckin,
  isLoading
}) => {
  const [message, setMessage] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const handleCheckin = async () => {
    if (!canCheckin || isLoading) return;
    await onCheckin(message);
    setMessage('');
    setIsExpanded(false);
  };

  const selectSuggestion = (suggestion: string) => {
    setMessage(suggestion);
    setShowSuggestions(false);
  };

  const getRandomMessage = () => {
    const randomIndex = Math.floor(Math.random() * DEFAULT_MESSAGES.length);
    setMessage(DEFAULT_MESSAGES[randomIndex]);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="bg-white dark:bg-black/80 backdrop-blur-lg rounded-xl border border-gray-200 dark:border-emerald-700/30 p-6 shadow-lg"
    >
      <h3 className="text-lg font-semibold mb-4 flex items-center text-emerald-700 dark:text-emerald-300">
        <FaLeaf className="mr-2 text-emerald-500" />
        Daily GM Check-in
      </h3>
      
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.div 
          key="expanded"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="relative">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your GM message (optional)"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800/30 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600 focus:border-emerald-500 dark:text-emerald-50 transition-all duration-200 shadow-sm"
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              <button
                type="button"
                onClick={getRandomMessage}
                className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 transition-colors border border-emerald-200 dark:border-emerald-700/30 shadow-sm"
                title="Get random greeting"
              >
                <FaDice className="w-4 h-4" />
              </button>
            </div>
            
            <AnimatePresence>
              {showSuggestions && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute z-10 mt-2 w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-emerald-100 dark:border-emerald-800/30 py-2 overflow-hidden"
                >
                  <p className="px-3 py-1 text-sm text-gray-500 dark:text-emerald-300/70 bg-emerald-50 dark:bg-emerald-900/20 font-medium">Suggested Greetings:</p>
                  <div className="max-h-40 overflow-y-auto custom-scrollbar">
                    {DEFAULT_MESSAGES.map((suggestion, index) => (
                      <button
                        key={index}
                        className="w-full text-left px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors text-sm text-gray-700 dark:text-emerald-200"
                        onClick={() => selectSuggestion(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="flex items-center text-xs text-gray-500 dark:text-emerald-400/50 mt-1.5 ml-1">
              <span className="flex items-center">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1"></div>
                Check-in Fee: {CHECKIN_FEE} TEA
              </span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-700/30 text-gray-700 dark:text-emerald-300 rounded-lg transition-colors shadow-sm flex items-center justify-center"
              onClick={() => setIsExpanded(false)}
              disabled={isLoading}
            >
              <FaTimes className="mr-2 h-3 w-3" />
              Cancel
            </button>
            
            <button
              className={`flex-1 px-4 py-2.5 rounded-lg flex items-center justify-center shadow-lg transition-all duration-300 ${
                canCheckin && !isLoading
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
              onClick={handleCheckin}
              disabled={!canCheckin || isLoading}
            >
              {isLoading ? (
                <>
                  <FaSpinner className="animate-spin h-4 w-4 mr-2" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FaPaperPlane className="h-4 w-4 mr-2" />
                  <span>Check-in</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="collapsed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-lg p-2 mb-4 border border-emerald-100 dark:border-emerald-800/30">
            <p className="text-gray-600 dark:text-emerald-300/70 text-xs leading-relaxed">
              Start your day by checking in on the Tea blockchain. Share a greeting, thought, or just say GM!
            </p>
          </div>
          
          <button
            className={`w-full py-3 px-6 rounded-lg flex items-center justify-center shadow-lg transition-all duration-300 group ${
              canCheckin
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
            onClick={() => setIsExpanded(true)}
            disabled={!canCheckin || isLoading}
          >
            <div className="relative">
              <FaLeaf className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
              {canCheckin && (
                <div className="absolute inset-0 rounded-full animate-pulse opacity-70" style={{ 
                  background: 'radial-gradient(circle at center, rgba(255,255,255,0.8) 0%, transparent 70%)'
                }}></div>
              )}
            </div>
            <span className="mx-2">{canCheckin ? 'Say GM' : 'Wait for next check-in'}</span>
            {canCheckin && (
              <FaArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
            )}
          </button>
          
          {!canCheckin && (
            <p className="text-xs text-center text-gray-500 dark:text-emerald-400/50 mt-2">You need to wait until your next check-in time</p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
    
    {/* Custom animation styles */}
    <style jsx global>{`
      .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(16, 185, 129, 0.1);
        border-radius: 10px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(16, 185, 129, 0.3);
        border-radius: 10px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(16, 185, 129, 0.5);
      }
    `}</style>
  </motion.div>
);
};

export default CheckinButton;
            