import React, { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaRedo, FaFilter, FaCheck } from 'react-icons/fa';
import { 
  MdOutlineLocalActivity, 
  MdCheckCircle, 
  MdSend, 
  MdOutlineVerified, 
  MdCelebration 
} from 'react-icons/md';
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

// Define interfaces for API responses
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

// Function to get activity icon component based on type
const getActivityIcon = (type: ActivityType) => {
  switch (type) {
    case 'checkin':
      return <MdCheckCircle />;
    case 'badge':
      return <MdOutlineVerified />;
    case 'username':
      return <MdOutlineLocalActivity />;
    case 'referral':
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
    case 'referral':
      return 'bg-pink-500';
    default:
      return 'bg-gray-500';
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
    // Skip if still loading
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
          iconColor: getActivityColor('checkin'),
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
          iconColor: getActivityColor('badge')
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
          iconColor: getActivityColor('username')
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
          iconColor: getActivityColor('referral')
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
              {!isLoading && (
                <div className="text-gray-400 text-sm mt-1">
                  {getCheckinCount()} check-ins recorded
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
          {!isLoading && combinedActivities.length > 0 && (
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
                onClick={() => filterActivities('referral')}
                className={`px-3 py-1 rounded-full text-xs flex items-center space-x-1 whitespace-nowrap transition-all ${
                  activeFilter === 'referral' 
                    ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' 
                    : 'bg-gray-800/50 text-gray-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                <span>Referrals</span>
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
            
            {/* Empty state */}
            {!isLoading && combinedActivities.length === 0 && (
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
                    <div className="bg-pink-500/20 text-pink-400 p-2 rounded-lg">
                      <MdCelebration />
                    </div>
                    <div className="text-left">
                      <p className="text-gray-300">Refer Friends</p>
                      <p className="text-gray-500 text-sm">Earn rewards for referrals</p>
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
            {!isLoading && combinedActivities.length > 0 && filteredActivities.length === 0 && (
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
            {!isLoading && filteredActivities.length > 0 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-gray-400 text-sm">
                    Showing <span className="text-white">{filteredActivities.length}</span> activities
                  </p>
                </div>
                
                {/* Group activities by date */}
                {Object.entries(
                  filteredActivities.reduce<Record<string, Activity[]>>((groups, activity) => {
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
                            <div className={`absolute -bottom-1 -right-1.5 ${activity.iconColor} rounded-full w-5 h-5 flex items-center justify-center shadow-lg`}>
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
                                {activity.transactionHash ? (
                                  <>
                                    Tx: <a 
                                      href={`https://sepolia.tea.xyz/tx/${activity.transactionHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:underline"
                                    >
                                      {formatAddress(activity.transactionHash)}
                                    </a>
                                  </>
                                ) : (
                                  <span>Transaction data not available</span>
                                )}
                              </div>
                              <span className={`text-xs ${
                                activity.type === 'checkin' ? 'text-emerald-400' :
                                activity.type === 'badge' ? 'text-purple-400' :
                                activity.type === 'username' ? 'text-blue-400' :
                                'text-pink-400'
                              }`}>
                                {activity.type}
                              </span>
                            </div>
                            
                            {activity.blockNumber && (
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