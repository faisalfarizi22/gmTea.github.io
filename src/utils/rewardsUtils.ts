// utils/rewardUtils.ts
import { ethers } from 'ethers';
import { 
  getUserHighestTier,
  getReferralContract,
  getProvider,
  getBadgeContract
} from './badgeWeb3';

// Definisikan struktur point rewards berdasarkan tier
export const TIER_POINT_REWARDS = {
  // Common (Tier 0)
  0: {
    checkinPoints: 10,
    checkinBoost: 1.1, // Diubah dari 1.1x menjadi 1.1x
    achievementPoints: {
      firstCheckin: 50,
      streak7Days: 50,
      streak50Days: 50,
      streak100Days: 200
    }
  },
  // Uncommon (Tier 1)
  1: {
    checkinPoints: 10,
    checkinBoost: 1.2, // Diubah dari 1.12x menjadi 1.2x
    achievementPoints: {
      firstCheckin: 50,
      streak7Days: 50,
      streak50Days: 50,
      streak100Days: 200
    }
  },
  // Rare (Tier 2)
  2: {
    checkinPoints: 10,
    checkinBoost: 1.3, // Diubah dari 1.25x menjadi 1.3x
    achievementPoints: {
      firstCheckin: 50,
      streak7Days: 50,
      streak50Days: 50,
      streak100Days: 200
    }
  },
  // Epic (Tier 3)
  3: {
    checkinPoints: 10,
    checkinBoost: 1.4, // Diubah dari 1.5x menjadi 1.4x
    achievementPoints: {
      firstCheckin: 50,
      streak7Days: 50,
      streak50Days: 50,
      streak100Days: 200
    }
  },
  // Legendary (Tier 4)
  4: {
    checkinPoints: 10,
    checkinBoost: 1.5, // Diubah dari 1.8x menjadi 1.5x
    achievementPoints: {
      firstCheckin: 50,
      streak7Days: 50,
      streak50Days: 50,
      streak100Days: 200
    }
  }
};

