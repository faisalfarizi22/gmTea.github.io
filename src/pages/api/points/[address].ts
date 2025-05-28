// src/pages/api/points/[address].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { docVal } from '../../../mongodb/utils/documentHelper';
import User from '../../../mongodb/models/User';
import PointsHistory from '../../../mongodb/models/PointsHistory';
import dbConnect from '../../../mongodb/connection';
import PointsService from '../../../mongodb/services/PointsService';

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

    // Hapus recalculation pada setiap request
    // Ambil data langsung dari database yang sudah teragregasi
    const pointsBreakdown = await PointsService.getUserPointsBreakdown(normalizedAddress);

    // Get history data (dengan limit yang sama)
    const history = await PointsHistory.find({ address: normalizedAddress })
      .sort({ timestamp: -1 })
      .limit(20);

    // Format response dengan informasi yang sama
    const response = {
      // Points breakdown
      ...pointsBreakdown,
      
      // User info
      userInfo: {
        address: user.address,
        username: user.username,
        highestBadgeTier: user.highestBadgeTier,
        checkinCount: user.checkinCount,
        lastCheckin: user.lastCheckin ? user.lastCheckin.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
        rank: docVal(user, 'rank', null)
      },
      
      // Recent history
      recentHistory: history.map(entry => ({
        source: entry.source,
        reason: entry.reason,
        points: entry.points,
        timestamp: entry.timestamp.toISOString(),
        tierAtEvent: entry.tierAtEvent,
        countedInTotal: entry.source !== 'referral'
      }))
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching points data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}