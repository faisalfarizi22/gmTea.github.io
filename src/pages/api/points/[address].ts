// src/pages/api/points/[address].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { docVal } from '../../../mongodb/utils/documentHelper';
import Checkin from '../../../mongodb/models/Checkin';
import User from '../../../mongodb/models/User';
import Badge from '../../../mongodb/models/Badge';
import PointsHistory from '../../../mongodb/models/PointsHistory';
import { getCheckInBoost, calculateAchievementPoints, calculateBadgePoints } from '../../../utils/pointCalculation';
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

    // Opsi 1: Hitung ulang poin real-time untuk memastikan data terbaru
    // Ini mungkin membutuhkan waktu proses lebih lama tapi menghindari ketidakkonsistenan
    await PointsService.recalculateSingleUserPoints(normalizedAddress);
    
    // Dapatkan breakdown poin yang sudah diperbarui
    const pointsBreakdown = await PointsService.getUserPointsBreakdown(normalizedAddress);

    // Opsi 2: Jika Anda tidak ingin menghitung ulang setiap kali API dipanggil,
    // ambil data langsung dari database dengan getUserPointsBreakdown()
    // const pointsBreakdown = await PointsService.getUserPointsBreakdown(normalizedAddress);

    // Get history data for debugging and reference
    const history = await PointsHistory.find({ address: normalizedAddress })
      .sort({ timestamp: -1 })
      .limit(20);

    // Format response with rich information
    const response = {
      // Points from calculation
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
      
      // Add history (optional)
      recentHistory: history.map(entry => ({
        source: entry.source,
        reason: entry.reason,
        points: entry.points,
        timestamp: entry.timestamp.toISOString(),
        tierAtEvent: entry.tierAtEvent,
        countedInTotal: entry.source !== 'referral'
      }))
    };

    // Return the response
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching points data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}