export const TIER_FEATURES = {
  // Common (Tier 0)
  0: [
    'Basic forum access',
    'Daily check-in points (1.1x boost)'
  ],
  // Uncommon (Tier 1)
  1: [
    'Basic forum access',
    'Daily check-in points (1.2x boost)',
    'Colored username'
  ],
  // Rare (Tier 2)
  2: [
    'Basic forum access',
    'Daily check-in points (1.3x boost)',
    'Colored username',
    'Exclusive avatar frame',
    'Custom emotes in chat'
  ],
  // Epic (Tier 3)
  3: [
    'Basic forum access',
    'Daily check-in points (1.4x boost)',
    'Colored username',
    'Animated avatar frame',
    'Custom emotes in chat',
    'Colored text in chat',
    'Custom profile background'
  ],
  // Legendary (Tier 4)
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

/**
 * Get active benefits for a user based on their highest tier
 */
export const getUserBenefits = async (address: string): Promise<string[]> => {
  try {
    // Get user's highest tier
    const highestTier = await getUserHighestTier(address);
    
    // If user has no badges, return empty array
    if (highestTier === -1) {
      return [];
    }
    
    // Return features for highest tier
    return TIER_FEATURES[highestTier as keyof typeof TIER_FEATURES];
  } catch (error) {
    console.error('Error getting user benefits:', error);
    return [];
  }
};

/**
 * Get referral stats for a user
 * Dipertahankan untuk kompatibilitas dengan Profile.tsx
 */
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

/**
 * Menghitung poin untuk check-in berdasarkan tier pengguna
 * @param badgeTier - Tier badge tertinggi pengguna
 * @param checkinCount - Jumlah check-in yang telah dilakukan
 * @returns Informasi tentang poin check-in
 */
export const calculateCheckinPoints = (badgeTier: number, checkinCount: number): {
  basePoints: number;
  boostedPoints: number;
  boost: number;
} => {
  try {
    // Gunakan tier 0 jika tidak memiliki badge (-1)
    const tier = badgeTier < 0 ? 0 : badgeTier;
    const tierRewards = TIER_POINT_REWARDS[tier as keyof typeof TIER_POINT_REWARDS];
    
    // Hitung poin dasar
    const basePoints = checkinCount * tierRewards.checkinPoints;
    
    // Hitung poin dengan boost
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

/**
 * Menghitung poin achievement berdasarkan tier dan achievement yang telah diselesaikan
 * @param badgeTier - Tier badge tertinggi pengguna
 * @param completedAchievements - Objek yang menunjukkan achievement mana yang telah diselesaikan
 * @returns Informasi tentang poin achievement
 */
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
    // Gunakan tier 0 jika tidak memiliki badge (-1)
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
    
    // Hitung total poin achievement
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

/**
 * Mendapatkan breakdown lengkap poin pengguna
 * @param address - Alamat pengguna
 * @param checkinCount - Jumlah check-in pengguna
 * @param completedAchievements - Achievement yang telah diselesaikan
 * @returns Breakdown lengkap dari poin pengguna
 */
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
    // Dapatkan tier tertinggi pengguna
    const highestTier = await getUserHighestTier(address);
    
    // Hitung poin check-in
    const checkinPointsInfo = calculateCheckinPoints(highestTier, checkinCount);
    
    // Hitung poin achievement
    const achievementPointsInfo = calculateAchievementPoints(highestTier, completedAchievements);
    
    // Hitung total poin
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

/**
 * Mendapatkan poin check-in untuk sekali check-in berdasarkan tier pengguna
 * @param address - Alamat pengguna
 * @returns Poin yang didapat untuk sekali check-in
 */
export const getCheckinPointsForUser = async (address: string): Promise<number> => {
  try {
    const highestTier = await getUserHighestTier(address);
    
    // Gunakan tier 0 jika tidak memiliki badge (-1)
    const tier = highestTier < 0 ? 0 : highestTier;
    const tierRewards = TIER_POINT_REWARDS[tier as keyof typeof TIER_POINT_REWARDS];
    
    // Hitung poin yang didapat untuk sekali check-in dengan boost
    return Math.floor(tierRewards.checkinPoints * tierRewards.checkinBoost);
  } catch (error) {
    console.error('Error getting checkin points for user:', error);
    return 10; // Default 10 poin
  }
};

/**
 * Mendapatkan poin untuk achievement berdasarkan tier dan jenis achievement
 * @param address - Alamat pengguna
 * @param achievementType - Jenis achievement
 * @returns Poin untuk achievement
 */
export const getAchievementPoints = async (
  address: string, 
  achievementType: 'firstCheckin' | 'streak7Days' | 'streak50Days' | 'streak100Days'
): Promise<number> => {
  try {
    const highestTier = await getUserHighestTier(address);
    
    // Gunakan tier 0 jika tidak memiliki badge (-1)
    const tier = highestTier < 0 ? 0 : highestTier;
    const tierRewards = TIER_POINT_REWARDS[tier as keyof typeof TIER_POINT_REWARDS];
    
    return tierRewards.achievementPoints[achievementType];
  } catch (error) {
    console.error('Error getting achievement points:', error);
    
    // Default values jika error
    const defaultPoints = {
      firstCheckin: 50,
      streak7Days: 50,
      streak50Days: 50,
      streak100Days: 200
    };
    
    return defaultPoints[achievementType];
  }
};

/**
 * Menambahkan poin ke akun pengguna (simulasi)
 * @param address - Alamat pengguna
 * @param points - Jumlah poin yang akan ditambahkan
 * @param reason - Alasan penambahan poin
 * @returns Boolean yang menunjukkan keberhasilan
 */
export const addPointsToUser = async (
  address: string,
  points: number,
  reason: string
): Promise<boolean> => {
  try {
    // Ini hanya simulasi. Pada implementasi nyata, ini akan melakukan API call ke backend
    console.log(`Added ${points} points to ${address} for ${reason}`);
    
    // Simpan ke localStorage sebagai simulasi
    try {
      if (typeof window !== 'undefined') {
        // Dapatkan poin yang sudah ada
        const existingPointsStr = localStorage.getItem(`gmtea_points_${address.toLowerCase()}`);
        const existingPoints = existingPointsStr ? parseInt(existingPointsStr) : 0;
        
        // Tambahkan poin baru
        const newPoints = existingPoints + points;
        
        // Simpan kembali ke localStorage
        localStorage.setItem(`gmtea_points_${address.toLowerCase()}`, newPoints.toString());
        
        // Simpan juga histori poin
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

/**
 * Mendapatkan total poin pengguna (simulasi)
 * @param address - Alamat pengguna
 * @returns Total poin pengguna
 */
export const getTotalUserPoints = async (address: string): Promise<number> => {
  try {
    // Ini hanya simulasi. Pada implementasi nyata, ini akan melakukan API call ke backend
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

/**
 * Mendapatkan histori poin pengguna (simulasi)
 * @param address - Alamat pengguna
 * @returns Histori poin pengguna
 */
export const getUserPointsHistory = async (address: string): Promise<Array<{
  points: number;
  reason: string;
  timestamp: number;
}>> => {
  try {
    // Ini hanya simulasi. Pada implementasi nyata, ini akan melakukan API call ke backend
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