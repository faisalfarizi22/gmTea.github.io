import React from 'react';
import { FaChartLine, FaLeaf } from 'react-icons/fa';
import { formatTimeRemaining } from '@/utils/web3';

interface StatsCardProps {
  checkinCount: number;
  timeUntilNextCheckin: number;
  isLoading: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({
  checkinCount,
  timeUntilNextCheckin,
  isLoading,
}) => {
  const canCheckin = timeUntilNextCheckin <= 0;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-bl-full z-0"></div>
        <div className="absolute top-2 right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center z-10">
          <FaLeaf className="text-white text-xs" />
        </div>
        
        <h3 className="text-sm font-medium text-gray-500 mb-2 relative z-10">Total Check-ins</h3>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-28">
            <div className="h-16 w-16 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        ) : (
          <div className="flex flex-col items-center relative z-10">
            <div className="relative">
              <div className={`w-24 h-24 rounded-full ${checkinCount > 0 ? 'bg-emerald-100 pulse-ring' : 'bg-gray-100'} flex items-center justify-center`}>
                <span className="text-3xl font-bold text-emerald-700">{checkinCount}</span>
              </div>
              {checkinCount > 10 && (
                <div className="absolute -top-1 -right-1 w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xs">🔥</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-3">GM check-ins on Tea Network</p>
          </div>
        )}
      </div>
      
      <div className="card overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-bl-full z-0"></div>
        <div className="absolute top-2 right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center z-10">
          <FaChartLine className="text-white text-xs" />
        </div>
        
        <h3 className="text-sm font-medium text-gray-500 mb-2 relative z-10">Next Check-in</h3>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-28">
            <div className="h-16 w-16 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        ) : (
          <div className="flex flex-col items-center relative z-10">
            {canCheckin ? (
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-green-100 pulse-ring flex items-center justify-center">
                  <span className="text-xl font-bold text-green-600">Ready!</span>
                </div>
                <div className="absolute -top-1 -right-1 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xs">✓</span>
                </div>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center">
                <div className="relative w-full h-full">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="45" 
                      fill="none" 
                      stroke="#d1fae5" 
                      strokeWidth="8" 
                    />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="45" 
                      fill="none" 
                      stroke="#4e8a40" 
                      strokeWidth="8" 
                      strokeDasharray="283" 
                      strokeDashoffset="0" 
                      transform="rotate(-90 50 50)" 
                      className="transition-all duration-1000"
                      style={{
                        strokeDashoffset: `${283 * (timeUntilNextCheckin / 86400)}`,
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-emerald-700">
                      {Math.floor(timeUntilNextCheckin / 3600)}h
                    </span>
                  </div>
                </div>
              </div>
            )}
            <p className={`text-sm font-medium mt-3 ${canCheckin ? 'text-green-600' : 'text-emerald-700'}`}>
              {canCheckin 
                ? 'You can check in now!'
                : formatTimeRemaining(timeUntilNextCheckin)
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;