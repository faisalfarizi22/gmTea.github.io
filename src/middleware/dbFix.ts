import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../mongodb/connection';
import User from '../mongodb/models/User';
import Checkin from '../mongodb/models/Checkin';


const dbFix = async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  if (!req.url?.includes('/api/leaderboard') && !req.url?.includes('/api/users')) {
    return next();
  }
  
  const shouldRunFix = req.query.fix === 'true' || Math.random() < 0.1; 
  
  if (!shouldRunFix) {
    return next();
  }
  
  try {
    await dbConnect();
    
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
    
  }
  
  next();
};

export default dbFix;