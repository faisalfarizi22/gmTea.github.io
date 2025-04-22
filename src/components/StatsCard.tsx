import React from 'react';
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
      <div className="card overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-bl-full z-0"></div>
        <div className="absolute top-2 right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center z-10">
          <FaLeaf className="text-white text-xs" />
        </div>
        
        <h3 className="text-sm font-medium text-gray-500 mb-2 relative z-10">Your Check-ins</h3>
        
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
            <p className="text-sm text-gray-600 mt-3">Your GM Count</p>
            {canCheckin ? (
              <p className="mt-1 text-xs text-green-600 font-medium">Ready for next check-in!</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">Next in: {formatTimeRemaining(timeUntilNextCheckin)}</p>
            )}
          </div>
        )}
      </div>
      
      <div className="card overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-bl-full z-0"></div>
        <div className="absolute top-2 right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center z-10">
          <FaUsers className="text-white text-xs" />
        </div>
        
        <h3 className="text-sm font-medium text-gray-500 mb-2 relative z-10 flex items-center">
          Global Check-ins
          {isLoadingGlobalCount && (
            <FaSync className="ml-2 text-xs text-emerald-500 animate-spin" />
          )}
        </h3>
        
        {isLoading || (isLoadingGlobalCount && globalCheckinCount === 0) ? (
          <div className="flex justify-center items-center h-28">
            <div className="h-16 w-16 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        ) : (
          <div className="flex flex-col items-center relative z-10">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-emerald-100 pulse-ring flex items-center justify-center">
                {globalCheckinCount > 0 ? (
                  <span className="text-3xl font-bold text-emerald-700">{formatNumber(globalCheckinCount)}</span>
                ) : (
                  <div className="text-lg font-medium text-emerald-700 text-center">
                    <span className="animate-pulse">Loading...</span>
                  </div>
                )}
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-xs">🌍</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-3">Worldwide GM Count</p>
            <p className="mt-1 text-xs text-emerald-600 text-center w-full">Growing community on Tea Protocol</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;