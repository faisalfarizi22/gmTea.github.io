// pages/api/checkins/[address].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../mongodb/connection';
import Checkin from '../../../mongodb/models/Checkin';

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

    // Parse pagination parameters
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const page = parseInt(req.query.page as string, 10) || 1;
    const skip = (page - 1) * limit;

    // Get checkins
    const checkins = await Checkin.find({ address: normalizedAddress })
      .sort({ blockTimestamp: -1 }) // Most recent first
      .skip(skip)
      .limit(limit);

    // Count total checkins
    const total = await Checkin.countDocuments({ address: normalizedAddress });

    // Format the response
    const formattedCheckins = checkins.map(checkin => ({
      checkinNumber: checkin.checkinNumber,
      timestamp: checkin.blockTimestamp,
      points: checkin.points || 10, // Fallback to base points if not set
      message: checkin.message || '',
      blockNumber: checkin.blockNumber,
      boost: checkin.boost || 1.0,
      tierAtCheckin: checkin.tierAtCheckin || -1,
      transactionHash: checkin.transactionHash
    }));

    // Return result
    return res.status(200).json({
      checkins: formattedCheckins,
      stats: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching checkins:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}