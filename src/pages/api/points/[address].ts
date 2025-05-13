// pages/api/points/[address].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { docVal } from '../../../mongodb/utils/documentHelper';
import Checkin from '../../../mongodb/models/Checkin';
import User from '../../../mongodb/models/User';
import Badge from '../../../mongodb/models/Badge';
import PointsHistory from '../../../mongodb/models/PointsHistory';
import { getCheckInBoost } from '../../../utils/pointCalculation';
import dbConnect from '../../../mongodb/connection';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { address } = req.query;
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ message: 'Invalid address parameter' });
    }

    await dbConnect();
    const normalizedAddress = address.toLowerCase();

    // Get user data
    const user = await User.findOne({ address: normalizedAddress });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get checkins to calculate points
    const checkins = await Checkin.find({ address: normalizedAddress });
    
    // Calculate total checkin points by summing points from each checkin
    const checkinPoints = checkins.reduce((sum, checkin) => {
      return sum + (checkin.points || 10); // Fallback to 10 if points not set
    }, 0);

    // Calculate achievement points
    const checkinCount = user.checkinCount || checkins.length;
    let achievementPoints = 0;
    if (checkinCount >= 1) achievementPoints += 50;
    if (checkinCount >= 7) achievementPoints += 50;
    if (checkinCount >= 50) achievementPoints += 50;
    if (checkinCount >= 100) achievementPoints += 200;

    // Get badge tier points
    const highestBadgeTier = user.highestBadgeTier || -1;
    const tierPoints = [20, 30, 50, 70, 100];
    const badgePoints = highestBadgeTier >= 0 && highestBadgeTier < tierPoints.length 
      ? tierPoints[highestBadgeTier] 
      : 0;

    // Calculate total points
    const totalPoints = checkinPoints + achievementPoints + badgePoints;

    // Get breakdown by source from PointsHistory
    const pointsBySource = await PointsHistory.aggregate([
      { $match: { address: normalizedAddress } },
      { $group: { 
          _id: "$source", 
          points: { $sum: "$points" } 
        }
      }
    ]);

    // Format response
    const response = {
      total: totalPoints,
      breakdown: {
        checkins: checkinPoints,
        achievements: achievementPoints,
        badges: badgePoints
      },
      sources: pointsBySource.map(item => ({
        source: item._id,
        points: item.points
      }))
    };

    // Return the response
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching points data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}