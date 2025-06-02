export const TIER_NAMES = [
  "Common",   
  "Uncommon", 
  "Rare",     
  "Epic",      
  "Legendary"  
];

export const getCheckInBoost = (tier: number): number => {
  if (tier < 0) return 1.0;
  
  const boosts = [1.1, 1.2, 1.3, 1.4, 1.5]; 
  
  return tier < boosts.length ? boosts[tier] : 1.0;
};

export const getNextCheckinPoints = (tier: number): number => {
  const basePoints = 10;
  const boost = getCheckInBoost(tier);
  
  return Math.floor(basePoints * boost);
};

export const calculateAchievementPoints = (checkinCount: number): number => {
  let points = 0;
  
  if (checkinCount >= 1) points += 50;  
  if (checkinCount >= 7) points += 50;  
  if (checkinCount >= 50) points += 50; 
  if (checkinCount >= 100) points += 200; 
  
  return points;
};

export const calculateBadgePoints = (highestTier: number): number => {
  const tierPoints = [20, 30, 50, 70, 100]; 
  
  return highestTier >= 0 && highestTier < tierPoints.length 
    ? tierPoints[highestTier] 
    : 0;
};

export const calculateSingleCheckinPoints = (tierAtCheckin: number): number => {
  const basePoints = 10; 
  const boost = getCheckInBoost(tierAtCheckin);
  
  return Math.floor(basePoints * boost);
};

export const calculateTotalPoints = (
  checkinPoints: number, 
  achievementPoints: number, 
  badgePoints: number
): number => {
  return checkinPoints + achievementPoints + badgePoints;
};

export const getTierColor = (tier: number): string => {
  if (tier < 0) return "#6b7280"; 
  
  const tierColors = [
    "#10B981", 
    "#3B82F6", 
    "#8B5CF6", 
    "#EC4899", 
    "#F59E0B"  
  ];
  
  return tier < tierColors.length ? tierColors[tier] : "#6b7280";
};

export default {
  TIER_NAMES,
  getCheckInBoost,
  getNextCheckinPoints,
  calculateAchievementPoints,
  calculateBadgePoints,
  calculateSingleCheckinPoints,
  calculateTotalPoints,
  getTierColor
};

export const calculateTotalPointsFromRaw = (
  checkinCount: number,
  highestTier: number
): number => {
  const baseCheckinPoints = checkinCount * 10;
  const checkinPoints = checkinCount > 0 
    ? Array(checkinCount).fill(0).reduce((sum) => sum + calculateSingleCheckinPoints(-1), 0)
    : 0;
  
  const achievementPoints = calculateAchievementPoints(checkinCount);
  const badgePoints = calculateBadgePoints(highestTier);
  
  return checkinPoints + achievementPoints + badgePoints;
};