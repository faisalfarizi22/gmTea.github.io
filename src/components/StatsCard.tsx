import React from 'react';
import { motion } from 'framer-motion';
import { FaChartLine, FaLeaf, FaUsers, FaSync } from 'react-icons/fa';
import { formatTimeRemaining } from '@/utils/web3';

interface StatsCardProps {
  checkinCount: number;
  timeUntilNextCheckin: number;
  isLoading: boolean;
  globalCheckinCount: number;
  isLoadingGlobalCount?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({
  checkinCount,
  timeUntilNextCheckin,
  isLoading,
  globalCheckinCount,
  isLoadingGlobalCount = false,
}) => {
  const canCheckin = timeUntilNextCheckin <= 0;
  
  // Function to format large numbers with comma separators
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-black/80 backdrop-blur-md rounded-xl border border-gray-200 dark:border-emerald-700/30 p-5 shadow-lg relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-600/10 to-transparent rounded-bl-full"></div>
        <div className="absolute top-2 right-2 w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center shadow-sm border border-emerald-200 dark:border-emerald-700/30">
          <FaLeaf className="text-emerald-500 text-xs" />
        </div>
        
        <h3 className="text-sm font-medium text-emerald-600 dark:text-emerald-300/70 mb-2 relative z-10">Your Check-ins</h3>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-28">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-pulse"></div>
              <div className="absolute inset-2 rounded-full border-2 border-dashed border-emerald-400 animate-spin"></div>
              <div className="absolute inset-4 rounded-full border-2 border-emerald-300/60"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FaLeaf className="text-emerald-400 text-xl animate-pulse" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center relative z-10">
            <div className="relative">
              <div className={`w-24 h-24 rounded-full ${checkinCount > 0 ? 'bg-emerald-100 dark:bg-emerald-900/20' : 'bg-gray-100 dark:bg-gray-800/30'} flex items-center justify-center border border-emerald-200 dark:border-emerald-700/30 shadow-inner`}>
                <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-300">{checkinCount}</span>
                {checkinCount > 0 && (
                  <div className="absolute inset-0 rounded-full animate-pulse opacity-30" style={{ 
                    background: 'radial-gradient(circle at center, #10b981 0%, transparent 70%)'
                  }}></div>
                )}
              </div>
              {checkinCount > 10 && (
                <div className="absolute -top-1 -right-1 w-8 h-8 bg-white dark:bg-black/80 rounded-full flex items-center justify-center shadow-md border-2 border-emerald-500">
                  <span className="text-white font-bold text-xs">🔥</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-emerald-300/70 mt-3">Your GM Count</p>
            {canCheckin ? (
              <p className="mt-1 text-xs text-green-600 dark:text-emerald-400 font-medium">Ready for next check-in!</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500 dark:text-emerald-400/50">Next in: {formatTimeRemaining(timeUntilNextCheckin)}</p>
            )}
          </div>
        )}
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-white dark:bg-black/80 backdrop-blur-md rounded-xl border border-gray-200 dark:border-emerald-700/30 p-5 shadow-lg relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-teal-600/10 to-transparent rounded-bl-full"></div>
        <div className="absolute top-2 right-2 w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center shadow-sm border border-emerald-200 dark:border-emerald-700/30">
          <FaUsers className="text-emerald-500 text-xs" />
        </div>
        
        <h3 className="text-sm font-medium text-emerald-600 dark:text-emerald-300/70 mb-2 relative z-10 flex items-center">
          Global Check-ins
          {isLoadingGlobalCount && (
            <FaSync className="ml-2 text-xs text-emerald-500 animate-spin" />
          )}
        </h3>
        
        {isLoading || (isLoadingGlobalCount && globalCheckinCount === 0) ? (
          <div className="flex justify-center items-center h-28">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-pulse"></div>
              <div className="absolute inset-2 rounded-full border-2 border-dashed border-emerald-400 animate-spin"></div>
              <div className="absolute inset-4 rounded-full border-2 border-emerald-300/60"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FaLeaf className="text-emerald-400 text-xl animate-pulse" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center relative z-10">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center border border-emerald-200 dark:border-emerald-700/30 shadow-inner">
                {globalCheckinCount > 0 ? (
                  <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-300">{formatNumber(globalCheckinCount)}</span>
                ) : (
                  <div className="text-lg font-medium text-emerald-600 dark:text-emerald-300 text-center">
                    <span className="animate-pulse">Loading...</span>
                  </div>
                )}
                <div className="absolute inset-0 rounded-full animate-pulse opacity-30" style={{ 
                  background: 'radial-gradient(circle at center, #0d9488 0%, transparent 70%)'
                }}></div>
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 bg-white dark:bg-black/80 rounded-full flex items-center justify-center shadow-md border-2 border-teal-500">
                <span className="text-white font-bold text-xs">🌍</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-emerald-300/70 mt-3">Worldwide GM Count</p>
            <p className="mt-1 text-xs text-teal-600 dark:text-teal-400/80 text-center w-full">Growing community on Tea Protocol</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default StatsCard;