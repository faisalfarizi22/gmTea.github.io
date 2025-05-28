// src/mongodb/services/PointsService.ts
import dbConnect from '../connection';
import User from '../models/User';
import PointsHistory from '../models/PointsHistory';
import Badge from '../models/Badge';
import { docVal } from '../utils/documentHelper';
import { getCheckInBoost, calculateAchievementPoints } from '../../utils/pointCalculation';
import Checkin from '../models/Checkin';

export default class PointsService {
  /**
   * Get points history for a user
   */
  static async getUserPointsHistory(
    address: string, 
    limit: number = 20, 
    skip: number = 0
  ) {
    await dbConnect();
    
    return PointsHistory.find({ address: address.toLowerCase() })
      .sort({ timestamp: -1 }) // Most recent first
      .skip(skip)
      .limit(limit);
  }

  /**
   * Get total points for a user
   */
  static async getUserTotalPoints(address: string): Promise<number> {
    await dbConnect();
    
    const user = await User.findOne({ address: address.toLowerCase() });
    return docVal(user, 'points', 0);
  }

  /**
   * Add points to a user - Updated to match fixPointsCalculation logic
   */
  static async addPointsToUser(
    address: string,
    points: number,
    reason: string,
    source: 'checkin' | 'achievement' | 'referral' | 'other' = 'other'
  ) {
    await dbConnect();
    
    const normalizedAddress = address.toLowerCase();
    
    // Get user's current badge tier
    const user = await User.findOne({ address: normalizedAddress });
    const currentTier = docVal(user, 'highestBadgeTier', -1);
    
    // Create points history entry with tier information
    const pointsHistoryEntry = await PointsHistory.create({
      address: normalizedAddress,
      points,
      reason,
      source,
      timestamp: new Date(),
      tierAtEvent: currentTier
    });
    
    // Only update user's total points if not a referral (matching fixPointsCalculation.ts)
    if (source !== 'referral') {
      await User.findOneAndUpdate(
        { address: normalizedAddress },
        { $inc: { points } },
        { upsert: true }
      );
    }
    
    return pointsHistoryEntry;
  }

  /**
   * Recalculate and fix user points for all users or a specific user
   * This follows the same logic as fixPointsCalculation.ts
   */
  static async recalculateUserPoints(address?: string): Promise<number> {
    await dbConnect();
    
    let totalFixed = 0;
    
    // If address is provided, fix only that user
    if (address) {
      const normalizedAddress = address.toLowerCase();
      await this.recalculateSingleUserPoints(normalizedAddress);
      totalFixed = 1;
    } else {
      // Get all users
      const users = await User.find({});
      
      // Process each user
      for (const user of users) {
        await this.recalculateSingleUserPoints(user.address);
        totalFixed++;
      }
      
      // After updating all users, recompute ranks for consistency
      await this.recalculateAllRanks();
    }
    
    return totalFixed;
  }
  
  /**
   * Helper method to recalculate points for a single user
   * Uses the same logic as fixUserPointsCalculation in fixPointsCalculation.ts
   */
  static async recalculateSingleUserPoints(address: string): Promise<void> {
    const normalizedAddress = address.toLowerCase();
    
    // Get all badges for this user sorted by mintedAt date
    const badges = await Badge.find({ owner: normalizedAddress })
      .sort({ mintedAt: 1 });
    
    // Create a timeline of badge tier changes
    const tierTimeline: { date: Date; tier: number }[] = [];
    
    // Start with no badge (-1)
    tierTimeline.push({ date: new Date(0), tier: -1 });
    
    // Add each badge mint event
    badges.forEach(badge => {
      // Only add if it's a higher tier than the previous one
      const prevTier = tierTimeline[tierTimeline.length - 1].tier;
      if (badge.tier > prevTier) {
        tierTimeline.push({ date: badge.mintedAt, tier: badge.tier });
      }
    });
    
    // Get all checkins for this user sorted by date
    const checkinRecords = await Checkin.find({ address: normalizedAddress })
      .sort({ blockTimestamp: 1 });
    
    // Track checkin points for this user
    let checkinPoints = 0;
    
    // Process each checkin
    for (const checkin of checkinRecords) {
      // Find the badge tier at the time of checkin
      let tierAtCheckin = -1;
      for (let i = tierTimeline.length - 1; i >= 0; i--) {
        if (checkin.blockTimestamp >= tierTimeline[i].date) {
          tierAtCheckin = tierTimeline[i].tier;
          break;
        }
      }
      
      // Calculate points with the correct boost
      const boost = getCheckInBoost(tierAtCheckin);
      const basePoints = 10; // Base points for each checkin
      const points = Math.floor(basePoints * boost);
      
      // Update checkin record with correct tier and points
      await Checkin.updateOne(
        { _id: checkin._id },
        { 
          $set: { 
            tierAtCheckin, 
            boost,
            points 
          } 
        }
      );
      
      // Update corresponding points history entry
      await PointsHistory.updateOne(
        { 
          address: normalizedAddress,
          source: 'checkin',
          reason: `Check-in #${checkin.checkinNumber}`
        },
        {
          $set: {
            tierAtEvent: tierAtCheckin,
            points
          }
        }
      );
      
      // Add to checkin points
      checkinPoints += points;
    }
    
    // Get badge points
    let badgePoints = 0;
    const highestBadge = await Badge.findOne({ owner: normalizedAddress })
      .sort({ tier: -1 })
      .limit(1);
      
    if (highestBadge) {
      const tierPoints = [20, 30, 50, 70, 100]; // Updated badge points values from fixPointsCalculation.ts
      badgePoints = highestBadge.tier >= 0 && highestBadge.tier < tierPoints.length 
        ? tierPoints[highestBadge.tier] 
        : 0;
    }
    
    // Calculate achievement points based on check-in count using the proper function
    const achievementPoints = calculateAchievementPoints(checkinRecords.length);
    
    // Calculate total points - Include achievement points but not referrals
    const otherPoints = achievementPoints; // Only count achievement points
    const totalPoints = checkinPoints + badgePoints + otherPoints;
    
    // Update user document with points breakdown for better tracking
    await User.findOneAndUpdate(
      { address: normalizedAddress },
      { 
        $set: { 
          points: totalPoints,
          checkinPoints, // Track points from different sources
          badgePoints,
          otherPoints,
          lastPointsUpdate: new Date()
        }
      },
      { upsert: true }
    );
  }
  
