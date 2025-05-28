import { getUserBadges } from "@/utils/badgeWeb3";

type TierBoostMap = {
  [key: number]: number;
};

// Tier boost values 
export const TIER_BOOSTS: TierBoostMap = {
  [-1]: 1.0,  // No badge
  0: 1.1,     // Common (tier 0)
  1: 1.2,     // Uncommon (tier 1)
  2: 1.3,     // Rare (tier 2)
  3: 1.4,     // Epic (tier 3)
  4: 1.5      // Legendary (tier 4)
};

// Nama tier untuk tampilan UI
export const TIER_NAMES = [
  "Common",
  "Uncommon", 
  "Rare",
  "Epic",
  "Legendary"
];

/**
 * Get boost factor based on badge tier
 * @param tier Badge tier (-1 to 4)
 * @returns Boost factor as a number
 */
export const getCheckInBoost = (tier: number): number => {
  return TIER_BOOSTS[tier] || 1.0;
};

/**
 * Calculate expected points for next check-in based on highest tier
 * @param highestTier User's highest badge tier
 * @returns Expected points for next check-in
 */
export const getNextCheckinPoints = (highestTier: number): number => {
  const basePoints = 10;
  const boost = getCheckInBoost(highestTier);
  return Math.floor(basePoints * boost);
};

// Interface untuk mewakili data check-in
export interface CheckInData {
  checkInNumber: number;
  timestamp: number;
}

// Interface untuk mewakili data akuisisi badge
export interface BadgeAcquisitionData {
  tier: number;
  timestamp: number;
}

/**
 * Hitung poin total secara akurat berdasarkan waktu akuisisi badge
 * 
 * @param checkIns Array dari data check-in (nomor check-in dan timestamp)
 * @param badgeAcquisitions Array dari data akuisisi badge (tier dan timestamp)
 * @param leaderboardRank Peringkat pengguna di leaderboard
 * @returns Total poin
 */
export const calculateAccuratePoints = (
  checkIns: CheckInData[],
  badgeAcquisitions: BadgeAcquisitionData[],
  leaderboardRank: number
): number => {
  // Urutkan check-in berdasarkan timestamp (dari terlama ke terbaru)
  const sortedCheckIns = [...checkIns].sort((a, b) => a.timestamp - b.timestamp);
  
  // Urutkan badge acquisitions berdasarkan timestamp (dari terlama ke terbaru)
  const sortedBadgeAcqs = [...badgeAcquisitions].sort((a, b) => a.timestamp - b.timestamp);
  
  // Hitung poin untuk setiap check-in
  let totalCheckInPoints = 0;
  
  for (const checkIn of sortedCheckIns) {
    // Tentukan tier tertinggi yang dimiliki saat check-in ini
    let highestTier = -1;
    
    for (const badgeAcq of sortedBadgeAcqs) {
      // Jika badge diperoleh sebelum check-in ini, update tier tertinggi
      if (badgeAcq.timestamp < checkIn.timestamp && badgeAcq.tier > highestTier) {
        highestTier = badgeAcq.tier;
      }
    }
    
    // Hitung poin untuk check-in ini
    const boost = getCheckInBoost(highestTier);
    const basePoints = 10;
    const pointsForThisCheckIn = Math.floor(basePoints * boost);
    
    totalCheckInPoints += pointsForThisCheckIn;
  }
  
  // Hitung achievement points
  let achievementPoints = 0;
  if (sortedCheckIns.length >= 1) achievementPoints += 50;  // First check-in
  if (sortedCheckIns.length >= 7) achievementPoints += 50;  // 7 check-ins
  if (sortedCheckIns.length >= 50) achievementPoints += 50; // 50 check-ins
  if (sortedCheckIns.length >= 100) achievementPoints += 200; // 100 check-ins
  
  // Hitung leaderboard points
  const leaderboardPoints = (leaderboardRank > 0 && leaderboardRank <= 10) ? 100 : 0;
  
  // Total poin
  return totalCheckInPoints + achievementPoints + leaderboardPoints;
};

/**
 * Simulasi data check-in dan badge acquisition untuk UI
 * 
 * @param checkInCount Jumlah check-in
 * @param badgeTiers Array tier badge yang dimiliki
 * @param badgeAcquisitionDays Jumlah hari setelah check-in pertama saat badge diperoleh
 * @returns Object dengan check-in history, badge history, dan total poin
 */
