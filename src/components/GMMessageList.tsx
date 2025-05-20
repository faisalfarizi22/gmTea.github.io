import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaLeaf, FaStream, FaGlobe, FaSpinner, FaSync } from 'react-icons/fa';
import { GMMessage } from '@/types';
import { formatAddress, formatTimestamp } from '@/utils/web3';
import ChatMessage from "@/components/chat/ChatMessage";
import { getUserHighestTier, checkUsername, registerUsernameUpdateCallback, registerTierUpdateCallback } from "@/utils/badgeWeb3";
import { cacheData, getCachedData } from '@/utils/socialBenefitsUtils';
import ColoredUsername from './user/ColoredUsername';

interface GMMessageListProps {
  messages: GMMessage[];
  isLoading: boolean;
  onRefresh?: () => Promise<void>;
}
interface MessageItem {
  user: string;
  message: string;
  timestamp: number;
}

const GMMessageList: React.FC<GMMessageListProps> = ({ 
  messages, 
  isLoading, 
  onRefresh 
}) => {
  const sortedMessages = [...messages].sort((a, b) => b.timestamp - a.timestamp);
  const [userTiers, setUserTiers] = useState<Record<string, number>>({});
  const [usernames, setUsernames] = useState<Record<string, string | null>>({});
  
  const getAvatarUrl = (address: string) => `https://api.dicebear.com/6.x/identicon/svg?seed=${address}`;


  const useBadgeTier = (address: string | null) => {
    const [tier, setTier] = useState<number>(-1);
    
    useEffect(() => {
      if (!address) return;
      
      // Get initial tier
      const fetchTier = async () => {
        const initialTier = await getUserHighestTier(address);
        setTier(initialTier);
      };
      
      fetchTier();
      
      // Register callback untuk update tier
      const unregister = registerTierUpdateCallback((updatedAddress, updatedTier) => {
        if (updatedAddress === address) {
          setTier(updatedTier);
        }
      });
      
      return () => {
        // Unregister callback when component unmounts
        unregister();
      };
    }, [address]);
    
    return tier;
  };
  
  // Hook kustom untuk menggunakan username dengan update otomatis
  const useUsername = (address: string | null) => {
    const [username, setUsername] = useState<string | null>(null);
    
    useEffect(() => {
      if (!address) return;
      
      // Get initial username
      const fetchUsername = async () => {
        const initialUsername = await checkUsername(address);
        setUsername(initialUsername);
      };
      
      fetchUsername();
      
      // Register callback untuk update username
      const unregister = registerUsernameUpdateCallback((updatedAddress, updatedUsername) => {
        if (updatedAddress === address) {
          setUsername(updatedUsername);
        }
      });
      
      return () => {
        // Unregister callback when component unmounts
        unregister();
      };
    }, [address]);
    
    return username;
  };
  
  // Gunakan hook dalam komponen
  const MessageItem = ({ message }: { message: MessageItem }) => {
  const tier = useBadgeTier(message.user);
  const username = useUsername(message.user);
    
    // Render dengan tier dan username
    return (
      <div>
        {username ? (
          <ColoredUsername username={username} badgeTier={tier} />
        ) : (
          <span>{formatAddress(message.user)}</span>
        )}
        <p>{message.message}</p>
      </div>
    );
  };
  
  // Load user data for all message senders
  useEffect(() => {
    let isMounted = true;
    const pendingRequests: Record<string, boolean> = {}; // Track active requests to avoid duplicates
    
    const loadUserData = async () => {
      if (messages.length === 0) return;
      
      // Use existing states as starting point to avoid flickering
      const currentTiers = { ...userTiers };
      const currentUsernames = { ...usernames };
      
      // Unique addresses to check
      const uniqueAddresses = Array.from(new Set(messages.map(msg => msg.user)));
      
      // Function to safely fetch user tier
      const fetchUserTier = async (address: string) => {
        // Skip if already checking this address
        if (pendingRequests[`tier_${address}`]) return null;
        pendingRequests[`tier_${address}`] = true;
        
        try {
          // Langsung gunakan hasil yang sudah ada jika tersedia
          if (currentTiers[address] !== undefined) return { address, tier: currentTiers[address] };
          
          // Try to get tier with error handling
          const tier = await getUserHighestTier(address)
            .catch(error => {
              console.warn(`Error fetching tier for ${address}:`, error);
              return -1;
            });
            
          return { address, tier };
        } catch (error) {
          console.error(`Failed to fetch tier for ${address}:`, error);
          return { address, tier: -1 };
        } finally {
          pendingRequests[`tier_${address}`] = false;
        }
      };
      
      // Function to safely fetch username
      const fetchUsername = async (address: string) => {
        // Skip if already checking this address
        if (pendingRequests[`username_${address}`]) return null;
        pendingRequests[`username_${address}`] = true;
        
        try {
          // Langsung gunakan hasil yang sudah ada jika tersedia
          if (currentUsernames[address] !== undefined) return { address, username: currentUsernames[address] };
          
          // Try to get username with error handling
          const username = await checkUsername(address)
            .catch(error => {
              console.warn(`Error fetching username for ${address}:`, error);
              return null;
            });
            
          return { address, username };
        } catch (error) {
          console.error(`Failed to fetch username for ${address}:`, error);
          return { address, username: null };
        } finally {
          pendingRequests[`username_${address}`] = false;
        }
      };
      
      // Process a few addresses at a time to avoid overwhelming the RPC
      const BATCH_SIZE = 5;
      
      for (let i = 0; i < uniqueAddresses.length; i += BATCH_SIZE) {
        if (!isMounted) break;
        
        const batch = uniqueAddresses.slice(i, i + BATCH_SIZE);
        
        // Process batch of addresses
        const tierPromises = batch.map(fetchUserTier);
        const usernamePromises = batch.map(fetchUsername);
        
        // Wait for current batch to complete
        const [tierResults, usernameResults] = await Promise.all([
          Promise.all(tierPromises),
          Promise.all(usernamePromises)
        ]);
        
        if (!isMounted) break;
        
        // Update state with batch results
        const newTiers = { ...currentTiers };
        tierResults.filter(Boolean).forEach(result => {
          if (result) newTiers[result.address] = result.tier;
        });
        
        const newUsernames = { ...currentUsernames };
        usernameResults.filter(Boolean).forEach(result => {
          if (result) newUsernames[result.address] = result.username;
        });
        
        setUserTiers(newTiers);
        setUsernames(newUsernames);
        
        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < uniqueAddresses.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    };
    
    loadUserData();
    
    return () => {
      isMounted = false;
    };
  }, [messages]);

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
                  const badgeTier = userTiers[message.user] ?? -1;
                  const username = usernames[message.user] ?? null;
                  
                  return (
                    <motion.div 
                      key={`${message.user}-${message.timestamp}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      {/* Use try-catch untuk menghindari crash jika komponen gagal render */}
                      {(() => {
                        try {
                          return (
                            <ChatMessage
                              message={message.message || 'GM!'}
                              username={username}
                              userAddress={message.user}
                              avatarUrl={getAvatarUrl(message.user)}
                              badgeTier={badgeTier}
                              timestamp={message.timestamp}
                            />
                          );
                        } catch (error) {
                          console.error("Error rendering ChatMessage:", error);
                          // Fallback rendering jika ChatMessage gagal
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
      
      {/* Footer with refresh indicator */}
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
    </div>
  );
};

export default GMMessageList;