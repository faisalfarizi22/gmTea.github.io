// src/pages/api/points/leaderboard.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PointsService, CheckinService } from '../../../mongodb/services';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Parse pagination parameters
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const page = parseInt(req.query.page as string, 10) || 1;
    const skip = (page - 1) * limit;
    
    // Get leaderboard data
    const leaderboard = await PointsService.getPointsLeaderboard(limit, skip);
    
    // Get total check-in count for stats
    const totalCheckins = await CheckinService.getTotalCheckinCount();
    
    // Add cache control headers
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    
    return res.status(200).json({
      leaderboard,
      pagination: {
        page,
        limit,
        skip
      },
      stats: {
        totalCheckins
      }
    });
    
  } catch (error) {
    console.error('Error in leaderboard API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}