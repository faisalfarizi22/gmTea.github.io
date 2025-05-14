// src/pages/api/leaderboard/points.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../mongodb/connection';
import User from '../../../mongodb/models/User';
import Checkin from '../../../mongodb/models/Checkin';
import PointsService from '../../../mongodb/services/PointsService';
import { validatePagination, getSafeErrorMessage } from '../../../mongodb/utils/validators';

/**
 * API endpoint untuk mendapatkan leaderboard berdasarkan jumlah points
 * GET /api/leaderboard/points
 * Menggunakan data points yang sudah dimigrasi dan konsisten
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    // Disable cache temporarily for development
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Parse pagination parameters
    const { limit, skip } = validatePagination(
      req.query.page,
      req.query.limit,
      10 // Default 10 users per page
    );
    
    // Force refresh if needed
    const forceRefresh = req.query.refresh === 'true';
    
    // Force recalculate top users if requested
    const recalculate = req.query.recalculate === 'true';
    
    console.log(`Loading points leaderboard (page=${req.query.page}, limit=${req.query.limit}, forceRefresh=${forceRefresh}, recalculate=${recalculate})`);
    
    // Get users with points > 0, sorted by points (descending)
    // We'll use lean() for better performance since we don't need Mongoose methods
    const users = await User.find({ points: { $gt: 0 } })
      .sort({ points: -1 })
      .skip(skip)
      .limit(limit)
      .select('address username highestBadgeTier points checkinCount lastCheckin rank')
      .lean();
    
    // Debug raw data
    console.log('Raw users data from DB:', users.map(u => ({
      address: u.address,
      points: u.points,
      checkinCount: u.checkinCount,
      highestBadgeTier: u.highestBadgeTier
    })));
    
    // If recalculate is requested, verify and fix points for top users
    if (recalculate) {
      // Limit the number of users to recalculate for performance reasons
      const usersToRecalculate = Math.min(users.length, 5);
      console.log(`Recalculating points for top ${usersToRecalculate} users`);
      
      for (let i = 0; i < usersToRecalculate; i++) {
        const user = users[i];
        
        // Get current points from database
        const dbPoints = user.points;
        
        // Recalculate points using PointsService
        await PointsService.recalculateSingleUserPoints(user.address);
        
        // Refresh user data after recalculation
        const updatedUser = await User.findOne({ address: user.address }).lean();
        if (updatedUser) {
          const newPoints = updatedUser.points;
          
          if (Math.abs(dbPoints - newPoints) > 1) {
            console.log(`Points updated for ${user.address}: ${dbPoints} -> ${newPoints}`);
            // Update the user object in our array
            users[i].points = newPoints;
          }
        }
      }
    }
    
    // Get total count for pagination info
    const totalCount = await User.countDocuments({ points: { $gt: 0 } });
    
    // Process user rank if requested
    let userRank = null;
    if (req.query.userAddress) {
      const userAddress = (req.query.userAddress as string).toLowerCase();
      
      // Get the user
      const user = await User.findOne({ address: userAddress }).lean();
      
      if (user) {
        console.log(`Found user: ${userAddress}, points: ${user.points}`);
        
        // Use stored rank if available (more efficient)
        if (user.rank) {
          userRank = user.rank;
          console.log(`Using stored rank: ${userRank}`);
        } else {
          // Count users with more points
          const usersWithMorePoints = await User.countDocuments({
            points: { $gt: user.points }
          });
          
          // Rank is 1-based
          userRank = usersWithMorePoints + 1;
          console.log(`Calculated rank: ${userRank}`);
        }
      } else {
        console.log(`User not found: ${userAddress}`);
      }
    }
    
    // Format data for response - without modifying points value
    const formattedUsers = users.map((user, index) => {
      const rank = user.rank || (skip + index + 1);
      
      return {
        address: user.address,
        username: user.username || null,
        highestBadgeTier: user.highestBadgeTier || -1,
        points: user.points, // Use the actual points value from database
        checkinCount: user.checkinCount || 0,
        lastCheckin: user.lastCheckin ? user.lastCheckin.toISOString() : null,
        rank: rank
      };
    });
    
    console.log('Formatted users for response:', formattedUsers.map(u => ({
      address: u.address,
      points: u.points,
      rank: u.rank
    })));
    
    // Return formatted response
    return res.status(200).json({
      users: formattedUsers,
      pagination: {
        total: totalCount,
        limit,
        skip,
        hasMore: skip + users.length < totalCount,
        page: Math.floor(skip / limit) + 1,
        totalPages: Math.ceil(totalCount / limit)
      },
      userRank,
      timestamp: new Date().toISOString() // Include timestamp for caching validation
    });
    
  } catch (error) {
    console.error('Error in points leaderboard API:', error);
    return res.status(500).json({ message: getSafeErrorMessage(error) });
  }
}