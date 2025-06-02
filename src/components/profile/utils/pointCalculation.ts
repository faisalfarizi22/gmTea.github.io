import { getUserBadges } from "@/utils/badgeWeb3";

type TierBoostMap = {
  [key: number]: number;
};

export const TIER_BOOSTS: TierBoostMap = {
  [-1]: 1.0,
  0: 1.1,
  1: 1.2,
  2: 1.3,
  3: 1.4,
  4: 1.5
};

export const TIER_NAMES = [
  "Common",
  "Uncommon", 
  "Rare",
  "Epic",
  "Legendary"
];

export const getCheckInBoost = (tier: number): number => {
  return TIER_BOOSTS[tier] || 1.0;
};

export const getNextCheckinPoints = (highestTier: number): number => {
  const basePoints = 10;
  const boost = getCheckInBoost(highestTier);
  return Math.floor(basePoints * boost);
};

export interface CheckInData {
  checkInNumber: number;
  timestamp: number;
}

export interface BadgeAcquisitionData {
  tier: number;
  timestamp: number;
}

export const calculateAccuratePoints = (
  checkIns: CheckInData[],
  badgeAcquisitions: BadgeAcquisitionData[],
  leaderboardRank: number
): number => {
  const sortedCheckIns = [...checkIns].sort((a, b) => a.timestamp - b.timestamp);
  
  const sortedBadgeAcqs = [...badgeAcquisitions].sort((a, b) => a.timestamp - b.timestamp);
  
  let totalCheckInPoints = 0;
  
  for (const checkIn of sortedCheckIns) {
    let highestTier = -1;
    
    for (const badgeAcq of sortedBadgeAcqs) {
      if (badgeAcq.timestamp < checkIn.timestamp && badgeAcq.tier > highestTier) {
        highestTier = badgeAcq.tier;
      }
    }
    
    const boost = getCheckInBoost(highestTier);
    const basePoints = 10;
    const pointsForThisCheckIn = Math.floor(basePoints * boost);
    
    totalCheckInPoints += pointsForThisCheckIn;
  }
  
  let achievementPoints = 0;
  if (sortedCheckIns.length >= 1) achievementPoints += 50;
  if (sortedCheckIns.length >= 7) achievementPoints += 50;
  if (sortedCheckIns.length >= 50) achievementPoints += 50;
  if (sortedCheckIns.length >= 100) achievementPoints += 200;
  
  const leaderboardPoints = (leaderboardRank > 0 && leaderboardRank <= 10) ? 100 : 0;
  
  return totalCheckInPoints + achievementPoints + leaderboardPoints;
};

