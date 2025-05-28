// src/pages/api/points/recalculate.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PointsService } from '../../../mongodb/services';
import { isValidAddress, getSafeErrorMessage } from '../../../mongodb/utils/validators';

/**
 * API endpoint to recalculate user points
 * This is an admin-only endpoint that should be protected in production
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get address from query or body
    const { address } = req.body;
    
    // Validate address if provided
    if (address && typeof address === 'string' && !isValidAddress(address)) {
      return res.status(400).json({ message: 'Invalid address parameter' });
    }
    
    // Recalculate points for the specific address or all users
    const usersUpdated = await PointsService.recalculateUserPoints(address);
    
    return res.status(200).json({
      success: true,
      message: address 
        ? `Points recalculated for ${address}` 
        : `Points recalculated for ${usersUpdated} users`,
      usersUpdated
    });
    
  } catch (error) {
    console.error('Error in points recalculation API:', error);
    return res.status(500).json({ message: getSafeErrorMessage(error) });
  }
}