import { ethers } from 'ethers';
import { 
  getUserHighestTier,
  getReferralContract,
  getProvider,
  getBadgeContract
} from './badgeWeb3';

export const TIER_POINT_REWARDS = {
  0: {
    checkinPoints: 10,
    checkinBoost: 1.1,
    achievementPoints: {
      firstCheckin: 50,
      streak7Days: 50,
      streak50Days: 50,
      streak100Days: 200
    }
  },
  1: {
    checkinPoints: 10,
    checkinBoost: 1.2,
    achievementPoints: {
      firstCheckin: 50,
      streak7Days: 50,
      streak50Days: 50,
      streak100Days: 200
    }
  },
  2: {
    checkinPoints: 10,
    checkinBoost: 1.3,
    achievementPoints: {
      firstCheckin: 50,
      streak7Days: 50,
      streak50Days: 50,
      streak100Days: 200
    }
  },
  3: {
    checkinPoints: 10,
    checkinBoost: 1.4,
    achievementPoints: {
      firstCheckin: 50,
      streak7Days: 50,
      streak50Days: 50,
      streak100Days: 200
    }
  },
  4: {
    checkinPoints: 10,
    checkinBoost: 1.5,
    achievementPoints: {
      firstCheckin: 50,
      streak7Days: 50,
      streak50Days: 50,
      streak100Days: 200
    }
  }
};

export const TIER_FEATURES = {
  0: [
    'Basic forum access',
    'Daily check-in points (1.1x boost)'
  ],
  1: [
    'Basic forum access',
    'Daily check-in points (1.2x boost)',
    'Colored username'
  ],
  2: [
    'Basic forum access',
    'Daily check-in points (1.3x boost)',
    'Colored username',
    'Exclusive avatar frame',
    'Custom emotes in chat'
  ],
  3: [
    'Basic forum access',
    'Daily check-in points (1.4x boost)',
    'Colored username',
    'Animated avatar frame',
    'Custom emotes in chat',
    'Colored text in chat',
    'Custom profile background'
  ],
  4: [
    'Basic forum access',
    'Daily check-in points (1.5x boost)',
    'Colored username',
    'Animated avatar frame',
    'Custom emotes in chat',
    'Colored text in chat',
    'Custom profile background',
    'Message effects in chat'
  ]
};

export const getUserBenefits = async (address: string): Promise<string[]> => {
  try {
    const highestTier = await getUserHighestTier(address);
    
    if (highestTier === -1) {
      return [];
    }
    
    return TIER_FEATURES[highestTier as keyof typeof TIER_FEATURES];
  } catch (error) {
    console.error('Error getting user benefits:', error);
    return [];
  }
};

export const getUserReferralStats = async (address: string): Promise<{
  totalReferrals: number;
  totalRewards: string;
  pendingRewards: string;
  highestTier: number;
}> => {
  try {
    const provider = getProvider();
    if (!provider || !address) {
      throw new Error('Provider or address not available');
    }
    
    const referralContract = getReferralContract(provider);
    const stats = await referralContract.getReferralStats(address);
    const highestTier = await getUserHighestTier(address);
    
    return {
      totalReferrals: stats.totalReferrals.toNumber(),
      totalRewards: ethers.utils.formatEther(stats.claimedRewardsAmount),
      pendingRewards: ethers.utils.formatEther(stats.pendingRewardsAmount),
      highestTier: highestTier === -1 ? 0 : highestTier
    };
  } catch (error) {
    console.error('Error getting user referral stats:', error);
    return {
      totalReferrals: 0,
      totalRewards: '0',
      pendingRewards: '0',
      highestTier: 0
    };
  }
};

export const calculateCheckinPoints = (badgeTier: number, checkinCount: number): {
  basePoints: number;
  boostedPoints: number;
  boost: number;
} => {
  try {
    const tier = badgeTier < 0 ? 0 : badgeTier;
    const tierRewards = TIER_POINT_REWARDS[tier as keyof typeof TIER_POINT_REWARDS];
    
    const basePoints = checkinCount * tierRewards.checkinPoints;
    
    const boostedPoints = Math.floor(basePoints * tierRewards.checkinBoost);
    
    return {
      basePoints,
      boostedPoints,
      boost: tierRewards.checkinBoost
    };
  } catch (error) {
    console.error('Error calculating checkin points:', error);
    return {
      basePoints: 0,
      boostedPoints: 0,
      boost: 1.0
    };
  }
};

export const calculateAchievementPoints = (
  badgeTier: number, 
  completedAchievements: {
    firstCheckin?: boolean;
    streak7Days?: boolean;
    streak50Days?: boolean;
    streak100Days?: boolean;
  }
): {
  items: Array<{
    name: string;
    points: number;
    completed: boolean;
  }>;
  totalPoints: number;
} => {
  try {
    const tier = badgeTier < 0 ? 0 : badgeTier;
    const tierRewards = TIER_POINT_REWARDS[tier as keyof typeof TIER_POINT_REWARDS];
    
    const achievementItems = [
      {
        name: 'First Check-in',
        points: tierRewards.achievementPoints.firstCheckin,
        completed: !!completedAchievements.firstCheckin
      },
      {
        name: '7-Day Streak',
        points: tierRewards.achievementPoints.streak7Days,
        completed: !!completedAchievements.streak7Days
      },
      {
        name: '50-Day Streak',
        points: tierRewards.achievementPoints.streak50Days,
        completed: !!completedAchievements.streak50Days
      },
      {
        name: '100-Day Streak',
        points: tierRewards.achievementPoints.streak100Days,
        completed: !!completedAchievements.streak100Days
      }
    ];
    
    const totalPoints = achievementItems.reduce((total, item) => {
      return total + (item.completed ? item.points : 0);
    }, 0);
    
    return {
      items: achievementItems,
      totalPoints
    };
  } catch (error) {
    console.error('Error calculating achievement points:', error);
    return {
      items: [],
      totalPoints: 0
    };
  }
};

