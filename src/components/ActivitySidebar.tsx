import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { FaTimes, FaSpinner, FaRedo, FaFilter, FaCheck } from 'react-icons/fa';
import { 
  MdOutlineLocalActivity, 
  MdCheckCircle, 
  MdSend, 
  MdOutlineVerified, 
  MdCelebration 
} from 'react-icons/md';
import { getProvider, formatAddress } from '@/utils/web3';
import { 
  CONTRACT_ADDRESS, 
  BADGE_CONTRACT_ADDRESS, 
  USERNAME_REGISTRY_ADDRESS,
  REFERRAL_CONTRACT_ADDRESS,
  DEPLOY_BLOCK,
  MESSAGE_CONTRACT_ADDRESS
} from '@/utils/constants';
import GMOnchainABI from '../abis/GMOnchainABI.json';
import GMTeaBadgeABI from '../abis/GMTeaBadgeABI.json';
import GMTeaReferralABI from '../abis/GMTeaReferralABI.json';
import GMTeaUsernameABI from '../abis/GMTeaUsernameABI.json';

interface ActivitySidebarProps {
  address: string;
  onClose: () => void;
}

// Define activity types
type ActivityType = 'checkin' | 'badge' | 'username' | 'message' | 'reward' | 'all';

// Define interface for blockchain activity
interface BlockchainActivity {
  id: string;
  date: string;
  timestamp: number;
  title: string;
  subtitle?: string;
  txHash: string;
  iconSeed: string;
  type: ActivityType;
  complete: boolean;
  iconColor?: string;
  blockNumber: number;
}

// Function to get avatar URL using DiceBear
const getAvatarUrl = (seed: string): string =>
  `https://api.dicebear.com/6.x/identicon/svg?seed=${seed}`;

