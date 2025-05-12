// src/pages/api/points/[address].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PointsService } from '../../../mongodb/services';
import { isValidAddress, validatePagination, getSafeErrorMessage } from '../../../mongodb/utils/validators';
import { formatTimestamp } from '../../../mongodb/utils/formatters';

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
    
    // Parse pagination parameters for history
    const { limit, skip } = validatePagination(
      req.query.page,
      req.query.limit,
      20 // Default 20 history entries per page
    );
    
    // Get user's total points
    const totalPoints = await PointsService.getUserTotalPoints(address);
    
    // Get user's rank
    const rank = await PointsService.getUserRank(address);
    
    // Get points breakdown by category
    const breakdown = await PointsService.getUserPointsBreakdown(address);
    
    // Get points history if requested
    let history: { points: number; reason: string; source: "checkin" | "achievement" | "referral" | "other"; timestamp: string; }[] = [];
    let hasMoreHistory = false;
    
    if (req.query.history === 'true') {
      const pointsHistory = await PointsService.getUserPointsHistory(address, limit, skip);
      
      // Format history for response
      history = pointsHistory.map(entry => ({
        points: entry.points,
        reason: entry.reason,
        source: entry.source,
        timestamp: formatTimestamp(entry.timestamp)
      }));
      
      // Check if there are more history entries
      const totalHistory = await PointsService.getUserPointsHistoryCount(address);
      hasMoreHistory = skip + pointsHistory.length < totalHistory;
    }
    
    // Add cache control headers
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    
    return res.status(200).json({
      points: {
        total: totalPoints,
        rank,
        breakdown
      },
      history: req.query.history === 'true' ? {
        entries: history,
        pagination: {
          limit,
          skip,
          hasMore: hasMoreHistory
        }
      } : undefined
    });
    
  } catch (error) {
    console.error('Error in points API:', error);
    return res.status(500).json({ message: getSafeErrorMessage(error) });
  }
}