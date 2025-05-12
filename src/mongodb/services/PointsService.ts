// src/mongodb/services/PointsService.ts
import dbConnect from '../connection';
import User from '../models/User';
import PointsHistory from '../models/PointsHistory';
import Badge from '../models/Badge';
import { docVal } from '../utils/documentHelper';

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
   * Add points to a user
   */
  static async addPointsToUser(
    address: string,
    points: number,
    reason: string,
    source: 'checkin' | 'achievement' | 'referral' | 'other' = 'other'
  ) {
    await dbConnect();
    
    const normalizedAddress = address.toLowerCase();
    
    // Update user's total points
    await User.findOneAndUpdate(
      { address: normalizedAddress },
      { $inc: { points } },
      { upsert: true }
    );
    
    // Record points history
    return PointsHistory.create({
      address: normalizedAddress,
      points,
      reason,
      source,
      timestamp: new Date()
    });
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
      .select('address username points highestBadgeTier');
    
    return users.map((user, index) => ({
      rank: skip + index + 1,
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
    
    // Count users with more points
    const higherPointsCount = await User.countDocuments({
      points: { $gt: docVal(user, 'points', 0) }
    });
    
    // Rank is 1-based
    return higherPointsCount + 1;
  }
  
  /**
   * Calculate points breakdown for a user
   */
  static async getUserPointsBreakdown(address: string) {
    await dbConnect();
    
    const normalizedAddress = address.toLowerCase();
    
    // Get user data
    const user = await User.findOne({ address: normalizedAddress });
    if (!user) {
      return {
        total: 0,
        checkins: 0,
        badges: 0,
        referrals: 0,
        achievements: 0
      };
    }
    
    // Get points history by source
    const pointsBySource = await PointsHistory.aggregate([
      { $match: { address: normalizedAddress } },
      { $group: { 
          _id: "$source", 
          points: { $sum: "$points" } 
        }
      }
    ]);
    
    // Convert to a more readable format
    const breakdown = {
      total: docVal(user, 'points', 0),
      checkins: 0,
      badges: 0,
      referrals: 0,
      achievements: 0
    };
    
    // Populate the breakdown
    pointsBySource.forEach(item => {
      switch (item._id) {
        case 'checkin':
          breakdown.checkins = item.points;
          break;
        case 'achievement':
          breakdown.achievements = item.points;
          break;
        case 'referral':
          breakdown.referrals = item.points;
          break;
      }
    });
    
    // Calculate badge points if not in the history
    if (breakdown.badges === 0) {
      const badgeCount = await Badge.countDocuments({ owner: normalizedAddress });
      if (badgeCount > 0) {
        // Estimate badge points based on tier
        const highestBadge = await Badge.findOne({ owner: normalizedAddress })
          .sort({ tier: -1 })
          .limit(1);
          
        if (highestBadge) {
          // Simple estimation formula
          const tierPoints = [50, 100, 200, 500, 1000];
          breakdown.badges = highestBadge.tier >= 0 && highestBadge.tier < tierPoints.length 
            ? tierPoints[highestBadge.tier] 
            : 0;
        }
      }
    }
    
    return breakdown;
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
    // Get total points awarded
    PointsHistory.aggregate([
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
          } 
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