  /**
   * Recalculate rankings for all users to ensure consistency
   * Matches recalculateAllRanks in fixPointsCalculation.ts
   */
  static async recalculateAllRanks(): Promise<number> {
    try {
      // Get all users sorted by points in descending order
      const sortedUsers = await User.find({})
        .sort({ points: -1, checkinCount: -1, lastCheckin: -1 })
        .lean();
      
      // Track updated users
      let updatedCount = 0;
      
      // Assign rank to each user (1-based)
      for (let i = 0; i < sortedUsers.length; i++) {
        const user = sortedUsers[i];
        const rank = i + 1; // 1-based ranking
        
        // Update user with rank field
        const updateResult = await User.updateOne(
          { address: user.address },
          { $set: { rank } }
        );
        
        if (updateResult.modifiedCount > 0) {
          updatedCount++;
        }
      }
      
      // Create indexes on rank field if they don't exist
      await User.collection.createIndex({ rank: 1 });
      await User.collection.createIndex({ points: -1, rank: 1 });
      
      return updatedCount;
    } catch (error) {
      console.error('Error recalculating ranks:', error);
      throw error;
    }
  }

  /**
   * Calculate detailed points breakdown for a user
   * Updated to match the logic in fixPointsCalculation.ts
   */
  static async getUserPointsBreakdown(address: string) {
    await dbConnect();
    
    const normalizedAddress = address.toLowerCase();
    
    // Get user data
    const user = await User.findOne({ address: normalizedAddress });
    if (!user) {
      return {
        total: 0,
        checkins: {
          total: 0,
          boosted: 0,
          base: 0,
          boost: 1.0
        },
        badges: 0,
        referrals: 0,
        achievements: 0,
        leaderboard: 0
      };
    }
    
    // Get checkin points with detail on boosts
    const checkins = await Checkin.find({ address: normalizedAddress });
    
    let checkinTotal = 0;
    let checkinBase = 0;
    
    // Calculate checkin points based on actual stored values
    for (const checkin of checkins) {
      checkinTotal += checkin.points || 0;
      checkinBase += 10; // Base points per checkin
    }
    
    // Get average boost if there are checkins
    const averageBoost = checkins.length > 0
      ? checkinTotal / (checkins.length * 10)
      : getCheckInBoost(user.highestBadgeTier || -1);
    
    // Get badge points
    let badgePoints = 0;
    const highestBadge = await Badge.findOne({ owner: normalizedAddress })
      .sort({ tier: -1 })
      .limit(1);
      
    if (highestBadge) {
      const tierPoints = [20, 30, 50, 70, 100]; // Updated badge points values from fixPointsCalculation.ts
      badgePoints = highestBadge.tier >= 0 && highestBadge.tier < tierPoints.length 
        ? tierPoints[highestBadge.tier] 
        : 0;
    }
    
    // Calculate achievement points based on check-in count
    const achievementPoints = calculateAchievementPoints(checkins.length);
    
    // Get referral points (not counted toward total)
    const referralHistory = await PointsHistory.find({
      address: normalizedAddress,
      source: 'referral'
    });
    
    let referralPoints = 0;
    for (const entry of referralHistory) {
      referralPoints += entry.points;
    }
    
    return {
      total: docVal(user, 'points', 0),
      checkins: {
        total: checkinTotal,
        boosted: checkinTotal,
        base: checkinBase,
        boost: averageBoost
      },
      badges: badgePoints,
      referrals: referralPoints, // Not counted in total points
      achievements: achievementPoints,
      leaderboard: 0 // Not used in fixPointsCalculation.ts
    };
  }

