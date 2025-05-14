// src/utils/pointCalculation.ts
/**
 * Utility functions for point calculations in GM Tea app
 */

// Tier names for display
export const TIER_NAMES = [
  "Common",    // Tier 0
  "Uncommon",  // Tier 1
  "Rare",      // Tier 2
  "Epic",      // Tier 3
  "Legendary"  // Tier 4
];

/**
 * Calculate the boost factor for check-ins based on badge tier
 * @param tier Badge tier (-1 for no badge, 0-4 for tiers)
 * @returns Boost multiplier (1.0 - 1.5)
 */
export const getCheckInBoost = (tier: number): number => {
  // No badge
  if (tier < 0) return 1.0;
  
  // Apply boost based on tier
  const boosts = [1.1, 1.2, 1.3, 1.4, 1.5]; // Common, Uncommon, Rare, Epic, Legendary
  
  // Return the boost for the tier, or default to 1.0 if invalid tier
  return tier < boosts.length ? boosts[tier] : 1.0;
};

/**
 * Calculate points for the next check-in based on current tier
 * @param tier Current highest badge tier
 * @returns Points for next check-in
 */
export const getNextCheckinPoints = (tier: number): number => {
  const basePoints = 10;
  const boost = getCheckInBoost(tier);
  
  // Return points with boost applied
  return Math.floor(basePoints * boost);
};

/**
 * Calculate achievement points based on check-in milestones
 * @param checkinCount Number of check-ins
 * @returns Total achievement points
 */
export const calculateAchievementPoints = (checkinCount: number): number => {
  let points = 0;
  
  // Milestone rewards
  if (checkinCount >= 1) points += 50;  // First check-in
  if (checkinCount >= 7) points += 50;  // 7 days streak
  if (checkinCount >= 50) points += 50; // 50 days milestone
  if (checkinCount >= 100) points += 200; // 100 days milestone
  
  return points;
};

/**
 * Calculate badge points based on highest tier
 * @param highestTier Highest badge tier owned
 * @returns Badge points bonus
 */
export const calculateBadgePoints = (highestTier: number): number => {
  // Badge tier point values
  const tierPoints = [20, 30, 50, 70, 100]; // Updated values
  
  // Return points if tier is valid, otherwise 0
  return highestTier >= 0 && highestTier < tierPoints.length 
    ? tierPoints[highestTier] 
    : 0;
};

/**
 * Calculate a single check-in's points based on tier at check-in time
 * @param tierAtCheckin Badge tier at the time of check-in
 * @returns Points earned for that check-in
 */
export const calculateSingleCheckinPoints = (tierAtCheckin: number): number => {
  const basePoints = 10; // Base points per check-in
  const boost = getCheckInBoost(tierAtCheckin);
  
  // Apply boost and return points (rounded down to nearest integer)
  return Math.floor(basePoints * boost);
};

/**
 * Calculate total points from all sources
 * @param checkinPoints Total points from check-ins
 * @param achievementPoints Points from achievements
 * @param badgePoints Points from badge tiers
 * @returns Total points
 */
export const calculateTotalPoints = (
  checkinPoints: number, 
  achievementPoints: number, 
  badgePoints: number
): number => {
  return checkinPoints + achievementPoints + badgePoints;
};

/**
 * Get tier color for UI display
 * @param tier Badge tier
 * @returns HEX color code
 */
export const getTierColor = (tier: number): string => {
  if (tier < 0) return "#6b7280"; // Gray for no tier
  
  const tierColors = [
    "#10B981", // Common - Emerald
    "#3B82F6", // Uncommon - Blue
    "#8B5CF6", // Rare - Purple
    "#EC4899", // Epic - Pink
    "#F59E0B"  // Legendary - Amber
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

/**
 * Calculate total points from raw checkin count and badge tier
 * @param checkinCount Number of check-ins
 * @param highestTier Highest badge tier
 * @returns Total points
 */
export const calculateTotalPointsFromRaw = (
  checkinCount: number,
  highestTier: number
): number => {
  const baseCheckinPoints = checkinCount * 10;
  // Apply boost based on tier if available
  const checkinPoints = checkinCount > 0 
    ? Array(checkinCount).fill(0).reduce((sum) => sum + calculateSingleCheckinPoints(-1), 0)
    : 0;
  
  const achievementPoints = calculateAchievementPoints(checkinCount);
  const badgePoints = calculateBadgePoints(highestTier);
  
  return checkinPoints + achievementPoints + badgePoints;
};