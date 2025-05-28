// src/pages/api/points/rank/[address].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../../mongodb/connection';
import { PointsService } from '../../../../mongodb/services';

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
    
    // Get user rank from PointsService
    const rank = await PointsService.getUserRank(address);
    
    return res.status(200).json({ rank });
    
  } catch (error) {
    console.error('Error in points rank API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}