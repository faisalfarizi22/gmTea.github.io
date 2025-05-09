import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { formatTimeRemaining } from '@/utils/web3';
import { FaHourglassHalf, FaCheck, FaClock } from 'react-icons/fa';

interface CountdownTimerProps {
  initialSeconds: number;
  onComplete?: () => void;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ 
  initialSeconds, 
  onComplete 
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialSeconds);
  const [isActive, setIsActive] = useState<boolean>(initialSeconds > 0);

  useEffect(() => {
    setSecondsRemaining(initialSeconds);
    setIsActive(initialSeconds > 0);
  }, [initialSeconds]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive) {
      interval = setInterval(() => {
        setSecondsRemaining((seconds) => {
          if (seconds <= 1) {
            setIsActive(false);
            if (onComplete) onComplete();
            return 0;
          }
          return seconds - 1;
        });
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, onComplete]);

  // Calculate percentage for progress bar
  const calculateProgress = () => {
    if (initialSeconds <= 0) return 100;
    const progress = 100 - (secondsRemaining / initialSeconds) * 100;
    return Math.min(progress, 100); 
  };

  // Get hours, minutes, seconds
  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  const progress = calculateProgress();
  const canCheckin = secondsRemaining <= 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-white dark:bg-black/80 backdrop-blur-lg rounded-xl border border-gray-200 dark:border-emerald-700/30 p-6 shadow-lg"
    >
      <h3 className="text-lg font-semibold mb-4 flex items-center text-emerald-700 dark:text-emerald-300">
        <FaHourglassHalf className="mr-2 text-emerald-500" />
        Countdown to Next GM
      </h3>
      
      <div className="relative mb-6">
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-800/70 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ 
              background: 'linear-gradient(90deg, #059669, #10b981)'
            }}
          ></motion.div>
        </div>
        <motion.div 
          initial={{ left: 0 }}
          animate={{ left: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute h-5 w-5 rounded-full bg-white dark:bg-black border-2 border-emerald-500 top-1/2 transform -translate-y-1/2"
          style={{ transform: 'translateY(-50%) translateX(-50%)' }}
        >
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping"></div>
        </motion.div>
      </div>
      
      {canCheckin ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="mb-4 w-20 h-20 relative">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-pulse"></div>
            <div className="absolute inset-0 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/20 rounded-full">
              <FaCheck className="text-2xl text-emerald-600 dark:text-emerald-300" />
            </div>
            <div className="absolute inset-0 rounded-full animate-pulse opacity-30" style={{ 
              background: 'radial-gradient(circle at center, #10b981 0%, transparent 70%)'
            }}></div>
          </div>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-300 mb-2">Ready for Check-in!</p>
          <p className="text-gray-600 dark:text-emerald-400/70 text-sm">You can now submit your daily GM</p>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center shadow-sm border border-emerald-200 dark:border-emerald-700/30">
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{hours.toString().padStart(2, '0')}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-emerald-400/60 mt-1">HOURS</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center shadow-sm border border-emerald-200 dark:border-emerald-700/30">
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{minutes.toString().padStart(2, '0')}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-emerald-400/60 mt-1">MINUTES</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center shadow-sm border border-emerald-200 dark:border-emerald-700/30">
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{seconds.toString().padStart(2, '0')}</span>
                <div className="absolute h-1 w-1 rounded-full bg-emerald-500 animate-ping"></div>
              </div>
              <span className="text-xs text-gray-500 dark:text-emerald-400/60 mt-1">SECONDS</span>
            </div>
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-emerald-300/70 mt-2">
            <FaClock className="mr-2 text-emerald-500/70 h-3 w-3" />
            <span>until your next daily GM check-in</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default CountdownTimer;