export const simulateCheckInAndBadgeData = (
  checkInCount: number,
  badgeTiers: number[] = [], 
  badgeAcquisitionDays: number[] = []
) => {
  // Dapatkan waktu saat ini dan waktu untuk check-in pertama (checkInCount hari yang lalu)
  const now = new Date().getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const firstCheckInTime = now - (checkInCount * oneDay);
  
  // Simulasi data check-in
  const checkIns: CheckInData[] = [];
  for (let i = 1; i <= checkInCount; i++) {
    checkIns.push({
      checkInNumber: i,
      timestamp: firstCheckInTime + ((i - 1) * oneDay)
    });
  }
  
  // Simulasi data akuisisi badge
  const badgeAcquisitions: BadgeAcquisitionData[] = [];
  for (let i = 0; i < badgeTiers.length; i++) {
    const tier = badgeTiers[i];
    const dayOffset = badgeAcquisitionDays[i] || i * 5; // Default 5 hari setelah badge sebelumnya
    
    badgeAcquisitions.push({
      tier,
      timestamp: firstCheckInTime + (dayOffset * oneDay)
    });
  }
  
  // Hitung poin
  const totalPoints = calculateAccuratePoints(checkIns, badgeAcquisitions, 0); // Asumsi tidak masuk leaderboard
  
  // Data history untuk UI
  const history = checkIns.map(checkIn => {
    // Tentukan tier tertinggi untuk check-in ini
    let highestTier = -1;
    for (const badgeAcq of badgeAcquisitions) {
      if (badgeAcq.timestamp < checkIn.timestamp && badgeAcq.tier > highestTier) {
        highestTier = badgeAcq.tier;
      }
    }
    
    const boost = getCheckInBoost(highestTier);
    const basePoints = 10;
    const points = Math.floor(basePoints * boost);
    const tierName = highestTier >= 0 ? TIER_NAMES[highestTier] : "No Tier";
    
    return {
      checkInNumber: checkIn.checkInNumber,
      timestamp: checkIn.timestamp,
      activeTier: highestTier,
      tierName,
      boost,
      basePoints,
      points
    };
  });
  
  return {
    checkInHistory: history,
    badgeAcquisitions,
    totalPoints
  };
};

/**
 * Fungsi untuk perhitungan detail poin berdasarkan data check-in dan badge
 * 
 * @param checkIns Array dari data check-in
 * @param badgeAcquisitions Array dari data akuisisi badge
 * @param leaderboardRank Peringkat pengguna di leaderboard
 * @returns Detail poin
 */
export const getDetailedPointBreakdown = (
  checkIns: CheckInData[],
  badgeAcquisitions: BadgeAcquisitionData[],
  leaderboardRank: number
) => {
  // Urutkan data
  const sortedCheckIns = [...checkIns].sort((a, b) => a.timestamp - b.timestamp);
  const sortedBadgeAcqs = [...badgeAcquisitions].sort((a, b) => a.timestamp - b.timestamp);
  
  // Hitung jumlah check-in pada setiap tier
  const checkInsByTier: {[key: string]: {count: number, points: number}} = {
    'noTier': {count: 0, points: 0}
  };
  
  // Inisialisasi untuk setiap tier
  for (let i = 0; i <= 4; i++) {
    checkInsByTier[i] = {count: 0, points: 0};
  }
  
  // Hitung check-in pada setiap tier
  for (const checkIn of sortedCheckIns) {
    let highestTier = -1;
    
    for (const badgeAcq of sortedBadgeAcqs) {
      if (badgeAcq.timestamp < checkIn.timestamp && badgeAcq.tier > highestTier) {
        highestTier = badgeAcq.tier;
      }
    }
    
    if (highestTier === -1) {
      checkInsByTier.noTier.count++;
      checkInsByTier.noTier.points += 10;
    } else {
      checkInsByTier[highestTier].count++;
      checkInsByTier[highestTier].points += Math.floor(10 * getCheckInBoost(highestTier));
    }
  }
  
  // Hitung total check-in points
  const totalCheckInPoints = Object.values(checkInsByTier).reduce(
    (total, tier) => total + tier.points, 
    0
  );
  
  // Achievement status
  const firstCheckIn = sortedCheckIns.length >= 1;
  const streak7Days = sortedCheckIns.length >= 7;
  const streak50Days = sortedCheckIns.length >= 50;
  const streak100Days = sortedCheckIns.length >= 100;
  
  // Achievement points
  let achievementPoints = 0;
  if (firstCheckIn) achievementPoints += 50;
  if (streak7Days) achievementPoints += 50;
  if (streak50Days) achievementPoints += 50;
  if (streak100Days) achievementPoints += 200;
  
  // Leaderboard points
  const inTop10 = leaderboardRank > 0 && leaderboardRank <= 10;
  const leaderboardPoints = inTop10 ? 100 : 0;
  
  // Get current highest tier
  let currentHighestTier = -1;
  for (const badgeAcq of sortedBadgeAcqs) {
    if (badgeAcq.tier > currentHighestTier) {
      currentHighestTier = badgeAcq.tier;
    }
  }
  
  // Tier breakdown untuk UI
  const tierBreakdown = Object.entries(checkInsByTier).map(([tierKey, { count, points }]) => {
    if (tierKey === 'noTier') {
      return {
        tier: -1,
        tierName: 'No Tier',
        count,
        boost: 1.0,
        points
      };
    } else {
      const tier = parseInt(tierKey);
      return {
        tier,
        tierName: TIER_NAMES[tier],
        count,
        boost: getCheckInBoost(tier),
        points
      };
    }
  }).filter(item => item.count > 0); // Filter hanya tier yang memiliki check-in
  
  // Total poin
  const totalPoints = totalCheckInPoints + achievementPoints + leaderboardPoints;
  
  return {
    checkins: {
      totalCount: sortedCheckIns.length,
      byTier: tierBreakdown,
      totalPoints: totalCheckInPoints
    },
    achievements: {
      firstCheckIn,
      streak7Days,
      streak50Days,
      streak100Days,
      totalPoints: achievementPoints
    },
    leaderboard: {
      rank: leaderboardRank,
      inTop10,
      points: leaderboardPoints
    },
    currentHighestTier,
    totalPoints
  };
};

