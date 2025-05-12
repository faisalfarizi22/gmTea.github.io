// src/pages/api/points/latest.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PointsService } from '../../../mongodb/services';
import { validatePagination, getSafeErrorMessage } from '../../../mongodb/utils/validators';
import { formatTimestamp, formatAddressForDisplay } from '../../../mongodb/utils/formatters';

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
    const { limit, skip } = validatePagination(
      req.query.page,
      req.query.limit,
      20 // Default 20 latest points activities per page
    );
    
    // Get source filter if provided
    const source = typeof req.query.source === 'string' ? req.query.source : undefined;
    
    // Get latest points activities across all users
    const pointsActivities = await PointsService.getLatestPointsActivities(limit, skip, source);
    
    // Format for response
    const formattedActivities = await Promise.all(pointsActivities.map(async activity => {
      // Try to get username if available
      const username = activity.user?.username || null;
      
      return {
        id: activity._id,
        address: activity.address,
        displayAddress: formatAddressForDisplay(activity.address),
        username,
        points: activity.points,
        reason: activity.reason,
        source: activity.source,
        timestamp: formatTimestamp(activity.timestamp)
      };
    }));
    
    // Get total count for pagination info
    const totalCount = await PointsService.getPointsActivitiesCount(source);
    
    // Add cache control headers
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    
    return res.status(200).json({
      activities: formattedActivities,
      pagination: {
        total: totalCount,
        limit,
        skip,
        hasMore: skip + pointsActivities.length < totalCount
      },
      stats: {
        totalActivities: totalCount
      }
    });
    
  } catch (error) {
    console.error('Error in latest points activities API:', error);
    return res.status(500).json({ message: getSafeErrorMessage(error) });
  }
}