  /**
   * Get points leaderboard
   */
  static async getPointsLeaderboard(limit: number = 10, skip: number = 0) {
    await dbConnect();
    
    const users = await User.find()
      .sort({ points: -1 }) // Descending order by points
      .skip(skip)
      .limit(limit)
      .select('address username points highestBadgeTier rank');
    
    return users.map((user, index) => ({
      rank: docVal(user, 'rank', skip + index + 1), // Gunakan docVal untuk akses rank
      address: docVal(user, 'address', ''),
      username: docVal(user, 'username', null),
      points: docVal(user, 'points', 0),
      tier: docVal(user, 'highestBadgeTier', -1)
    }));
  }

  /**
   * Get user's rank based on points
   */
  static async getUserRank(address: string): Promise<number> {
    await dbConnect();
    
    const user = await User.findOne({ address: address.toLowerCase() });
    if (!user) return 0;
    
    // Use stored rank if available (more efficient)
    const storedRank = docVal(user, 'rank', null);
    if (storedRank !== null) {
      return storedRank;
    }
    
    // Otherwise calculate dynamically
    // Count users with more points
    const higherPointsCount = await User.countDocuments({
      points: { $gt: docVal(user, 'points', 0) }
    });
    
    // Rank is 1-based
    return higherPointsCount + 1;
  }

  /**
   * Get count of points history entries for a user
   */
  static async getUserPointsHistoryCount(address: string): Promise<number> {
    await dbConnect();
    
    return PointsHistory.countDocuments({ address: address.toLowerCase() });
  }

  /**
   * Get latest points activities across all users
   */
  static async getLatestPointsActivities(
    limit: number = 20,
    skip: number = 0,
    source?: string
  ): Promise<any[]> {
    await dbConnect();
    
    // Build filter
    const filter: any = {};
    
    // Filter by source if provided
    if (source) {
      filter.source = source;
    }
    
    // Find point activities and join with user collection to get usernames
    const activities = await PointsHistory.aggregate([
      { $match: filter },
      { $sort: { timestamp: -1 } },
      { $skip: skip },
      { $limit: limit },
      // Join with users collection to get usernames
      {
        $lookup: {
          from: 'users',
          let: { userAddress: '$address' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$address', '$$userAddress'] }
              }
            },
            {
              $project: {
                username: 1,
                _id: 0
              }
            }
          ],
          as: 'user'
        }
      },
      // Convert user array to single object (or null)
      {
        $addFields: {
          user: { $arrayElemAt: ['$user', 0] }
        }
      }
    ]);
    
    return activities;
  }

  /**
   * Get count of points activities
   */
  static async getPointsActivitiesCount(source?: string): Promise<number> {
    await dbConnect();
    
    // Build filter
    const filter: any = {};
    
    // Filter by source if provided
    if (source) {
      filter.source = source;
    }
    
    return PointsHistory.countDocuments(filter);
  }

  /**
   * Get points statistics
   */
  static async getPointsStats(): Promise<any> {
    await dbConnect();
    
    // Get overall stats
    const [
      totalPoints,
      totalActivities,
      userWithMostPoints,
      sourceBreakdown,
      dailyPointsTrend
    ] = await Promise.all([
      // Get total points awarded (exclude referrals to match fixPointsCalculation)
      PointsHistory.aggregate([
        { $match: { source: { $ne: 'referral' } } },
        { $group: { _id: null, total: { $sum: "$points" } } }
      ]).then(result => result[0]?.total || 0),
      
      // Get total number of point activities
      PointsHistory.countDocuments(),
      
      // Get user with the most points
      User.findOne()
        .sort({ points: -1 })
        .select('address username points'),
      
      // Get breakdown by source
      PointsHistory.aggregate([
        { $group: { _id: "$source", total: { $sum: "$points" } } },
        { $sort: { total: -1 } }
      ]),
      
      // Get points awarded in the last 7 days, grouped by day
      PointsHistory.aggregate([
        { 
          $match: { 
            timestamp: { 
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
            },
            source: { $ne: 'referral' } // Exclude referrals to match fixPointsCalculation
          } 
        },
        {
          $group: {
            _id: { 
              $dateToString: { 
                format: "%Y-%m-%d", 
                date: "$timestamp" 
              } 
            },
            points: { $sum: "$points" },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);
    
    // Format source breakdown
    const formattedSourceBreakdown = sourceBreakdown.reduce((acc, item) => {
      acc[item._id] = item.total;
      return acc;
    }, {} as Record<string, number>);
    
    // Return compiled stats
    return {
      totalPoints,
      totalActivities,
      userWithMostPoints: userWithMostPoints 
        ? {
            address: docVal(userWithMostPoints, 'address', ''),
            username: docVal(userWithMostPoints, 'username', null),
            points: docVal(userWithMostPoints, 'points', 0)
          }
        : null,
      sourceBreakdown: formattedSourceBreakdown,
      dailyTrend: dailyPointsTrend
    };
  }
}