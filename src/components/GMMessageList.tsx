import React from 'react';
import { FaLeaf, FaStream, FaGlobe } from 'react-icons/fa';
import { GMMessage } from '@/types';
import { formatAddress, formatTimestamp } from '@/utils/web3';

interface GMMessageListProps {
  messages: GMMessage[];
  isLoading: boolean;
  onRefresh?: () => Promise<void>;
}

const GMMessageList: React.FC<GMMessageListProps> = ({ 
  messages, 
  isLoading, 
  onRefresh 
}) => {
  const sortedMessages = [...messages].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="card h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center text-emerald-700 dark:text-emerald-300">
          <FaStream className="mr-2 text-emerald-500" />
          Recent GMs
        </h3>
        <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs">
          <FaGlobe className="text-emerald-500 text-xs" />
          <span>Live</span>
        </div>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-emerald-50 dark:border-gray-700 shadow-sm">
              <div className="flex justify-between">
                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-3"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {sortedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
                <FaLeaf className="text-2xl text-emerald-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-center">No messages yet. Be the first to say GM!</p>
              {onRefresh && (
                <button 
                  onClick={onRefresh}
                  className="mt-4 btn-secondary text-sm px-3 py-1.5"
                >
                  Refresh Messages
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {sortedMessages.map((message, index) => (
                <div 
                  key={index} 
                  className="gm-message group hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-200"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <div className="h-2 w-2 bg-emerald-500 rounded-full mr-2"></div>
                      <span className="font-medium text-emerald-700 dark:text-emerald-300">
                        {formatAddress(message.user)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  
                  <p className="mt-2 text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                    {message.message || 'GM!'}
                  </p>
                  
                  {/* Animated underline on hover */}
                  <div className="h-0.5 w-0 bg-emerald-500 mt-2 group-hover:w-full transition-all duration-500"></div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      
      {/* Footer with refresh indicator */}
      {!isLoading && sortedMessages.length > 0 && onRefresh && (
        <div className="flex items-center justify-center mt-4 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button 
            onClick={onRefresh}
            className="text-xs text-gray-500 dark:text-gray-400 flex items-center hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
          >
            <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full mr-1 animate-pulse"></div>
            Refresh Messages
          </button>
        </div>
      )}
    </div>
  );
};

export default GMMessageList;