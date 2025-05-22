import React, { useState, useEffect } from 'react';
import { 
  FaTimes, 
  FaSpinner, 
  FaRedo, 
  FaFilter, 
  FaCheck,
  FaExpand,
  FaLeaf,
  FaStream,
  FaHistory,
  FaClock,
  FaLink,
  FaChevronRight
} from 'react-icons/fa';
import { 
  MdOutlineLocalActivity, 
  MdCheckCircle, 
  MdSend, 
  MdOutlineVerified, 
  MdCelebration,
  MdClose
} from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import { formatAddress } from '@/utils/web3';
import { useUserBadges, useUserCheckins, useUserData, useUserReferrals } from '@/hooks/useDBData';

interface ActivitySidebarProps {
  address: string;
  onClose: () => void;
}

// Define activity types
type ActivityType = 'checkin' | 'badge' | 'username' | 'referral' | 'all';

// Define interface for activity
interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  subtitle?: string;
  timestamp: string;
  date: string;
  transactionHash: string;
  iconColor: string;
  blockNumber?: number;
}

// Interfaces for API responses (unchanged)
interface CheckinData {
  checkinNumber: number;
  timestamp: string;
  transactionHash: string;
  blockNumber?: number;
  message?: string;
  points?: number;
}

interface BadgeData {
  tokenId: number;
  tier: number;
  tierName: string;
  mintedAt: string;
  transactionHash: string;
  referrer?: string;
}

interface UsernameHistoryData {
  username: string;
  oldUsername?: string;
  timestamp: string;
  transactionHash: string;
}

interface ReferralData {
  referee: string;
  timestamp: string;
  transactionHash: string;
  rewardsClaimed: boolean;
  rewardsAmount: string;
}

interface CheckinsResponse {
  checkins?: CheckinData[];
  stats?: {
    total: number;
  };
}

interface BadgesResponse {
  badges?: BadgeData[];
  stats?: {
    totalBadges: number;
  };
}

interface UserResponse {
  usernameHistory?: UsernameHistoryData[];
  user?: {
    username: string;
  };
}

interface ReferralsResponse {
  referrals?: ReferralData[];
  stats?: {
    total: number;
  };
}

// Function to format timestamp
const formatBlockTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Function to get time elapsed since timestamp
const getTimeElapsed = (timestamp: string): string => {
  const now = Math.floor(Date.now() / 1000);
  const then = Math.floor(new Date(timestamp).getTime() / 1000);
  const diff = now - then;
  
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return `${Math.floor(diff / 604800)} weeks ago`;
};

// Get activity icon component based on type
const getActivityIcon = (type: ActivityType) => {
  switch (type) {
    case 'checkin':
      return <MdCheckCircle className="text-lg" />;
    case 'badge':
      return <MdOutlineVerified className="text-lg" />;
    case 'username':
      return <MdOutlineLocalActivity className="text-lg" />;
    case 'referral':
      return <MdCelebration className="text-lg" />;
    default:
      return <MdCheckCircle className="text-lg" />;
  }
};

// Get color for activity type
const getActivityColor = (type: ActivityType): string => {
  switch (type) {
    case 'checkin':
      return '#10b981'; // emerald-500
    case 'badge':
      return '#8b5cf6'; // purple-500
    case 'username':
      return '#3b82f6'; // blue-500
    case 'referral':
      return '#ec4899'; // pink-500
    default:
      return '#10b981'; // emerald-500
  }
};

// Get gradient colors for activity type
const getActivityGradient = (type: ActivityType): string => {
  switch (type) {
    case 'checkin':
      return 'from-emerald-500 to-emerald-600';
    case 'badge':
      return 'from-purple-500 to-purple-600';
    case 'username':
      return 'from-blue-500 to-blue-600';
    case 'referral':
      return 'from-pink-500 to-pink-600';
    default:
      return 'from-emerald-500 to-emerald-600';
  }
};

