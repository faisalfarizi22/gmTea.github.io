import React from 'react';
import { formatDistance } from 'date-fns';
import { formatAddress } from '@/utils/web3';
import { FaUser, FaClock, FaComment, FaCircle, FaThumbtack, FaLock } from 'react-icons/fa';

interface ForumListProps {
  threads: any[];
  onThreadClick?: (threadId: number) => void;
  isOverlay?: boolean;
}

const ForumList: React.FC<ForumListProps> = ({ 
  threads, 
  onThreadClick,
  isOverlay = false
}) => {
  if (threads.length === 0) {
    return (
      <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <p className="text-gray-500 dark:text-gray-400">No threads available in this category.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {threads.map((thread) => {
        const ThreadWrapper = ({ children }: { children: React.ReactNode }) => {
          return (
            <div 
              onClick={() => onThreadClick && onThreadClick(thread.id)}
              className="thread-card cursor-pointer shadow-soft"
            >
              {children}
            </div>
          );
        };
        
        // Calculate if thread is "new" (less than 24 hours old)
        const isNew = Date.now() / 1000 - thread.timestamp < 86400;
        
        // Calculate if thread is "hot" (more than 5 messages in the last 48 hours)
        const isHot = thread.messageCount >= 5;
        
        return (
          <ThreadWrapper key={thread.id}>
            <div className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-start">
                {/* Avatar placeholder */}
                <div className="hidden sm:block mr-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-300 font-medium">
                    {thread.creator.substr(2, 2).toUpperCase()}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Status badges */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {!thread.isActive && (
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        <FaLock className="mr-1 h-3 w-3" />
                        Closed
                      </div>
                    )}
                    
                    {thread.isPinned && (
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                        <FaThumbtack className="mr-1 h-3 w-3" />
                        Pinned
                      </div>
                    )}
                    
                    {isNew && (
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        <FaCircle className="mr-1 h-2 w-2" />
                        New
                      </div>
                    )}
                    
                    {isHot && (
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                        <span className="mr-1">🔥</span>
                        Hot
                      </div>
                    )}
                  </div>
                  
                  {/* Thread title */}
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate pr-4">
                    {thread.title}
                  </h3>
                  
                  {/* Thread metadata */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <FaUser className="h-3.5 w-3.5 mr-1 text-gray-400 dark:text-gray-500" />
                      <span>{formatAddress(thread.creator)}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <FaClock className="h-3.5 w-3.5 mr-1 text-gray-400 dark:text-gray-500" />
                      <span>{formatDistance(new Date(thread.timestamp * 1000), new Date(), { addSuffix: true })}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <FaComment className="h-3.5 w-3.5 mr-1 text-gray-400 dark:text-gray-500" />
                      <span>{thread.messageCount} {thread.messageCount === 1 ? 'reply' : 'replies'}</span>
                    </div>
                  </div>
                  
                  {/* Thread preview (if available) */}
                  {thread.previewContent && (
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      {thread.previewContent}
                    </div>
                  )}
                </div>
                
                {/* Activity indicator */}
                {thread.lastActivityTime && (
                  <div className="ml-4 flex-shrink-0 hidden md:block">
                    <div className="text-xs text-right">
                      <div className="text-gray-500 dark:text-gray-400 mb-1">Last activity</div>
                      <div className="font-medium text-emerald-600 dark:text-emerald-400">
                        {formatDistance(new Date(thread.lastActivityTime * 1000), new Date(), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ThreadWrapper>
        );
      })}
    </div>
  );
};

export default ForumList;