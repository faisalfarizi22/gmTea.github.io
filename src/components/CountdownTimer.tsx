import React, { useState, useEffect } from 'react';
import { formatTimeRemaining } from '@/utils/web3';
import { FaHourglassHalf, FaCheck } from 'react-icons/fa';

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
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 flex items-center text-emerald-700">
        <FaHourglassHalf className="mr-2 text-emerald-500" />
        Countdown to Next GM
      </h3>
      
      <div className="relative mb-6">
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{ 
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #4e8a40, #6ee7b7)'
            }}
          ></div>
        </div>
        <div 
          className="absolute h-5 w-5 rounded-full bg-white border-2 border-emerald-500 top-1/2 transform -translate-y-1/2 transition-all duration-1000"
          style={{ left: `${progress}%`, transform: 'translateY(-50%) translateX(-50%)' }}
        ></div>
      </div>
      
      {canCheckin ? (
        <div className="flex flex-col items-center">
          <div className="mb-4 w-20 h-20 rounded-full bg-green-100 flex items-center justify-center pulse-ring">
            <FaCheck className="text-2xl text-green-600" />
          </div>
          <p className="text-xl font-bold text-green-600 mb-2">Ready for Check-in!</p>
          <p className="text-gray-600 text-sm">You can now submit your daily GM</p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-lg bg-emerald-100 flex items-center justify-center shadow-sm">
                <span className="text-2xl font-bold text-emerald-700">{hours.toString().padStart(2, '0')}</span>
              </div>
              <span className="text-xs text-gray-500 mt-1">HOURS</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-lg bg-emerald-100 flex items-center justify-center shadow-sm">
                <span className="text-2xl font-bold text-emerald-700">{minutes.toString().padStart(2, '0')}</span>
              </div>
              <span className="text-xs text-gray-500 mt-1">MINUTES</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-lg bg-emerald-100 flex items-center justify-center shadow-sm">
                <span className="text-2xl font-bold text-emerald-700">{seconds.toString().padStart(2, '0')}</span>
              </div>
              <span className="text-xs text-gray-500 mt-1">SECONDS</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">until your next daily GM check-in</p>
        </div>
      )}
    </div>
  );
};

export default CountdownTimer;