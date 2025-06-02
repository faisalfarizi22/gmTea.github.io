import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaLeaf, FaStream, FaGlobe, FaSpinner, FaSync } from 'react-icons/fa';
import { GMMessage } from '@/types';
import { formatAddress, formatTimestamp } from '@/utils/web3';
import ChatMessage from "@/components/chat/ChatMessage";
import { getUserSocialBenefits, getTierName, processMessageEmotes } from '@/utils/socialBenefitsUtils';
import { BADGE_TIERS } from '@/utils/constants';
import { useUserDataCombined } from '@/hooks/useUserData';

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
  
  const [usersData, setUsersData] = useState<Record<string, {
    highestTier: number,
    username: string | null,
    tierName: string
  }>>({});
  
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
 
  const uniqueAddresses = React.useMemo(() => {
    return Array.from(new Set(sortedMessages.map(msg => msg.user)));
  }, [sortedMessages]);
  
  useEffect(() => {
    if (!uniqueAddresses.length) return;
    
    const addressesToFetch = uniqueAddresses.filter(addr => !usersData[addr]);
    if (!addressesToFetch.length) return;
    
    async function fetchUserData() {
      setLoadingUsers(true);
      const newUsersData = { ...usersData };
      
      const batchSize = 3;
      
      for (let i = 0; i < addressesToFetch.length; i += batchSize) {
        const batch = addressesToFetch.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (address) => {
          try {
            const response = await fetch(`/api/users/${address}`);
            if (!response.ok) {
              throw new Error(`User API error: ${response.status}`);
            }
            
            const userData = await response.json();
            
            newUsersData[address] = {
              highestTier: userData.user?.highestBadgeTier ?? -1,
              username: userData.user?.username || null,
              tierName: getTierName(userData.user?.highestBadgeTier ?? -1)
            };
          } catch (error) {
            console.error(`Error fetching data for ${address}:`, error);
            newUsersData[address] = {
              highestTier: -1,
              username: null,
              tierName: 'None'
            };
          }
        }));
        
        if (i + batchSize < addressesToFetch.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      setUsersData(newUsersData);
      setLoadingUsers(false);
    }
    
    fetchUserData();
  }, [uniqueAddresses, usersData]);
  
  const getAvatarUrl = (address: string) => 
    `https://api.dicebear.com/6.x/identicon/svg?seed=${address}`;

  return (
    <div className="bg-white dark:bg-black/80 backdrop-blur-lg rounded-xl border border-gray-200 dark:border-emerald-700/30 shadow-lg p-6">
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
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="p-4 rounded-xl bg-white dark:bg-gray-800/30 border border-emerald-50 dark:border-emerald-800/30 shadow-sm"
            >
              <div className="flex justify-between">
                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700/50 rounded animate-pulse"></div>
                <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700/50 rounded animate-pulse"></div>
              </div>
              <div className="h-10 w-full bg-gray-200 dark:bg-gray-700/50 rounded animate-pulse mt-3"></div>
            </motion.div>
          ))}
        </div>
      ) : (
        <>
          {sortedMessages.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center py-10"
            >
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-pulse"></div>
                <div className="absolute inset-2 rounded-full border-2 border-dashed border-emerald-400 animate-spin"></div>
                <div className="absolute inset-4 rounded-full border-2 border-emerald-300/60"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <FaLeaf className="text-2xl text-emerald-500" />
                </div>
              </div>
              <p className="text-gray-500 dark:text-emerald-300/70 text-center font-medium">No messages yet. Be the first to say GM!</p>
              {onRefresh && (
                <button 
                  onClick={onRefresh}
                  className="mt-4 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 text-emerald-700 dark:text-emerald-300 rounded-lg transition-colors text-sm shadow-sm border border-emerald-200 dark:border-emerald-700/30 flex items-center"
                >
                  <FaSync className="mr-2 h-3 w-3" />
                  Refresh Messages
                </button>
              )}
            </motion.div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-hide">
              <AnimatePresence>
                {sortedMessages.map((message, index) => {
                  const userData = usersData[message.user] || {
                    highestTier: -1,
                    username: null,
                    tierName: 'None'
                  };
                  
                  const userHighestTier = userData.highestTier;
                  const username = userData.username;
                  
                  const benefits = getUserSocialBenefits(userHighestTier);
                  
                  const processedMessage = benefits.chatEmotes 
                    ? processMessageEmotes(message.message || 'GM!', userHighestTier)
                    : message.message || 'GM!';
                  
                  let tierColor = '';
                  if (userHighestTier >= 0 && userHighestTier <= 4) {
                    const tierKey = Object.keys(BADGE_TIERS).find(
                      key => BADGE_TIERS[key as keyof typeof BADGE_TIERS].id === userHighestTier
                    );
                    
                    if (tierKey) {
                      tierColor = BADGE_TIERS[tierKey as keyof typeof BADGE_TIERS].color;
                    }
                  }
                  
                  return (
                    <motion.div 
                      key={`${message.user}-${message.timestamp}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      {(() => {
                        try {
                          return (
                            <ChatMessage
                              message={message.message || 'GM!'}
                              username={username}
                              userAddress={message.user}
                              avatarUrl={getAvatarUrl(message.user)}
                              badgeTier={userHighestTier}
                              timestamp={message.timestamp}
                            />
                          );
                        } catch (error) {
                          console.error("Error rendering ChatMessage:", error);
                        
                          return (
                            <div className="p-4 rounded-xl bg-white dark:bg-gray-800/30 border border-emerald-50 dark:border-emerald-800/30 shadow-sm">
                              <div className="flex justify-between">
                                <span className="text-sm text-emerald-700 dark:text-emerald-300">
                                  {formatAddress(message.user)}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-emerald-400/50">
                                  {formatTimestamp(message.timestamp)}
                                </span>
                              </div>
                              <p className="mt-2 text-gray-700 dark:text-emerald-200/80">
                                {message.message || 'GM!'}
                              </p>
                            </div>
                          );
                        }
                      })()}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
      
      {!isLoading && sortedMessages.length > 0 && onRefresh && (
        <div className="flex items-center justify-center mt-4 pt-2 border-t border-gray-100 dark:border-emerald-800/30">
          <button 
            onClick={onRefresh}
            className="text-xs text-gray-500 dark:text-emerald-400/70 flex items-center hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors"
          >
            <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full mr-1 animate-pulse"></div>
            Refresh Messages
          </button>
        </div>
      )}
      
      {loadingUsers && (
        <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 text-center">
          Loading user data...
        </div>
      )}
    </div>
  );
};

export default GMMessageList;