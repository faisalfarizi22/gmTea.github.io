import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../mongodb/connection';
import User from '../../../mongodb/models/User';
import Checkin from '../../../mongodb/models/Checkin';
import { validatePagination, getSafeErrorMessage } from '../../../mongodb/utils/validators';
import mongoose from 'mongoose';

// Define interface for user data with rank
interface UserWithRank {
  address: string;
  username?: string | null;
  highestBadgeTier: number;
  checkinCount: number;
  lastCheckin?: Date;
  rank: number;
  [key: string]: any; // Allow other properties
}

/**
 * API endpoint untuk mendapatkan leaderboard berdasarkan jumlah check-in
 * GET /api/leaderboard/checkins
 * - Memastikan konsistensi antara rank di "Jump to My Rank" dan tabel
 * - Menggunakan metode perhitungan rank yang sama di seluruh aplikasi
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
    
    // Get verify and refresh parameters
    const shouldVerify = req.query.verify === 'true';
    const forceRefresh = req.query.refresh === 'true';
    
    // Set appropriate cache headers
    if (forceRefresh) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else {
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    }
    
    // Parse pagination parameters
    const { limit, skip } = validatePagination(
      req.query.page,
      req.query.limit,
      10 // Default 10 users per page
    );
    
    console.log(`Loading checkins leaderboard (page=${req.query.page}, limit=${limit}, skip=${skip}, userAddress=${req.query.userAddress || 'none'}, forceRefresh=${forceRefresh})`);
    
    // STEP 1: RETRIEVE ALL USERS WITH CHECKINS > 0
    // This is key for consistent ranking - we get all users first, then sort them properly
    const rawUsersData = await User.find({ 
      checkinCount: { $gt: 0 } 
    })
    .select('address username highestBadgeTier checkinCount lastCheckin')
    .sort({ checkinCount: -1 })
    .lean();
    
    // STEP 2: CONVERT TO UserWithRank TYPE
    // This fixes TypeScript error by explicitly adding rank property
    const allUsersWithCheckins: UserWithRank[] = rawUsersData.map(user => ({
      ...user,
      username: user.username || null,
      highestBadgeTier: user.highestBadgeTier || -1,
      rank: 0 // Will be assigned in next step
    }));
    
    // STEP 3: VERIFY CHECKIN COUNTS IF NEEDED
    // For users in the first page or when explicitly requested
    if (shouldVerify || skip === 0 || forceRefresh) {
      for (let i = 0; i < Math.min(limit, allUsersWithCheckins.length); i++) {
        const user = allUsersWithCheckins[i];
        
        // Verify count from Checkin collection
        const actualCount = await Checkin.countDocuments({
          address: user.address.toLowerCase()
        });
        
        // If counts don't match, update in the database
        if (actualCount !== user.checkinCount) {
          console.log(`Fixing checkin count for ${user.address}: DB=${user.checkinCount}, Actual=${actualCount}`);
          
          await User.updateOne(
            { address: user.address },
            { $set: { checkinCount: actualCount } }
          );
          
          // Update in our local array
          user.checkinCount = actualCount;
        }
      }
      
      // Re-sort after verification
      allUsersWithCheckins.sort((a, b) => b.checkinCount - a.checkinCount);
    }
    
    // STEP 4: ASSIGN CONSISTENT RANKS TO ALL USERS
    // Assign ranks based on position in the sorted array
    for (let i = 0; i < allUsersWithCheckins.length; i++) {
      allUsersWithCheckins[i].rank = i + 1;
    }
    
    // STEP 5: GET CURRENT PAGE OF USERS
    const paginatedUsers = allUsersWithCheckins.slice(skip, skip + limit);
    
    // STEP 6: FIND USER RANK IF REQUESTED
    let userRank = null;
    if (req.query.userAddress) {
      const userAddress = (req.query.userAddress as string).toLowerCase();
      
      // Find user's entry in the FULL list
      const userEntry = allUsersWithCheckins.find(
        user => user.address.toLowerCase() === userAddress
      );
      
      if (userEntry) {
        // Set the rank directly from our calculated ranks
        userRank = userEntry.rank;
        console.log(`Found user ${userAddress} at rank ${userRank}`);
      }
    }
    
    // Total count for pagination
    const totalCount = allUsersWithCheckins.length;
    
    // Format the response data with consistent ranks
    const formattedUsers = paginatedUsers.map(user => ({
      address: user.address,
      username: user.username || null,
      highestBadgeTier: user.highestBadgeTier || -1,
      checkinCount: user.checkinCount,
      lastCheckin: user.lastCheckin ? user.lastCheckin.toISOString() : null,
      rank: user.rank // Use the rank we calculated
    }));
    
    // Return response
    return res.status(200).json({
      users: formattedUsers,
      pagination: {
        total: totalCount,
        limit,
        skip,
        hasMore: skip + formattedUsers.length < totalCount,
        page: Math.floor(skip / limit) + 1,
        totalPages: Math.ceil(totalCount / limit)
      },
      userRank, // The user's rank in the complete list
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in leaderboard API:', error);
    return res.status(500).json({ message: getSafeErrorMessage(error) });
  }
}