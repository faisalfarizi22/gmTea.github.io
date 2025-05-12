// src/pages/api/users/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { UserService } from '../../../mongodb/services';
import { validatePagination, getSafeErrorMessage } from '../../../mongodb/utils/validators';

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
      20 // Default 20 users per page
    );
    
    // Get filter parameters
    const hasBadge = req.query.hasBadge === 'true' ? true : undefined;
    const hasUsername = req.query.hasUsername === 'true' ? true : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    
    // Get users with filters
    const users = await UserService.getUsers({
      hasBadge,
      hasUsername,
      search,
      limit,
      skip
    });
    
    // Get total count for pagination info
    const totalCount = await UserService.getUserCount({
      hasBadge,
      hasUsername,
      search
    });
    
    // Format user data for response
    const formattedUsers = users.map(user => ({
      address: user.address,
      username: user.username || null,
      highestBadgeTier: user.highestBadgeTier,
      checkinCount: user.checkinCount,
      points: user.points,
      lastCheckin: user.lastCheckin
    }));
    
    // Add cache control headers
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    
    return res.status(200).json({
      users: formattedUsers,
      pagination: {
        total: totalCount,
        limit,
        skip,
        hasMore: skip + users.length < totalCount
      }
    });
    
  } catch (error) {
    console.error('Error in users list API:', error);
    return res.status(500).json({ message: getSafeErrorMessage(error) });
  }
}