/**
 * Fungsi yang lebih sederhana untuk perhitungan total poin berdasarkan jumlah check-in dan tier tertinggi
 * CATATAN: Ini hanya untuk perkiraan umum, tidak seakurat menghitung per check-in!
 */
export const estimateTotalPoints = (
  checkInCount: number,
  highestTier: number,
  leaderboardRank: number
): number => {
  // Base point per check-in
  const basePoints = 10;
  
  // Asumsi semua check-in dengan tier tertinggi saat ini (perkiraan kasar)
  const boost = getCheckInBoost(highestTier);
  const estimatedCheckInPoints = Math.floor(checkInCount * basePoints * boost);
  
  // Achievement points
  let achievementPoints = 0;
  if (checkInCount >= 1) achievementPoints += 50;
  if (checkInCount >= 7) achievementPoints += 50;
  if (checkInCount >= 50) achievementPoints += 50;
  if (checkInCount >= 100) achievementPoints += 200;
  
  // Leaderboard points
  const leaderboardPoints = (leaderboardRank > 0 && leaderboardRank <= 10) ? 100 : 0;
  
  return estimatedCheckInPoints + achievementPoints + leaderboardPoints;
};

/**
 * Fungsi perhitungan total poin untuk digunakan di OverviewTab
 * Menggunakan estimasi yang lebih akurat untuk menghitung poin
 */

export const calculateTotalPoints = (
  checkInCount: number,
  highestTier: number,
  leaderboardRank: number,
  badgeAcquisitionDay?: number // Tambahkan parameter opsional kapan badge diperoleh
): number => {
  // Jika tidak ada informasi kapan badge diperoleh, gunakan metode estimasi
  if (highestTier >= 0 && badgeAcquisitionDay === undefined) {
    // Gunakan estimasi yang lebih sederhana
    return estimateTotalPoints(checkInCount, highestTier, leaderboardRank);
  }
  
  // Jika kita tahu kapan badge diperoleh, gunakan simulasi yang lebih akurat
  const simulatedData = simulateCheckInAndBadgeData(
    checkInCount,
    highestTier >= 0 ? [highestTier] : [],
    highestTier >= 0 && badgeAcquisitionDay !== undefined ? [badgeAcquisitionDay] : []
  );
  
  return simulatedData.totalPoints;
};

// Function to calculate points with real badge acquisition data
// Function to calculate points with real badge acquisition data
export const getAccuratePointsTotal = async (
  address: string,
  checkinCount: number,
  highestTier: number,
  leaderboardRank: number
): Promise<number> => {
  try {
    // Fetch actual badge data from blockchain
    const userBadges = await getUserBadges(address);
    
    // Create arrays for simulation
    const badgeTiers: number[] = [];
    const badgeAcquisitionDays: number[] = [];
    
    // Initialize today and calculate acquisition days
    const currentDate = new Date(); // Perbaikan: variabel diubah menjadi currentDate
    
    // Process badge data
    userBadges.forEach(badge => {
      badgeTiers.push(badge.tier);
      
      // Calculate days since badge minted (from mintedAt timestamp)
      const mintDate = new Date(badge.mintedAt * 1000);
      const daysSinceFirstCheckin = Math.floor(
        (currentDate.getTime() - mintDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      
      // Days from first check-in (maximum is checkinCount - 1)
      badgeAcquisitionDays.push(
        Math.min(checkinCount - 1, Math.max(0, checkinCount - daysSinceFirstCheckin))
      );
    });
    
    // Generate accurate simulation
    const simulatedData = simulateCheckInAndBadgeData(
      checkinCount,
      badgeTiers,
      badgeAcquisitionDays
    );
    
    return simulatedData.totalPoints;
  } catch (error) {
    console.error("Error calculating accurate points total:", error);
    
    // Fallback to a simpler calculation if error
    // Simple calculation: No boost for past check-ins
    // Base check-in points
    const baseCheckInPoints = checkinCount * 10;
    
    // Achievement points
    let achievementPoints = 0;
    if (checkinCount >= 1) achievementPoints += 50;
    if (checkinCount >= 7) achievementPoints += 50;
    if (checkinCount >= 50) achievementPoints += 50;
    if (checkinCount >= 100) achievementPoints += 200;
    
    // Leaderboard points
    const leaderboardPoints = (leaderboardRank > 0 && leaderboardRank <= 10) ? 100 : 0;
    
    return baseCheckInPoints + achievementPoints + leaderboardPoints;
  }
};