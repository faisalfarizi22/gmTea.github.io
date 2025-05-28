// src/pages/api/points/leaderboard.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../mongodb/connection';
import User from '../../../mongodb/models/User';
import Checkin from '../../../mongodb/models/Checkin';
import Badge from '../../../mongodb/models/Badge';
import { validatePagination } from '../../../mongodb/utils/validators';
import { 
  getCheckInBoost, 
  calculateAchievementPoints, 
  calculateBadgePoints 
} from '../../../utils/pointCalculation';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    // Parse pagination parameters
    const { limit, skip } = validatePagination(
      req.query.page,
      req.query.limit,
      10 // Default 10 users per page
    );
    
    // Get users with checkinCount > 0
    const users = await User.find({ checkinCount: { $gt: 0 } })
      .sort({ points: -1 })  // Sorted by stored points for initial sorting
      .limit(1000)           // Get a larger set to calculate correct points
      .select('address username highestBadgeTier checkinCount points');
    
    // Get user rank if provided
    let userRank = null;
    if (req.query.userAddress) {
      const userAddress = (req.query.userAddress as string).toLowerCase();
      
      // Add user if not in the result set
      const userExists = users.some(user => user.address.toLowerCase() === userAddress);
      if (!userExists) {
        const user = await User.findOne({ address: userAddress });
        if (user && user.checkinCount > 0) {
          users.push(user);
        }
      }
    }
    
    // Process and recalculate points for every user
    const processedUsers = await Promise.all(users.map(async (user) => {
      const address = user.address;
      
      // Get checkins for user to calculate points
      const checkins = await Checkin.find({ address })
        .sort({ checkinNumber: 1 }); // Order by checkin number for chronological calculation
      
      // Get badge acquisition timeline to understand tier at each checkin time
      const badges = await Badge.find({ owner: address })
        .sort({ mintedAt: 1 }); // Order by mint time for tier progression
      
      // Calculate total points with proper tier progression logic
      let totalPoints = 0;
      let currentTier = -1;
      let badgeTimeline = badges.map(badge => ({
        tier: badge.tier,
        timestamp: new Date(badge.mintedAt).getTime()
      }));
      
      // Sort badge timeline by timestamp
      badgeTimeline.sort((a, b) => a.timestamp - b.timestamp);
      
      // Process each checkin with the correct tier at that time
      checkins.forEach(checkin => {
        const checkinTime = new Date(checkin.blockTimestamp).getTime();
        
        // Find highest tier at checkin time
        let tierAtCheckin = -1;
        for (const badge of badgeTimeline) {
          if (badge.timestamp <= checkinTime && badge.tier > tierAtCheckin) {
            tierAtCheckin = badge.tier;
          }
        }
        
        // Calculate points for this checkin based on tier at that time
        const basePoints = 10;
        const boost = getCheckInBoost(tierAtCheckin);
        const checkinPoints = Math.floor(basePoints * boost);
        
        totalPoints += checkinPoints;
      });
      
      // Add achievement points
      totalPoints += calculateAchievementPoints(user.checkinCount);
      
      // Add badge points based on current highest tier
      const highestTier = user.highestBadgeTier || -1;
      totalPoints += calculateBadgePoints(highestTier);
      
      // Update current tier for display
      currentTier = highestTier;
      
      return {
        address: user.address,
        username: user.username || null,
        highestBadgeTier: currentTier,
        points: totalPoints,
        checkinCount: user.checkinCount
      };
    }));
    
    // Sort by points (descending)
    processedUsers.sort((a, b) => b.points - a.points);
    
    // Calculate user rank if requested
    if (req.query.userAddress) {
      const userAddress = (req.query.userAddress as string).toLowerCase();
      const userIndex = processedUsers.findIndex(user => 
        user.address.toLowerCase() === userAddress
      );
      
      if (userIndex !== -1) {
        userRank = userIndex + 1;
      }
    }
    
    // Apply pagination for response
    const paginatedUsers = processedUsers.slice(skip, skip + limit);
    
    // Return data
    res.status(200).json({
      leaderboard: paginatedUsers,
      total: processedUsers.length,
      totalUsers: await User.countDocuments({ checkinCount: { $gt: 0 } }),
      userRank
    });
    
  } catch (error) {
    console.error('Error in points leaderboard API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}