export const simulateCheckInAndBadgeData = (
  checkInCount: number,
  badgeTiers: number[] = [], 
  badgeAcquisitionDays: number[] = []
) => {
  const now = new Date().getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const firstCheckInTime = now - (checkInCount * oneDay);
  
  const checkIns: CheckInData[] = [];
  for (let i = 1; i <= checkInCount; i++) {
    checkIns.push({
      checkInNumber: i,
      timestamp: firstCheckInTime + ((i - 1) * oneDay)
    });
  }
  
  const badgeAcquisitions: BadgeAcquisitionData[] = [];
  for (let i = 0; i < badgeTiers.length; i++) {
    const tier = badgeTiers[i];
    const dayOffset = badgeAcquisitionDays[i] || i * 5;
    
    badgeAcquisitions.push({
      tier,
      timestamp: firstCheckInTime + (dayOffset * oneDay)
    });
  }
  
  const totalPoints = calculateAccuratePoints(checkIns, badgeAcquisitions, 0);
  
  const history = checkIns.map(checkIn => {
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

export const getDetailedPointBreakdown = (
  checkIns: CheckInData[],
  badgeAcquisitions: BadgeAcquisitionData[],
  leaderboardRank: number
) => {
  const sortedCheckIns = [...checkIns].sort((a, b) => a.timestamp - b.timestamp);
  const sortedBadgeAcqs = [...badgeAcquisitions].sort((a, b) => a.timestamp - b.timestamp);
  
  const checkInsByTier: {[key: string]: {count: number, points: number}} = {
    'noTier': {count: 0, points: 0}
  };
  
  for (let i = 0; i <= 4; i++) {
    checkInsByTier[i] = {count: 0, points: 0};
  }
  
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
  
  const totalCheckInPoints = Object.values(checkInsByTier).reduce(
    (total, tier) => total + tier.points, 
    0
  );
  
  const firstCheckIn = sortedCheckIns.length >= 1;
  const streak7Days = sortedCheckIns.length >= 7;
  const streak50Days = sortedCheckIns.length >= 50;
  const streak100Days = sortedCheckIns.length >= 100;
  
  let achievementPoints = 0;
  if (firstCheckIn) achievementPoints += 50;
  if (streak7Days) achievementPoints += 50;
  if (streak50Days) achievementPoints += 50;
  if (streak100Days) achievementPoints += 200;
  
  const inTop10 = leaderboardRank > 0 && leaderboardRank <= 10;
  const leaderboardPoints = inTop10 ? 100 : 0;
  
  let currentHighestTier = -1;
  for (const badgeAcq of sortedBadgeAcqs) {
    if (badgeAcq.tier > currentHighestTier) {
      currentHighestTier = badgeAcq.tier;
    }
  }
  
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
  }).filter(item => item.count > 0);
  
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

export const estimateTotalPoints = (
  checkInCount: number,
  highestTier: number,
  leaderboardRank: number
): number => {
  const basePoints = 10;
  
  const boost = getCheckInBoost(highestTier);
  const estimatedCheckInPoints = Math.floor(checkInCount * basePoints * boost);
  
  let achievementPoints = 0;
  if (checkInCount >= 1) achievementPoints += 50;
  if (checkInCount >= 7) achievementPoints += 50;
  if (checkInCount >= 50) achievementPoints += 50;
  if (checkInCount >= 100) achievementPoints += 200;
  
  const leaderboardPoints = (leaderboardRank > 0 && leaderboardRank <= 10) ? 100 : 0;
  
  return estimatedCheckInPoints + achievementPoints + leaderboardPoints;
};

export const calculateTotalPoints = (
  checkInCount: number,
  highestTier: number,
  leaderboardRank: number,
  badgeAcquisitionDay?: number
): number => {
  if (highestTier >= 0 && badgeAcquisitionDay === undefined) {
    return estimateTotalPoints(checkInCount, highestTier, leaderboardRank);
  }
  
  const simulatedData = simulateCheckInAndBadgeData(
    checkInCount,
    highestTier >= 0 ? [highestTier] : [],
    highestTier >= 0 && badgeAcquisitionDay !== undefined ? [badgeAcquisitionDay] : []
  );
  
  return simulatedData.totalPoints;
};

export const getAccuratePointsTotal = async (
  address: string,
  checkinCount: number,
  highestTier: number,
  leaderboardRank: number
): Promise<number> => {
  try {
    const userBadges = await getUserBadges(address);
    
    const badgeTiers: number[] = [];
    const badgeAcquisitionDays: number[] = [];
    
    const currentDate = new Date();
    
    userBadges.forEach(badge => {
      badgeTiers.push(badge.tier);
      
      const mintDate = new Date(badge.mintedAt * 1000);
      const daysSinceFirstCheckin = Math.floor(
        (currentDate.getTime() - mintDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      
      badgeAcquisitionDays.push(
        Math.min(checkinCount - 1, Math.max(0, checkinCount - daysSinceFirstCheckin))
      );
    });
    
    const simulatedData = simulateCheckInAndBadgeData(
      checkinCount,
      badgeTiers,
      badgeAcquisitionDays
    );
    
    return simulatedData.totalPoints;
  } catch (error) {
    console.error("Error calculating accurate points total:", error);
    
    const baseCheckInPoints = checkinCount * 10;
    
    let achievementPoints = 0;
    if (checkinCount >= 1) achievementPoints += 50;
    if (checkinCount >= 7) achievementPoints += 50;
    if (checkinCount >= 50) achievementPoints += 50;
    if (checkinCount >= 100) achievementPoints += 200;
    
    const leaderboardPoints = (leaderboardRank > 0 && leaderboardRank <= 10) ? 100 : 0;
    
    return baseCheckInPoints + achievementPoints + leaderboardPoints;
  }
};