// src/pages/api/badges/stats.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { BadgeService } from '../../../mongodb/services';
import { getSafeErrorMessage } from '../../../mongodb/utils/validators';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get badge statistics
    const stats = await BadgeService.getBadgeStats();
    
    // Add cache control headers - can be cached longer since these change less frequently
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    
    return res.status(200).json(stats);
    
  } catch (error) {
    console.error('Error in badge stats API:', error);
    return res.status(500).json({ message: getSafeErrorMessage(error) });
  }
}