// Get lighter color for backgrounds in light mode
const getActivityLightBg = (type: ActivityType): string => {
  switch (type) {
    case 'checkin':
      return 'bg-emerald-50';
    case 'badge':
      return 'bg-purple-50';
    case 'username':
      return 'bg-blue-50';
    case 'referral':
      return 'bg-pink-50';
    default:
      return 'bg-emerald-50';
  }
};

// Get darker color for backgrounds in dark mode
const getActivityDarkBg = (type: ActivityType): string => {
  switch (type) {
    case 'checkin':
      return 'dark:bg-emerald-900/20';
    case 'badge':
      return 'dark:bg-purple-900/20';
    case 'username':
      return 'dark:bg-blue-900/20';
    case 'referral':
      return 'dark:bg-pink-900/20';
    default:
      return 'dark:bg-emerald-900/20';
  }
};

// Get border color for activity type
const getActivityBorder = (type: ActivityType): string => {
  switch (type) {
    case 'checkin':
      return 'border-emerald-200 dark:border-emerald-500/30';
    case 'badge':
      return 'border-purple-200 dark:border-purple-500/30';
    case 'username':
      return 'border-blue-200 dark:border-blue-500/30';
    case 'referral':
      return 'border-pink-200 dark:border-pink-500/30';
    default:
      return 'border-emerald-200 dark:border-emerald-500/30';
  }
};

// Get text color for activity type
const getActivityTextColor = (type: ActivityType): string => {
  switch (type) {
    case 'checkin':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'badge':
      return 'text-purple-600 dark:text-purple-400';
    case 'username':
      return 'text-blue-600 dark:text-blue-400';
    case 'referral':
      return 'text-pink-600 dark:text-pink-400';
    default:
      return 'text-emerald-600 dark:text-emerald-400';
  }
};

// Animation variants
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

const sidebarVariants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } }
};

const listVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      type: 'spring', 
      damping: 25, 
      stiffness: 200 
    }
  }
};

const filterVariants = {
  inactive: { 
    scale: 0.95, 
    opacity: 0.7
  },
  active: { 
    scale: 1, 
    opacity: 1
  }
};