export const getUserPointsBreakdown = async (
  address: string,
  checkinCount: number,
  completedAchievements: {
    firstCheckin?: boolean;
    streak7Days?: boolean;
    streak50Days?: boolean;
    streak100Days?: boolean;
  } = {}
): Promise<{
  checkins: {
    count: number;
    basePoints: number;
    boostedPoints: number;
    boost: number;
  };
  achievements: {
    items: Array<{
      name: string;
      points: number;
      completed: boolean;
    }>;
    totalPoints: number;
  };
  totalPoints: number;
}> => {
  try {
    const highestTier = await getUserHighestTier(address);
    
    const checkinPointsInfo = calculateCheckinPoints(highestTier, checkinCount);
    
    const achievementPointsInfo = calculateAchievementPoints(highestTier, completedAchievements);
    
    const totalPoints = checkinPointsInfo.boostedPoints + achievementPointsInfo.totalPoints;
    
    return {
      checkins: {
        count: checkinCount,
        basePoints: checkinPointsInfo.basePoints,
        boostedPoints: checkinPointsInfo.boostedPoints,
        boost: checkinPointsInfo.boost
      },
      achievements: achievementPointsInfo,
      totalPoints
    };
  } catch (error) {
    console.error('Error getting user points breakdown:', error);
    return {
      checkins: {
        count: 0,
        basePoints: 0,
        boostedPoints: 0,
        boost: 1.0
      },
      achievements: {
        items: [],
        totalPoints: 0
      },
      totalPoints: 0
    };
  }
};

export const getCheckinPointsForUser = async (address: string): Promise<number> => {
  try {
    const highestTier = await getUserHighestTier(address);
    
    const tier = highestTier < 0 ? 0 : highestTier;
    const tierRewards = TIER_POINT_REWARDS[tier as keyof typeof TIER_POINT_REWARDS];
    
    return Math.floor(tierRewards.checkinPoints * tierRewards.checkinBoost);
  } catch (error) {
    console.error('Error getting checkin points for user:', error);
    return 10;
  }
};

export const getAchievementPoints = async (
  address: string, 
  achievementType: 'firstCheckin' | 'streak7Days' | 'streak50Days' | 'streak100Days'
): Promise<number> => {
  try {
    const highestTier = await getUserHighestTier(address);
    
    const tier = highestTier < 0 ? 0 : highestTier;
    const tierRewards = TIER_POINT_REWARDS[tier as keyof typeof TIER_POINT_REWARDS];
    
    return tierRewards.achievementPoints[achievementType];
  } catch (error) {
    console.error('Error getting achievement points:', error);
    
    const defaultPoints = {
      firstCheckin: 50,
      streak7Days: 50,
      streak50Days: 50,
      streak100Days: 200
    };
    
    return defaultPoints[achievementType];
  }
};

export const addPointsToUser = async (
  address: string,
  points: number,
  reason: string
): Promise<boolean> => {
  try {
    console.log(`Added ${points} points to ${address} for ${reason}`);
    
    try {
      if (typeof window !== 'undefined') {
        const existingPointsStr = localStorage.getItem(`gmtea_points_${address.toLowerCase()}`);
        const existingPoints = existingPointsStr ? parseInt(existingPointsStr) : 0;
        
        const newPoints = existingPoints + points;
        
        localStorage.setItem(`gmtea_points_${address.toLowerCase()}`, newPoints.toString());
        
        const historyKey = `gmtea_points_history_${address.toLowerCase()}`;
        const existingHistoryStr = localStorage.getItem(historyKey);
        const existingHistory = existingHistoryStr ? JSON.parse(existingHistoryStr) : [];
        
        existingHistory.push({
          points,
          reason,
          timestamp: Date.now()
        });
        
        localStorage.setItem(historyKey, JSON.stringify(existingHistory));
      }
    } catch (e) {
      console.error('Error saving points to localStorage:', e);
    }
    
    return true;
  } catch (error) {
    console.error('Error adding points to user:', error);
    return false;
  }
};

export const getTotalUserPoints = async (address: string): Promise<number> => {
  try {
    if (typeof window !== 'undefined') {
      const pointsStr = localStorage.getItem(`gmtea_points_${address.toLowerCase()}`);
      return pointsStr ? parseInt(pointsStr) : 0;
    }
    return 0;
  } catch (error) {
    console.error('Error getting total user points:', error);
    return 0;
  }
};

export const getUserPointsHistory = async (address: string): Promise<Array<{
  points: number;
  reason: string;
  timestamp: number;
}>> => {
  try {
    if (typeof window !== 'undefined') {
      const historyKey = `gmtea_points_history_${address.toLowerCase()}`;
      const historyStr = localStorage.getItem(historyKey);
      return historyStr ? JSON.parse(historyStr) : [];
    }
    return [];
  } catch (error) {
    console.error('Error getting user points history:', error);
    return [];
  }
};