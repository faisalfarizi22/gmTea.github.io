// src/pages/api/users/[address].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { isValidAddress, getSafeErrorMessage } from '../../../mongodb/utils/validators';
import { formatAddress } from '../../../mongodb/utils/formatters';
import UserService from '../../../mongodb/services/UserService';
import BadgeService from '../../../mongodb/services/BadgeService';
import CheckinService from '../../../mongodb/services/CheckinService';
import ReferralService from '../../../mongodb/services/ReferralService';
import PointsService from '../../../mongodb/services/PointsService';
import dbConnect from '../../../mongodb/connection';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
    
    // Normalize address
    const normalizedAddress = formatAddress(address);
    
    // Connect to database
    await dbConnect();
    
    // Get user details
    const user = await UserService.getUserByAddress(normalizedAddress);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get additional user data
    const [
      badges, 
      recentCheckins, 
      referrals, 
      rank, 
      totalCheckins,
      pointsBreakdown
    ] = await Promise.all([
      BadgeService.getUserBadges(normalizedAddress),
      CheckinService.getUserCheckins(normalizedAddress, 5), // Get 5 most recent checkins
      ReferralService.getUserReferrals(normalizedAddress),
      PointsService.getUserRank(normalizedAddress),
      CheckinService.getUserCheckinCount(normalizedAddress),
      PointsService.getUserPointsBreakdown(normalizedAddress)
    ]);
    
    // If total checkins doesn't match user.checkinCount, update the user record
    if (totalCheckins !== user.checkinCount) {
      await UserService.updateCheckinCount(normalizedAddress, totalCheckins);
    }
    
    // Add cache control headers
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    
    // Return comprehensive user data
    return res.status(200).json({
      user: {
        address: user.address,
        username: user.username,
        highestBadgeTier: user.highestBadgeTier,
        checkinCount: totalCheckins, // Use the actual count from the checkins collection
        points: user.points,
        rank,
        lastCheckin: user.lastCheckin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      badges,
      recentCheckins,
      referrals: {
        total: referrals.length,
        recent: referrals.slice(0, 5) // Get 5 most recent referrals
      },
      points: pointsBreakdown
    });
    
  } catch (error) {
    console.error('Error in user API:', error);
    return res.status(500).json({ message: getSafeErrorMessage(error) });
  }
}