// Function to format block timestamp
const formatBlockTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("en-US", { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Function to get readable time from timestamp
const getReadableTime = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString("en-US", {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Function to get time elapsed since timestamp
const getTimeElapsed = (timestamp: number): string => {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return `${Math.floor(diff / 604800)} weeks ago`;
};

// Function to get activity icon component based on type
const getActivityIcon = (type: ActivityType) => {
  switch (type) {
    case 'checkin':
      return <MdCheckCircle />;
    case 'badge':
      return <MdOutlineVerified />;
    case 'username':
      return <MdOutlineLocalActivity />;
    case 'message':
      return <MdSend />;
    case 'reward':
      return <MdCelebration />;
    default:
      return <MdCheckCircle />;
  }
};

// Function to get color for activity type
const getActivityColor = (type: ActivityType): string => {
  switch (type) {
    case 'checkin':
      return 'bg-emerald-500';
    case 'badge':
      return 'bg-purple-500';
    case 'username':
      return 'bg-blue-500';
    case 'message':
      return 'bg-yellow-500';
    case 'reward':
      return 'bg-pink-500';
    default:
      return 'bg-gray-500';
  }
};

// Create a local storage cache helper
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes cache

const getCachedActivities = (address: string): BlockchainActivity[] | null => {
  try {
    const key = `activity_cache_${address.toLowerCase()}`;
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRY) return null;
    
    return data;
  } catch (e) {
    console.error("Error reading cache:", e);
    return null;
  }
};

const setCachedActivities = (address: string, activities: BlockchainActivity[]): void => {
  try {
    const key = `activity_cache_${address.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify({
      data: activities,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error("Error writing to cache:", e);
  }
};

const ActivitySidebar: React.FC<ActivitySidebarProps> = ({ address, onClose }) => {
  const [activities, setActivities] = useState<BlockchainActivity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<BlockchainActivity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ActivityType>('all');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [displayCount, setDisplayCount] = useState<number>(0);

  // Function to get all transaction receipts for a user
  const fetchUserTransactions = async (userAddress: string, provider: ethers.providers.Provider, range: number = 30000): Promise<ethers.providers.TransactionReceipt[]> => {
    try {
      // Get current block
      const currentBlock = await provider.getBlockNumber();
      
      // Calculate start block - look back around 5 days of blocks or use deploy block
      const startBlock = Math.max(currentBlock - range, DEPLOY_BLOCK);
      
      console.log(`Fetching transactions from block ${startBlock} to ${currentBlock}`);
      
      // Create array of block ranges to check (in chunks)
      const CHUNK_SIZE = 2000;
      const blockRanges = [];
      for (let i = startBlock; i < currentBlock; i += CHUNK_SIZE) {
        blockRanges.push({
          fromBlock: i,
          toBlock: Math.min(i + CHUNK_SIZE - 1, currentBlock)
        });
      }
      
      // This will hold all transactions we find
      const transactions: ethers.providers.TransactionReceipt[] = [];
      
      // Check each block range
      for (const range of blockRanges) {
        try {
          // First get all logs to the main contract
          const filters = [
            CONTRACT_ADDRESS, 
            BADGE_CONTRACT_ADDRESS,
            USERNAME_REGISTRY_ADDRESS,
            REFERRAL_CONTRACT_ADDRESS
          ].map(address => ({
            address,
            fromBlock: range.fromBlock,
            toBlock: range.toBlock
          }));
          
          let logs: ethers.providers.Log[] = [];
          for (const filter of filters) {
            const result = await provider.getLogs(filter);
            logs = [...logs, ...result];
          }
          
          // For each log, get the transaction receipt if it's from our user
          const receiptsToCheck: string[] = [];
          for (const log of logs) {
            if (!receiptsToCheck.includes(log.transactionHash)) {
              receiptsToCheck.push(log.transactionHash);
            }
          }
          
          // Now get transaction for each hash and check sender
          for (const txHash of receiptsToCheck) {
            try {
              // First get the transaction to see sender
              const tx = await provider.getTransaction(txHash);
              
              // If this is from our user, get the full receipt
              if (tx && tx.from && tx.from.toLowerCase() === userAddress.toLowerCase()) {
                const receipt = await provider.getTransactionReceipt(txHash);
                if (receipt) {
                  transactions.push(receipt);
                }
              }
            } catch (err) {
              console.error(`Error checking transaction ${txHash}:`, err);
            }
          }
          
          console.log(`Found ${transactions.length} transactions from user so far`);
          
          // If we have a good number of transactions, we can stop
          if (transactions.length >= 50) {
            console.log("Found enough transactions, stopping search");
            break;
          }
        } catch (rangeErr) {
          console.error(`Error processing range ${range.fromBlock}-${range.toBlock}:`, rangeErr);
        }
      }
      
      return transactions;
    } catch (err) {
      console.error("Error fetching user transactions:", err);
      return [];
    }
  };

  // Function to fetch on-chain activities from blockchain
  const fetchOnchainActivities = async (userAddress: string): Promise<BlockchainActivity[]> => {
    if (!userAddress) return [];
    
    setIsLoading(true);
    setError(null);
    setRefreshing(true);
    
    try {
      // Check cache first
      const cached = getCachedActivities(userAddress);
      if (cached) {
        console.log("Using cached activities");
        return cached;
      }
      
      const provider = getProvider();
      if (!provider) {
        throw new Error("No provider available");
      }
      
      // All activities we've found
      const allActivities: BlockchainActivity[] = [];
      
      // Get checkin count directly from contract first - this is fast
      let checkinCount = 0;
      try {
        const contract = new ethers.Contract(CONTRACT_ADDRESS, GMOnchainABI, provider);
        const count = await contract.getCheckinCount(userAddress);
        checkinCount = count.toNumber();
        setDisplayCount(checkinCount);
        console.log(`User has ${checkinCount} check-ins according to contract`);
      } catch (err) {
        console.error("Error getting checkin count:", err);
      }
      
      // Fetch user's transactions
      const receipts = await fetchUserTransactions(userAddress, provider);
      console.log(`Found ${receipts.length} transaction receipts`);
      
      // Process each receipt to identify activity type and extract details
      for (const receipt of receipts) {
        try {
          const { logs, transactionHash, blockNumber } = receipt;
          
          // Get block for timestamp
          const block = await provider.getBlock(blockNumber);
          
          // Check which contract was involved
          for (const log of logs) {
            const logAddress = log.address.toLowerCase();
            
            // Check-in events
            if (logAddress === CONTRACT_ADDRESS.toLowerCase()) {
              // Check for CheckinCompleted event
              // event CheckinCompleted(address indexed user, uint256 timestamp, string message, uint256 count);
              const checkinTopic = ethers.utils.id("CheckinCompleted(address,uint256,string,uint256)");
              
              if (log.topics[0] === checkinTopic) {
                // This is a check-in event
                let message = "";
                try {
                  const checkinContract = new ethers.Contract(CONTRACT_ADDRESS, GMOnchainABI, provider);
                  const parsedLog = checkinContract.interface.parseLog(log);
                  
                  if (parsedLog.args && parsedLog.args.message) {
                    message = parsedLog.args.message;
                    if (message.length > 30) {
                      message = message.substring(0, 30) + "...";
                    }
                  }
                } catch (e) {
                  console.error("Error parsing check-in log:", e);
                }
                
                allActivities.push({
                  id: `checkin-${transactionHash}`,
                  date: formatBlockTimestamp(block.timestamp),
                  timestamp: block.timestamp,
                  title: "Daily Check-in",
                  subtitle: message || `Check-in at block ${blockNumber}`,
                  txHash: transactionHash,
                  iconSeed: `checkin-${blockNumber}`,
                  type: 'checkin',
                  complete: true,
                  iconColor: getActivityColor('checkin'),
                  blockNumber
                });
                
                // We found what we need from this log
                break;
              }
            }
            
            // Badge minting events
            else if (logAddress === BADGE_CONTRACT_ADDRESS.toLowerCase()) {
              // Check for BadgeMinted event
              // event BadgeMinted(address indexed to, uint256 tokenId, BadgeTier tier, address referrer);
              const badgeTopic = ethers.utils.id("BadgeMinted(address,uint256,uint8,address)");
              
              if (log.topics[0] === badgeTopic) {
                // This is a badge mint event
                let tokenId = 0;
                let tier = 0;
                
                try {
                  const badgeContract = new ethers.Contract(BADGE_CONTRACT_ADDRESS, GMTeaBadgeABI, provider);
                  const parsedLog = badgeContract.interface.parseLog(log);
                  
                  if (parsedLog.args) {
                    tokenId = parsedLog.args.tokenId ? parsedLog.args.tokenId.toNumber() : 0;
                    tier = parsedLog.args.tier !== undefined ? parsedLog.args.tier : 0;
                  }
                } catch (e) {
                  console.error("Error parsing badge log:", e);
                }
                
                const tierNames = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
                const tierName = tierNames[tier] || `Tier ${tier}`;
                
                allActivities.push({
                  id: `badge-${transactionHash}`,
                  date: formatBlockTimestamp(block.timestamp),
                  timestamp: block.timestamp,
                  title: `Mint ${tierName} Badge`,
                  subtitle: `Token ID: ${tokenId}`,
                  txHash: transactionHash,
                  iconSeed: `badge-${tier}-${tokenId}`,
                  type: 'badge',
                  complete: true,
                  iconColor: getActivityColor('badge'),
                  blockNumber
                });
                
                // We found what we need from this log
                break;
              }
            }
            
            // Username registration events
            else if (logAddress === USERNAME_REGISTRY_ADDRESS.toLowerCase()) {
              // Check for UsernameRegistered event
              // event UsernameRegistered(address indexed user, string username);
              const usernameTopic = ethers.utils.id("UsernameRegistered(address,string)");
              const usernameChangeTopic = ethers.utils.id("UsernameChanged(address,string,string)");
              
              if (log.topics[0] === usernameTopic) {
                // This is a username registration event
                let username = "Username";
                
                try {
                  const usernameContract = new ethers.Contract(USERNAME_REGISTRY_ADDRESS, GMTeaUsernameABI, provider);
                  const parsedLog = usernameContract.interface.parseLog(log);
                  
                  if (parsedLog.args && parsedLog.args.username) {
                    username = parsedLog.args.username;
                  }
                } catch (e) {
                  console.error("Error parsing username log:", e);
                  
                  // Fallback: try to get current username
                  try {
                    const usernameContract = new ethers.Contract(USERNAME_REGISTRY_ADDRESS, GMTeaUsernameABI, provider);
                    const currentUsername = await usernameContract.getUsernameByAddress(userAddress);
                    if (currentUsername) {
                      username = currentUsername;
                    }
                  } catch (nameError) {
                    console.error("Error getting current username:", nameError);
                  }
                }
                
                allActivities.push({
                  id: `username-${transactionHash}`,
                  date: formatBlockTimestamp(block.timestamp),
                  timestamp: block.timestamp,
                  title: "Username Registered",
                  subtitle: username,
                  txHash: transactionHash,
                  iconSeed: `username-${blockNumber}`,
                  type: 'username',
                  complete: true,
                  iconColor: getActivityColor('username'),
                  blockNumber
                });
                
                // We found what we need from this log
                break;
              }
              else if (log.topics[0] === usernameChangeTopic) {
                // This is a username change event
                let oldUsername = "Previous Username";
                let newUsername = "New Username";
                
                try {
                  const usernameContract = new ethers.Contract(USERNAME_REGISTRY_ADDRESS, GMTeaUsernameABI, provider);
                  const parsedLog = usernameContract.interface.parseLog(log);
                  
                  if (parsedLog.args) {
                    oldUsername = parsedLog.args.oldUsername || oldUsername;
                    newUsername = parsedLog.args.newUsername || newUsername;
                  }
                } catch (e) {
                  console.error("Error parsing username change log:", e);
                }
                
                allActivities.push({
                  id: `username-change-${transactionHash}`,
                  date: formatBlockTimestamp(block.timestamp),
                  timestamp: block.timestamp,
                  title: "Username Changed",
                  subtitle: `${oldUsername} → ${newUsername}`,
                  txHash: transactionHash,
                  iconSeed: `username-change-${blockNumber}`,
                  type: 'username',
                  complete: true,
                  iconColor: getActivityColor('username'),
                  blockNumber
                });
                
                // We found what we need from this log
                break;
              }
            }
            
            // Reward events
            else if (logAddress === REFERRAL_CONTRACT_ADDRESS.toLowerCase()) {
              // Check for RewardClaimed event
              // event RewardClaimed(address indexed user, uint256 amount);
              const rewardTopic = ethers.utils.id("RewardClaimed(address,uint256)");
              const referralTopic = ethers.utils.id("ReferralRecorded(address,address)");
              
              if (log.topics[0] === rewardTopic) {
                // This is a reward claim event
                let amount = "0";
                
                try {
                  const referralContract = new ethers.Contract(REFERRAL_CONTRACT_ADDRESS, GMTeaReferralABI, provider);
                  const parsedLog = referralContract.interface.parseLog(log);
                  
                  if (parsedLog.args && parsedLog.args.amount) {
                    amount = ethers.utils.formatEther(parsedLog.args.amount);
                  }
                } catch (e) {
                  console.error("Error parsing reward log:", e);
                }
                
                allActivities.push({
                  id: `reward-${transactionHash}`,
                  date: formatBlockTimestamp(block.timestamp),
                  timestamp: block.timestamp,
                  title: "Claim Rewards",
                  subtitle: `${parseFloat(amount).toFixed(4)} ETH`,
                  txHash: transactionHash,
                  iconSeed: `reward-${blockNumber}`,
                  type: 'reward',
                  complete: true,
                  iconColor: getActivityColor('reward'),
                  blockNumber
                });
                
                // We found what we need from this log
                break;
              }
              else if (log.topics[0] === referralTopic) {
                // This is a referral event
                let referee = ""; 
                let referrer = "";
                
                try {
                  const referralContract = new ethers.Contract(REFERRAL_CONTRACT_ADDRESS, GMTeaReferralABI, provider);
                  const parsedLog = referralContract.interface.parseLog(log);
                  
                  if (parsedLog.args) {
                    referrer = parsedLog.args.referrer || "";
                    referee = parsedLog.args.referee || "";
                  }
                  
                  // Determine if user is referrer or referee
                  const isReferrer = referrer.toLowerCase() === userAddress.toLowerCase();
                  
                  allActivities.push({
                    id: `referral-${transactionHash}`,
                    date: formatBlockTimestamp(block.timestamp),
                    timestamp: block.timestamp,
                    title: isReferrer ? "Referral Made" : "Referred by",
                    subtitle: isReferrer ? 
                      `You referred ${formatAddress(referee)}` : 
                      `Referred by ${formatAddress(referrer)}`,
                    txHash: transactionHash,
                    iconSeed: `referral-${blockNumber}`,
                    type: 'reward',
                    complete: true,
                    iconColor: getActivityColor('reward'),
                    blockNumber
                  });
                } catch (e) {
                  console.error("Error parsing referral log:", e);
                }
                
                // We found what we need from this log
                break;
              }
            }
          }
        } catch (txError) {
          console.error("Error processing transaction:", txError);
        }
      }
      
      // If we found fewer check-ins than the contract reports, add placeholders
      if (checkinCount > allActivities.filter(a => a.type === 'checkin').length) {
        const missingCount = checkinCount - allActivities.filter(a => a.type === 'checkin').length;
        console.log(`Adding ${missingCount} placeholder check-ins`);
        
        // Sort the existing check-ins by timestamp
        const existingCheckins = allActivities
          .filter(a => a.type === 'checkin')
          .sort((a, b) => b.timestamp - a.timestamp);
        
        // Get timestamp of the most recent one
        const lastTimestamp = existingCheckins.length > 0 
          ? existingCheckins[0].timestamp 
          : Math.floor(Date.now() / 1000);
        
        // Add a placeholder for each missing check-in, with reasonable timestamps
        for (let i = 0; i < missingCount; i++) {
          // Assume one check-in per day, starting from the day after the most recent
          const timestamp = lastTimestamp - ((i + 1) * 86400);
          
          allActivities.push({
            id: `placeholder-checkin-${i}`,
            date: formatBlockTimestamp(timestamp),
            timestamp: timestamp,
            title: "Daily Check-in",
            subtitle: "Details not available",
            txHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
            iconSeed: `placeholder-${i}`,
            type: 'checkin',
            complete: true,
            iconColor: getActivityColor('checkin'),
            blockNumber: 0
          });
        }
      }
      
      // Sort all activities by timestamp (newest first)
      const sortedActivities = allActivities.sort((a, b) => b.timestamp - a.timestamp);
      
      // Cache results for next time
      setCachedActivities(userAddress, sortedActivities);
      
      return sortedActivities;
    } catch (error) {
      console.error("Error fetching on-chain activities:", error);
      setError("Failed to load on-chain activities. Please try again.");
      return [];
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Filter activities based on selected type
  const filterActivities = (type: ActivityType) => {
    setActiveFilter(type);
    if (type === 'all') {
      setFilteredActivities(activities);
    } else {
      setFilteredActivities(activities.filter(activity => activity.type === type));
    }
  };

  // Refresh activities
  const refreshActivities = () => {
    setRefreshing(true);
    fetchOnchainActivities(address).then(newActivities => {
      setActivities(newActivities);
      filterActivities(activeFilter);
    });
  };

  // Fetch activities when the component mounts or address changes
  useEffect(() => {
    if (address) {
      // Try to use cache first for immediate display
      const cached = getCachedActivities(address);
      if (cached) {
        setActivities(cached);
        setFilteredActivities(cached);
        setIsLoading(false);
        
        // Still refresh in the background
        fetchOnchainActivities(address).then(newActivities => {
          if (newActivities.length > 0) {
            setActivities(newActivities);
            setFilteredActivities(
              activeFilter === 'all' 
                ? newActivities 
                : newActivities.filter(a => a.type === activeFilter)
            );
          }
        });
      } else {
        // No cache, fetch fresh
        fetchOnchainActivities(address).then(newActivities => {
          setActivities(newActivities);
          setFilteredActivities(newActivities);
        });
      }
      
      // Add timeout to prevent infinite loading
      const loadingTimeout = setTimeout(() => {
        if (isLoading) {
          setIsLoading(false);
          if (activities.length === 0) {
            setError("Loading timed out. Try refreshing.");
          }
        }
      }, 15000);
      
      return () => clearTimeout(loadingTimeout);
    }
  }, [address]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      
      {/* Sidebar Content */}
      <div className="relative w-full max-w-md h-full bg-gradient-to-b from-gray-900 to-black shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm z-10">
          {/* Header */}
          <div className="flex justify-between items-center p-6">
            <div>
              <h2 className="text-xl font-medium text-white flex items-center gap-2">
                <MdOutlineLocalActivity className="text-emerald-400" />
                Onchain Activity
              </h2>
              {displayCount > 0 && (
                <div className="text-gray-400 text-sm mt-1">
                  {displayCount} check-ins recorded
                </div>
              )}
            </div>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <FaTimes />
            </button>
          </div>
          
          {/* Activity filters */}
          {!isLoading && activities.length > 0 && (
            <div className="px-6 pb-4 flex items-center space-x-2 overflow-x-auto scrollbar-hide">
              <button 
                onClick={() => filterActivities('all')}
                className={`px-3 py-1 rounded-full text-xs flex items-center space-x-1 whitespace-nowrap transition-all ${
                  activeFilter === 'all' 
                    ? 'bg-gray-800 text-white' 
                    : 'bg-gray-800/50 text-gray-400'
                }`}
              >
                <span>All</span>
              </button>
              <button 
                onClick={() => filterActivities('checkin')}
                className={`px-3 py-1 rounded-full text-xs flex items-center space-x-1 whitespace-nowrap transition-all ${
                  activeFilter === 'checkin' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-gray-800/50 text-gray-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Check-ins</span>
              </button>
              <button 
                onClick={() => filterActivities('badge')}
                className={`px-3 py-1 rounded-full text-xs flex items-center space-x-1 whitespace-nowrap transition-all ${
                  activeFilter === 'badge' 
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                    : 'bg-gray-800/50 text-gray-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                <span>Badges</span>
              </button>
              <button 
                onClick={() => filterActivities('username')}
                className={`px-3 py-1 rounded-full text-xs flex items-center space-x-1 whitespace-nowrap transition-all ${
                  activeFilter === 'username' 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                    : 'bg-gray-800/50 text-gray-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>Usernames</span>
              </button>
              <button 
                onClick={() => filterActivities('message')}
                className={`px-3 py-1 rounded-full text-xs flex items-center space-x-1 whitespace-nowrap transition-all ${
                  activeFilter === 'message' 
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                    : 'bg-gray-800/50 text-gray-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                <span>Messages</span>
              </button>
              <button 
                onClick={() => filterActivities('reward')}
                className={`px-3 py-1 rounded-full text-xs flex items-center space-x-1 whitespace-nowrap transition-all ${
                  activeFilter === 'reward' 
                    ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' 
                    : 'bg-gray-800/50 text-gray-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                <span>Rewards</span>
              </button>
              <button 
                onClick={refreshActivities}
                disabled={refreshing}
                className={`ml-auto px-3 py-1 rounded-full text-xs flex items-center space-x-1 bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 transition-all ${
                  refreshing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <FaRedo className={`${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          )}
        </div>
        
        <div className="p-6 pt-0">
          {/* Activity Content */}
          <div>
            {/* Loading state */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <FaSpinner className="text-emerald-500 text-4xl animate-spin mb-4" />
                <p className="text-gray-400">Loading on-chain activities...</p>
              </div>
            )}
            
            {/* Error state */}
            {error && !isLoading && (
              <div className="bg-red-900/30 border border-red-800 rounded-md p-4 mx-6 my-4">
                <p className="text-red-400">{error}</p>
                <button 
                  onClick={refreshActivities}
                  className="mt-2 px-4 py-1 bg-red-800 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
            
            {/* Empty state */}
            {!isLoading && !error && activities.length === 0 && (
              <div className="text-center py-12 px-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-800/80 flex items-center justify-center">
                  <MdOutlineLocalActivity className="text-gray-500 text-4xl" />
                </div>
                <p className="text-gray-300 text-lg font-medium mb-2">No on-chain activities found</p>
                <p className="text-gray-400 mb-4">
                  Your activity history will appear here after you interact with GM Tea contracts
                </p>
                <div className="flex flex-col gap-4 max-w-xs mx-auto">
                  <div className="flex items-center gap-3 bg-gray-800/40 p-3 rounded-lg border border-gray-700/50">
                    <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-lg">
                      <MdCheckCircle />
                    </div>
                    <div className="text-left">
                      <p className="text-gray-300">Daily Check-in</p>
                      <p className="text-gray-500 text-sm">Say GM to the community</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-800/40 p-3 rounded-lg border border-gray-700/50">
                    <div className="bg-purple-500/20 text-purple-400 p-2 rounded-lg">
                      <MdOutlineVerified />
                    </div>
                    <div className="text-left">
                      <p className="text-gray-300">Mint Badges</p>
                      <p className="text-gray-500 text-sm">Collect badge NFTs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-800/40 p-3 rounded-lg border border-gray-700/50">
                    <div className="bg-yellow-500/20 text-yellow-400 p-2 rounded-lg">
                      <MdSend />
                    </div>
                    <div className="text-left">
                      <p className="text-gray-300">Send Messages</p>
                      <p className="text-gray-500 text-sm">Interact with community</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={refreshActivities}
                  disabled={refreshing}
                  className="mt-6 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all flex items-center space-x-2 mx-auto"
                >
                  <FaRedo className={`${refreshing ? 'animate-spin' : ''}`} />
                  <span>Check Again</span>
                </button>
              </div>
            )}
            
            {/* Filtered empty state */}
            {!isLoading && !error && activities.length > 0 && filteredActivities.length === 0 && (
              <div className="text-center py-12 px-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/80 flex items-center justify-center">
                  <FaFilter className="text-gray-500 text-2xl" />
                </div>
                <p className="text-gray-400 mb-2">No matching activities</p>
                <p className="text-gray-500 text-sm">
                  Try changing your filter or check back later
                </p>
                <button 
                  onClick={() => filterActivities('all')}
                  className="mt-4 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all mx-auto"
                >
                  Show All Activities
                </button>
              </div>
            )}
            
            {/* Activity list */}
            {!isLoading && !error && filteredActivities.length > 0 && (
              <div className="space-y-6 px-6">
                <div className="flex justify-between items-center">
                  <p className="text-gray-400 text-sm">
                    Showing <span className="text-white">{filteredActivities.length}</span> activities
                  </p>
                </div>
                
                {/* Group activities by date */}
                {Object.entries(
                  filteredActivities.reduce<Record<string, BlockchainActivity[]>>((groups, activity) => {
                    const date = activity.date;
                    if (!groups[date]) groups[date] = [];
                    groups[date].push(activity);
                    return groups;
                  }, {})
                ).map(([date, dateActivities]) => (
                  <div key={date} className="relative">
                    <div className="sticky top-0 text-sm text-gray-400 mb-3 bg-gradient-to-r from-gray-900 to-transparent py-1 z-10">
                      {date}
                    </div>
                    
                    <div className="space-y-4">
                      {dateActivities.map(activity => (
                        <div key={activity.id} 
                          className="flex items-start gap-3 p-4 bg-gray-800/30 hover:bg-gray-800/50 backdrop-blur-sm border border-gray-800/50 transition-all rounded-lg"
                        >
                          {/* Activity icon */}
                          <div className="relative mt-1">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center">
                              {getActivityIcon(activity.type)}
                            </div>
                            {/* Indicator dot */}
                            <div className={`absolute -bottom-1 -right-1.5 ${activity.iconColor || 'bg-emerald-500'} rounded-full w-5 h-5 flex items-center justify-center shadow-lg`}>
                              <FaCheck className="text-white text-xs" />
                            </div>
                          </div>
                          
                          {/* Activity details */}
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <h3 className="text-white font-medium">{activity.title}</h3>
                              <span className="text-xs text-gray-500">{getTimeElapsed(activity.timestamp)}</span>
                            </div>
                            
                            {activity.subtitle && (
                              <p className="text-gray-400 text-sm mt-1">{activity.subtitle}</p>
                            )}
                            
                            <div className="flex justify-between items-center mt-2">
                              <div className="text-xs text-gray-500">
                                {activity.txHash.startsWith('0x0000') ? (
                                  <span>Transaction data not available</span>
                                ) : (
                                  <>
                                    Tx: <a 
                                      href={`https://sepolia.tea.xyz/tx/${activity.txHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:underline"
                                    >
                                      {formatAddress(activity.txHash)}
                                    </a>
                                  </>
                                )}
                              </div>
                              <span className={`text-xs ${
                                activity.type === 'checkin' ? 'text-emerald-400' :
                                activity.type === 'badge' ? 'text-purple-400' :
                                activity.type === 'username' ? 'text-blue-400' :
                                activity.type === 'message' ? 'text-yellow-400' :
                                'text-pink-400'
                              }`}>
                                {activity.type}
                              </span>
                            </div>
                            
                            {activity.blockNumber > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                Block: <a 
                                  href={`https://sepolia.tea.xyz/block/${activity.blockNumber}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline"
                                >
                                  {activity.blockNumber}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivitySidebar;