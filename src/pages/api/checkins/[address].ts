// src/pages/api/checkins/[address].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { CheckinService } from '../../../mongodb/services';
import { validatePagination, isValidAddress, getSafeErrorMessage } from '../../../mongodb/utils/validators';
import { formatCheckinForResponse } from '../../../mongodb/utils/formatters';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { address } = req.query;
    
    // Validate address
    if (!address || typeof address !== 'string' || !isValidAddress(address)) {
      return res.status(400).json({ message: 'Invalid address parameter' });
    }
    
    // Parse pagination parameters
    const { limit, skip } = validatePagination(
      req.query.page,
      req.query.limit,
      20 // Default 20 checkins per page
    );
    
    // Get user's checkins
    const checkins = await CheckinService.getUserCheckins(address, limit, skip);
    
    // Get total count for pagination info
    const totalCount = await CheckinService.getUserCheckinCount(address);
    
    // Format checkins for response
    const formattedCheckins = checkins.map(checkin => ({
      ...formatCheckinForResponse(checkin),
      message: checkin.message || '' // Include the GM message in the response
    }));
    
    // Add cache control headers
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    
    return res.status(200).json({
      checkins: formattedCheckins,
      pagination: {
        total: totalCount,
        limit,
        skip,
        hasMore: skip + checkins.length < totalCount
      }
    });
    
  } catch (error) {
    console.error('Error in checkins API:', error);
    return res.status(500).json({ message: getSafeErrorMessage(error) });
  }
}