const ActivitySidebar: React.FC<ActivitySidebarProps> = ({ address, onClose }) => {
  const [activeFilter, setActiveFilter] = useState<ActivityType>('all');
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [combinedActivities, setCombinedActivities] = useState<Activity[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Fetch data from our API endpoints using the hooks from useDBData.ts
  const { data: userResponse, isLoading: userLoading, refetch: refetchUser } = useUserData(address);
  const { data: badgesResponse, isLoading: badgesLoading, refetch: refetchBadges } = useUserBadges(address);
  const { data: checkinsResponse, isLoading: checkinsLoading, refetch: refetchCheckins } = useUserCheckins(address);
  const { data: referralsResponse, isLoading: referralsLoading, refetch: refetchReferrals } = useUserReferrals(address);
  
  const isLoading = userLoading || badgesLoading || checkinsLoading || referralsLoading;

  // Filter activities based on selected type
  const filterActivities = (type: ActivityType) => {
    setActiveFilter(type);
    if (type === 'all') {
      setFilteredActivities(combinedActivities);
    } else {
      setFilteredActivities(combinedActivities.filter(activity => activity.type === type));
    }
  };

  // Refresh all activities
  const refreshActivities = () => {
    setRefreshing(true);
    Promise.all([
      refetchUser(),
      refetchBadges(),
      refetchCheckins(),
      refetchReferrals()
    ]).finally(() => {
      setRefreshing(false);
    });
  };

  // Combine and process activities when data changes
  useEffect(() => {
    if (isLoading) return;
    
    const activities: Activity[] = [];
    
    // Process check-ins
    const checkinsData = checkinsResponse as CheckinsResponse;
    if (checkinsData && checkinsData.checkins && Array.isArray(checkinsData.checkins)) {
      checkinsData.checkins.forEach((checkin: CheckinData) => {
        activities.push({
          id: `checkin-${checkin.transactionHash}`,
          type: 'checkin',
          title: "Daily Check-in",
          subtitle: checkin.message || `Check-in #${checkin.checkinNumber}`,
          timestamp: checkin.timestamp,
          date: formatBlockTimestamp(checkin.timestamp),
          transactionHash: checkin.transactionHash,
          iconColor: getActivityGradient('checkin'),
          blockNumber: checkin.blockNumber
        });
      });
    }
    
    // Process badges
    const badgesData = badgesResponse as BadgesResponse;
    if (badgesData && badgesData.badges && Array.isArray(badgesData.badges)) {
      badgesData.badges.forEach((badge: BadgeData) => {
        const tierNames = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
        const tierName = badge.tierName || tierNames[badge.tier] || `Tier ${badge.tier}`;
        
        activities.push({
          id: `badge-${badge.tokenId}`,
          type: 'badge',
          title: `Mint ${tierName} Badge`,
          subtitle: `Token ID: ${badge.tokenId}`,
          timestamp: badge.mintedAt,
          date: formatBlockTimestamp(badge.mintedAt),
          transactionHash: badge.transactionHash,
          iconColor: getActivityGradient('badge')
        });
      });
    }
    
    // If we have userResponse data with username changes
    const userData = userResponse as UserResponse;
    if (userData && userData.usernameHistory && Array.isArray(userData.usernameHistory)) {
      userData.usernameHistory.forEach((history: UsernameHistoryData) => {
        activities.push({
          id: `username-${history.transactionHash}`,
          type: 'username',
          title: history.oldUsername ? "Username Changed" : "Username Registered",
          subtitle: history.oldUsername 
            ? `${history.oldUsername} → ${history.username}` 
            : history.username,
          timestamp: history.timestamp,
          date: formatBlockTimestamp(history.timestamp),
          transactionHash: history.transactionHash,
          iconColor: getActivityGradient('username')
        });
      });
    }
    
    // Process referrals
    const referralsData = referralsResponse as ReferralsResponse;
    if (referralsData && referralsData.referrals && Array.isArray(referralsData.referrals)) {
      referralsData.referrals.forEach((referral: ReferralData) => {
        activities.push({
          id: `referral-${referral.transactionHash}`,
          type: 'referral',
          title: "Referral",
          subtitle: `Referred ${formatAddress(referral.referee)}`,
          timestamp: referral.timestamp,
          date: formatBlockTimestamp(referral.timestamp),
          transactionHash: referral.transactionHash,
          iconColor: getActivityGradient('referral')
        });
      });
    }
    
    // Sort all activities by timestamp (newest first)
    const sortedActivities = activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    setCombinedActivities(sortedActivities);
    
    // Apply current filter
    if (activeFilter === 'all') {
      setFilteredActivities(sortedActivities);
    } else {
      setFilteredActivities(sortedActivities.filter(activity => activity.type === activeFilter));
    }
  }, [checkinsResponse, badgesResponse, userResponse, referralsResponse, isLoading, activeFilter]);

  // Get checkin count safely
  const getCheckinCount = (): number => {
    const checkinsData = checkinsResponse as CheckinsResponse;
    return checkinsData?.stats?.total || 0;
  };

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 z-50 flex justify-end"
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        {/* Backdrop with blur effect */}
        <motion.div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          variants={backdropVariants}
          onClick={onClose}
        ></motion.div>
        
        {/* Sidebar Content */}
        <motion.div 
          className="relative w-full max-w-md h-full bg-white dark:bg-black/90 backdrop-blur-lg shadow-2xl border-l border-gray-200 dark:border-emerald-500/20 overflow-hidden flex flex-col"
          variants={sidebarVariants}
        >
          {/* Decorative top border */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 z-10"></div>
          
          {/* Ambient background gradients */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
            <div className="absolute -top-[400px] -left-[300px] w-[600px] h-[600px] rounded-full bg-emerald-900/5 dark:bg-emerald-900/10 blur-3xl animate-blob opacity-30"></div>
            <div className="absolute top-[60%] -right-[300px] w-[600px] h-[600px] rounded-full bg-emerald-800/5 dark:bg-emerald-800/10 blur-3xl animate-blob opacity-30" style={{animationDelay: '2s'}}></div>
            <div className="absolute -bottom-[400px] -left-[200px] w-[500px] h-[500px] rounded-full bg-emerald-700/5 dark:bg-emerald-700/10 blur-3xl animate-blob opacity-30" style={{animationDelay: '4s'}}></div>
          </div>
          
          <div className="sticky top-0 bg-white/95 dark:bg-black/95 backdrop-blur-md z-10 border-b border-gray-200 dark:border-emerald-500/20 pb-4">
            {/* Header with glassmorphism effect */}
            <div className="p-6 md:p-8 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-transparent dark:bg-gradient-to-r dark:from-emerald-300 dark:to-teal-200 dark:bg-clip-text flex items-center gap-2 group">
                    <span className="relative">
                      <MdOutlineLocalActivity className="text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
                    </span>
                    Onchain Activity
                  </h2>
                  {!isLoading && (
                    <div className="text-gray-600 dark:text-emerald-300/70 text-sm mt-1 flex items-center gap-1.5">
                      <FaHistory className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                      <span>{getCheckinCount()} check-ins recorded</span>
                    </div>
                  )}
                </div>
                <motion.button 
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-emerald-900/50 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <MdClose />
                </motion.button>
              </div>
              
              {/* Progress indicator */}
              {!isLoading && combinedActivities.length > 0 && (
                <div className="mt-4 relative h-2">
                  <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-900/30 rounded-full overflow-hidden">
                    {/* Activities count indicator */}
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (combinedActivities.length / 20) * 100)}%` }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 rounded-full"
                    >
                      <div className="absolute top-0 right-0 h-full w-4 bg-white/20 blur-sm animate-pulse"></div>
                    </motion.div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Activity filters */}
            {!isLoading && combinedActivities.length > 0 && (
              <div className="px-6 flex items-center space-x-2 overflow-x-auto scrollbar-hide py-3 mt-2">
                <motion.button 
                  onClick={() => filterActivities('all')}
                  className={`px-4 py-1.5 rounded-full text-sm flex items-center space-x-1.5 whitespace-nowrap border ${
                    activeFilter === 'all' 
                      ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/20' 
                      : 'border-transparent bg-gray-50 dark:bg-gray-800/30'
                  } transition-all`}
                  initial={activeFilter === 'all' ? 'active' : 'inactive'}
                  animate={activeFilter === 'all' ? 'active' : 'inactive'}
                  variants={filterVariants}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className={activeFilter === 'all' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}>All</span>
                </motion.button>
                
                <motion.button 
                  onClick={() => filterActivities('checkin')}
                  className={`px-4 py-1.5 rounded-full text-sm flex items-center space-x-1.5 whitespace-nowrap border ${
                    activeFilter === 'checkin' 
                      ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/20' 
                      : 'border-transparent bg-gray-50 dark:bg-gray-800/30'
                  } transition-all`}
                  initial={activeFilter === 'checkin' ? 'active' : 'inactive'}
                  animate={activeFilter === 'checkin' ? 'active' : 'inactive'}
                  variants={filterVariants}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className={activeFilter === 'checkin' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}>Check-ins</span>
                </motion.button>
                
                <motion.button 
                  onClick={() => filterActivities('badge')}
                  className={`px-4 py-1.5 rounded-full text-sm flex items-center space-x-1.5 whitespace-nowrap border ${
                    activeFilter === 'badge' 
                      ? 'border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-900/20' 
                      : 'border-transparent bg-gray-50 dark:bg-gray-800/30'
                  } transition-all`}
                  initial={activeFilter === 'badge' ? 'active' : 'inactive'}
                  animate={activeFilter === 'badge' ? 'active' : 'inactive'}
                  variants={filterVariants}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span className={activeFilter === 'badge' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400'}>Badges</span>
                </motion.button>
                
                <motion.button 
                  onClick={refreshActivities}
                  disabled={refreshing}
                  className="ml-auto px-4 py-1.5 rounded-full text-sm flex items-center space-x-1.5 bg-gray-50 dark:bg-gray-800/30 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/30 border border-gray-200 dark:border-gray-700/30"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaRedo className={`${refreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </motion.button>
              </div>
            )}
          </div>
          
          <div className="flex-grow overflow-y-auto custom-scrollbar">
            <div className="p-6 pt-4">
              {/* Activity Content */}
              <AnimatePresence mode="wait">
                {/* Loading state */}
                {isLoading && (
                  <motion.div 
                    className="flex flex-col items-center justify-center py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key="loading"
                  >
                    <div className="relative w-20 h-20 mb-6">
                      <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-pulse"></div>
                      <div className="absolute inset-2 rounded-full border-2 border-dashed border-emerald-400 animate-spin"></div>
                      <div className="absolute inset-4 rounded-full border-2 border-emerald-300/60 animate-ping"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          animate={{ 
                            opacity: [0.5, 1, 0.5],
                            scale: [0.9, 1.1, 0.9]
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <MdOutlineLocalActivity className="text-emerald-500 dark:text-emerald-400 text-3xl" />
                        </motion.div>
                      </div>
                    </div>
                    <motion.p 
                      className="text-emerald-600 dark:text-emerald-400 font-medium mb-1"
                      animate={{ 
                        opacity: [0.7, 1, 0.7],
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      Loading on-chain activities
                    </motion.p>
                    <p className="text-gray-500 dark:text-emerald-500/50 text-sm">This may take a moment</p>
                  </motion.div>
                )}
                
                {/* Empty state */}
                {!isLoading && combinedActivities.length === 0 && (
                  <motion.div 
                    className="text-center py-12 px-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    key="empty"
                  >
                    <motion.div 
                      className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-700/20 border border-emerald-300 dark:border-emerald-500/30"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                    >
                      <FaLeaf className="h-12 w-12 text-emerald-500 dark:text-emerald-400/80" />
                    </motion.div>
                    <motion.p 
                      className="text-gray-800 dark:text-emerald-300 text-xl font-medium mb-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                    >
                      Begin Your Digital Journey
                    </motion.p>
                    <motion.p 
                      className="text-gray-600 dark:text-emerald-200/80 mb-8 max-w-sm mx-auto"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4, duration: 0.5 }}
                    >
                      Your activity history will appear here after you interact with GM Tea contracts
                    </motion.p>
                    
                    <motion.div 
                      className="flex flex-col gap-4 max-w-xs mx-auto"
                      variants={listVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <motion.div 
                        className="flex items-center gap-3 bg-white dark:bg-black/30 p-4 rounded-xl border border-gray-200 dark:border-emerald-500/20 hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all shadow-sm"
                        whileHover={{ 
                          scale: 1.02,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
                        }}
                        variants={itemVariants}
                      >
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl">
                          <MdCheckCircle className="text-xl" />
                        </div>
                        <div className="text-left">
                          <p className="text-gray-800 dark:text-emerald-300 font-medium">Daily Check-in</p>
                          <p className="text-gray-600 dark:text-emerald-300/70 text-sm">Say GM to the community</p>
                        </div>
                      </motion.div>
                      
                      <motion.div 
                        className="flex items-center gap-3 bg-white dark:bg-black/30 p-4 rounded-xl border border-gray-200 dark:border-emerald-500/20 hover:border-purple-300 dark:hover:border-purple-500/50 transition-all shadow-sm"
                        whileHover={{ 
                          scale: 1.02,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
                        }}
                        variants={itemVariants}
                      >
                        <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 p-3 rounded-xl">
                          <MdOutlineVerified className="text-xl" />
                        </div>
                        <div className="text-left">
                          <p className="text-gray-800 dark:text-emerald-300 font-medium">Mint Badges</p>
                          <p className="text-gray-600 dark:text-emerald-300/70 text-sm">Collect badge NFTs</p>
                        </div>
                      </motion.div>
                      
                      <motion.div 
                        className="flex items-center gap-3 bg-white dark:bg-black/30 p-4 rounded-xl border border-gray-200 dark:border-emerald-500/20 hover:border-pink-300 dark:hover:border-pink-500/50 transition-all shadow-sm"
                        whileHover={{ 
                          scale: 1.02,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
                        }}
                        variants={itemVariants}
                      >
                        <div className="bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 p-3 rounded-xl">
                          <MdCelebration className="text-xl" />
                        </div>
                        <div className="text-left">
                          <p className="text-gray-800 dark:text-emerald-300 font-medium">Refer Friends</p>
                          <p className="text-gray-600 dark:text-emerald-300/70 text-sm">Earn rewards for referrals</p>
                        </div>
                      </motion.div>
                    </motion.div>
                    
                    <motion.button 
                      onClick={refreshActivities}
                      disabled={refreshing}
                      className="mt-8 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center space-x-2 mx-auto border border-emerald-500"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6, duration: 0.4 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <FaRedo className={`${refreshing ? 'animate-spin' : ''}`} />
                      <span>Check Again</span>
                    </motion.button>
                  </motion.div>
                )}
                
                {/* Filtered empty state */}
                {!isLoading && combinedActivities.length > 0 && filteredActivities.length === 0 && (
                  <motion.div 
                    className="text-center py-12 px-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    key="filtered-empty"
                  >
                    <motion.div 
                      className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800/60 flex items-center justify-center"
                      animate={{ 
                        boxShadow: [
                          "0 0 0 rgba(16, 185, 129, 0)",
                          "0 0 15px rgba(16, 185, 129, 0.2)",
                          "0 0 0 rgba(16, 185, 129, 0)"
                        ]
                      }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                    >
                      <motion.div
                        animate={{ 
                          rotate: [0, 360],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ 
                          rotate: { duration: 5, repeat: Infinity, ease: "linear" },
                          scale: { duration: 2, repeat: Infinity }
                        }}
                      >
                        <FaFilter className="text-gray-500 dark:text-gray-400 text-2xl" />
                      </motion.div>
                    </motion.div>
                    
                    <motion.p 
                      className="text-gray-800 dark:text-emerald-300 text-lg font-medium mb-2"
                      animate={{ opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      No matching activities
                    </motion.p>
                    <p className="text-gray-600 dark:text-emerald-300/70 mb-6">
                      Try changing your filter or check back later
                    </p>
                    
                    <motion.button 
                      onClick={() => filterActivities('all')}
                      className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center space-x-2 mx-auto border border-emerald-500"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span>Show All Activities</span>
                    </motion.button>
                  </motion.div>
                )}
                
                {/* Activity list */}
                {!isLoading && filteredActivities.length > 0 && (
                  <motion.div 
                    className="space-y-6"
                    key="activity-list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="flex justify-between items-center mb-6">
                      <motion.p 
                        className="text-gray-600 dark:text-emerald-300/70 text-sm" 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        Showing <span className="text-gray-800 dark:text-emerald-300 font-medium">{filteredActivities.length}</span> activities
                      </motion.p>
                    </div>
                    
                    {/* Group activities by date */}
                    <motion.div
                      variants={listVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-8"
                    >
                      {Object.entries(
                        filteredActivities.reduce<Record<string, Activity[]>>((groups, activity) => {
                          const date = activity.date;
                          if (!groups[date]) groups[date] = [];
                          groups[date].push(activity);
                          return groups;
                        }, {})
                      ).map(([date, dateActivities], groupIndex) => (
                        <motion.div 
                          key={date} 
                          className="relative"
                          variants={itemVariants}
                        >
                          <div className="absolute top-[-18px] right-[5] z-10">
                            <div className="flex items-center mb-3">
                              <div className="h-[1px] bg-gradient-to-r from-transparent via-emerald-200 dark:via-emerald-800/30 to-transparent flex-grow"></div>
                              <div className="px-4 py-1 bg-emerald-50 dark:bg-emerald-900/20 backdrop-blur-md text-sm text-emerald-600 dark:text-emerald-400 rounded-full mx-2 border border-emerald-200 dark:border-emerald-800/50 font-medium">
                                {date}
                              </div>
                              <div className="h-[1px] bg-gradient-to-r from-transparent via-emerald-200 dark:via-emerald-800/30 to-transparent flex-grow"></div>
                            </div>
                          </div>
                          
                          <div className="space-y-4 relative">
                            {/* Vertical timeline line */}
                            <div className="absolute left-5 top-5 bottom-5 w-[1px] bg-gradient-to-b from-emerald-200 via-emerald-100 to-emerald-50 dark:from-emerald-500/30 dark:via-emerald-500/20 dark:to-emerald-500/10"></div>
                            
                            {dateActivities.map((activity, activityIndex) => (
                              <motion.div 
                                key={activity.id}
                                className="relative"
                                variants={itemVariants}
                                custom={activityIndex}
                                whileHover={{ scale: 1.01 }}
                              >
                                <div 
                                  className={`flex items-start gap-4 p-4 bg-white dark:bg-black/30 backdrop-blur-md rounded-xl border transition-all duration-300 overflow-hidden shadow-sm ${getActivityBorder(activity.type)}`}
                                >
                                  {/* Decorative elements */}
                                  <motion.div 
                                    className="absolute inset-0 opacity-5 dark:opacity-10 pointer-events-none"
                                    animate={{
                                      background: [
                                        `radial-gradient(circle at 50% 50%, ${getActivityColor(activity.type)}, transparent 70%)`,
                                        `radial-gradient(circle at 50% 0%, ${getActivityColor(activity.type)}, transparent 70%)`,
                                        `radial-gradient(circle at 100% 50%, ${getActivityColor(activity.type)}, transparent 70%)`,
                                        `radial-gradient(circle at 50% 100%, ${getActivityColor(activity.type)}, transparent 70%)`,
                                        `radial-gradient(circle at 0% 50%, ${getActivityColor(activity.type)}, transparent 70%)`,
                                        `radial-gradient(circle at 50% 50%, ${getActivityColor(activity.type)}, transparent 70%)`
                                      ]
                                    }}
                                    transition={{ 
                                      duration: 10, 
                                      repeat: Infinity,
                                      ease: "linear"
                                    }}
                                  ></motion.div>
                                  
                                  {/* Activity icon */}
                                  <div className="relative mt-1">
                                    <motion.div 
                                      className={`w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br ${activity.iconColor} flex items-center justify-center text-white shadow-md`}
                                      whileHover={{ 
                                        scale: 1.05,
                                        rotate: 5
                                      }}
                                    >
                                      {getActivityIcon(activity.type)}
                                    </motion.div>
                                    
                                    {/* Status indicator */}
                                    <motion.div 
                                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center bg-white dark:bg-black shadow-lg border-2 border-gray-100 dark:border-gray-800"
                                      style={{ backgroundColor: getActivityColor(activity.type) }}
                                    >
                                      <FaCheck className="text-white text-[10px]" />
                                    </motion.div>
                                  </div>
                                  
                                  {/* Activity details */}
                                  <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                      <motion.h3 
                                        className={`font-medium ${getActivityTextColor(activity.type)}`}
                                        whileHover={{ 
                                          textShadow: `0 0 5px ${getActivityColor(activity.type)}40`
                                        }}
                                      >
                                        {activity.title}
                                      </motion.h3>
                                      <div className="flex items-center">
                                        <FaClock className="text-green-400 dark:text-gray-500 h-3 w-3 mr-1" />
                                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                          {getTimeElapsed(activity.timestamp)}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {activity.subtitle && (
                                      <p className="text-gray-700 dark:text-emerald-300/80 text-sm mt-1">{activity.subtitle}</p>
                                    )}
                                    
                                    <div className="flex flex-wrap justify-between items-center mt-3 text-xs">
                                      <div className="text-gray-500 dark:text-gray-400 mb-0.5 flex items-center">
                                        <FaLink className="mr-1 h-3 w-3 text-gray-400 dark:text-gray-500" />
                                        {activity.transactionHash ? (
                                          <>
                                            Tx: <motion.a 
                                              href={`https://sepolia.tea.xyz/tx/${activity.transactionHash}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 dark:text-blue-400 hover:underline"
                                              whileHover={{ color: '#60a5fa' }}
                                            >
                                              {formatAddress(activity.transactionHash)}
                                            </motion.a>
                                          </>
                                        ) : (
                                          <span>Transaction data not available</span>
                                        )}
                                      </div>
                                      
                                      <motion.span
                                        className={`px-2 py-0.5 rounded-full text-xs ${
                                          activity.type === 'checkin' ? `${getActivityLightBg(activity.type)} ${getActivityDarkBg(activity.type)} ${getActivityTextColor(activity.type)}` :
                                          activity.type === 'badge' ? `${getActivityLightBg(activity.type)} ${getActivityDarkBg(activity.type)} ${getActivityTextColor(activity.type)}` :
                                          activity.type === 'username' ? `${getActivityLightBg(activity.type)} ${getActivityDarkBg(activity.type)} ${getActivityTextColor(activity.type)}` :
                                          `${getActivityLightBg(activity.type)} ${getActivityDarkBg(activity.type)} ${getActivityTextColor(activity.type)}`
                                        }`}
                                        whileHover={{ scale: 1.1 }}
                                      >
                                        {activity.type}
                                      </motion.span>
                                    </div>
                                    
                                    {activity.blockNumber && (
                                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-2">
                                        <FaStream className="mr-1 h-3 w-3 text-gray-400 dark:text-gray-500" />
                                        Block: <motion.a 
                                          href={`https://sepolia.tea.xyz/block/${activity.blockNumber}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 dark:text-blue-400 hover:underline ml-1"
                                          whileHover={{ color: '#60a5fa' }}
                                        >
                                          {activity.blockNumber}
                                        </motion.a>
                                        <motion.span
                                          className="ml-auto"
                                          whileHover={{ scale: 1.1 }}
                                        >
                                          <a 
                                            href={`https://sepolia.tea.xyz/tx/${activity.transactionHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-emerald-600 dark:text-emerald-400 flex items-center"
                                          >
                                            <FaExpand className="h-3 w-3 mr-1" />
                                            <span>View</span>
                                          </a>
                                        </motion.span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          {/* Footer with gradient */}
          <div className="bg-gradient-to-t from-white via-white to-transparent dark:from-black dark:via-black dark:to-transparent pt-6 pb-4 px-6 text-center border-t border-gray-200 dark:border-emerald-500/20">
            <div className="flex items-center justify-center">
              <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-emerald-200 dark:to-emerald-800"></div>
              <motion.div 
                className="text-xs text-gray-500 dark:text-emerald-500/60 mx-3 flex items-center"
                whileInView={{ opacity: [0.5, 1] }}
                transition={{ duration: 1 }}
              >
                <FaLeaf className="text-emerald-500 dark:text-emerald-400 mr-2 h-3 w-3" />
                <span>Showing onchain activity from <span className="text-emerald-600 dark:text-emerald-400">GM Tea</span> contracts</span>
              </motion.div>
              <div className="h-[1px] w-16 bg-gradient-to-r from-emerald-200 dark:from-emerald-800 to-transparent"></div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};


export default ActivitySidebar;