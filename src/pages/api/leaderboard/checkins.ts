import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../mongodb/connection';
import User from '../../../mongodb/models/User';
import Checkin from '../../../mongodb/models/Checkin';
import { validatePagination, getSafeErrorMessage } from '../../../mongodb/utils/validators';

/**
 * API endpoint untuk mendapatkan leaderboard berdasarkan jumlah check-in
 * GET /api/leaderboard/checkins
 * - Mengverifikasi checkinCount dari User dengan jumlah aktual di koleksi Checkin
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
    
    // Get verify parameter (optional)
    const shouldVerify = req.query.verify === 'true';
    
    // Parse pagination parameters
    const { limit, skip } = validatePagination(
      req.query.page,
      req.query.limit,
      10 // Default 10 users per page
    );
    
    // Get users with checkinCount > 0, sorted by checkinCount (descending)
    const users = await User.find({ checkinCount: { $gt: 0 } })
      .sort({ checkinCount: -1 })
      .skip(skip)
      .limit(limit)
      .select('address username highestBadgeTier checkinCount lastCheckin');
    
    // Get total count for pagination info
    const totalCount = await User.countDocuments({ checkinCount: { $gt: 0 } });
    
    // Verify checkin counts if requested or if it's the first page
    // First page always verifies to ensure accuracy of top rankings
    const shouldVerifyCheckins = shouldVerify || skip === 0;
    
    // Process and format user data
    const formattedUsers = await Promise.all(users.map(async (user, index) => {
      const rank = skip + index + 1; // Calculate rank based on position
      
      // Verify actual checkin count if needed
      let checkinCount = user.checkinCount;
      
      if (shouldVerifyCheckins) {
        // Count actual checkins from Checkin collection
        const actualCheckinCount = await Checkin.countDocuments({ 
          address: user.address.toLowerCase() 
        });
        
        // Update user if counts don't match
        if (actualCheckinCount !== user.checkinCount) {
          console.log(`Fixing discrepancy for ${user.address}: DB count ${user.checkinCount}, Actual count ${actualCheckinCount}`);
          
          await User.updateOne(
            { _id: user._id },
            { $set: { checkinCount: actualCheckinCount } }
          );
          
          // Use verified count
          checkinCount = actualCheckinCount;
        }
      }
      
      return {
        address: user.address,
        username: user.username || null,
        highestBadgeTier: user.highestBadgeTier || -1,
        checkinCount: checkinCount,
        lastCheckin: user.lastCheckin ? user.lastCheckin.toISOString() : null,
        rank: rank
      };
    }));
    
    // Re-sort after verification to ensure correct order
    if (shouldVerifyCheckins) {
      formattedUsers.sort((a, b) => b.checkinCount - a.checkinCount);
    }
    
    // Calculate user rank if userAddress is provided
    let userRank = null;
    if (req.query.userAddress) {
      const userAddress = (req.query.userAddress as string).toLowerCase();
      
      // Try to find user's rank in current results first
      const userIndex = formattedUsers.findIndex(
        user => user.address.toLowerCase() === userAddress
      );
      
      if (userIndex !== -1) {
        userRank = skip + userIndex + 1;
      } else {
        // If not in current results, find user's rank by running aggregate
        const userRankData = await User.aggregate([
          { $match: { checkinCount: { $gt: 0 } } },
          { $sort: { checkinCount: -1 } },
          { 
            $group: { 
              _id: null,
              users: { 
                $push: { 
                  address: "$address", 
                  checkinCount: "$checkinCount" 
                } 
              }
            }
          },
          { 
            $project: { 
              userRank: { 
                $add: [
                  { 
                    $indexOfArray: [
                      "$users.address", 
                      userAddress
                    ] 
                  }, 
                  1
                ] 
              } 
            } 
          }
        ]);
        
        if (userRankData.length > 0 && userRankData[0].userRank > 0) {
          userRank = userRankData[0].userRank;
        }
      }
    }
    
    // Add cache control headers
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    
    // Return formatted response
    return res.status(200).json({
      users: formattedUsers,
      pagination: {
        total: totalCount,
        limit,
        skip,
        hasMore: skip + users.length < totalCount
      },
      userRank: userRank
    });
    
  } catch (error) {
    console.error('Error in leaderboard API:', error);
    return res.status(500).json({ message: getSafeErrorMessage(error) });
  }
}