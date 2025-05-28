import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../mongodb/connection';
import User from '../mongodb/models/User';
import Checkin from '../mongodb/models/Checkin';

/**
 * Middleware to fix common database issues
 * - Inconsistencies between User.checkinCount and actual check-ins
 */
const dbFix = async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  // Skip this middleware for non-leaderboard endpoints
  if (!req.url?.includes('/api/leaderboard') && !req.url?.includes('/api/users')) {
    return next();
  }
  
  // Check if we should run the fix (based on query param or random chance)
  // This helps spread the fix over time without impacting performance too much
  const shouldRunFix = req.query.fix === 'true' || Math.random() < 0.1; // 10% chance
  
  if (!shouldRunFix) {
    return next();
  }
  
  try {
    await dbConnect();
    
    // Fix for high-priority addresses (top 10)
    const topUsers = await User.find({ checkinCount: { $gt: 0 } })
      .sort({ checkinCount: -1 })
      .limit(10);
    
    for (const user of topUsers) {
      const actualCheckinCount = await Checkin.countDocuments({ 
        address: user.address.toLowerCase() 
      });
      
      if (actualCheckinCount !== user.checkinCount) {
        console.log(`[DB Fix] Fixing checkin count for ${user.address}: ${user.checkinCount} -> ${actualCheckinCount}`);
        
        await User.updateOne(
          { _id: user._id },
          { $set: { checkinCount: actualCheckinCount } }
        );
      }
    }
  } catch (error) {
    console.error('[DB Fix] Error in database fix middleware:', error);
    // Don't fail the request if middleware fails
  }
  
  // Continue with the request
  next();
};

export default dbFix;