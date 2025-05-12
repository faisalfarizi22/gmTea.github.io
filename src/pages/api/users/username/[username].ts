// src/pages/api/users/username/[username].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { isValidUsername, getSafeErrorMessage } from '../../../../mongodb/utils/validators';
import { formatUsername } from '../../../../mongodb/utils/formatters';
import UserService from '../../../../mongodb/services/UserService';
import dbConnect from '../../../../mongodb/connection';

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
    const { username } = req.query;
    
    // Validate username
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ message: 'Invalid username parameter' });
    }
    
    // Format username to lowercase for consistent lookups
    const formattedUsername = formatUsername(username);
    
    if (!isValidUsername(formattedUsername)) {
      return res.status(400).json({ message: 'Invalid username format' });
    }
    
    // Connect to database
    await dbConnect();
    
    // Get user by username
    const user = await UserService.getUserByUsername(formattedUsername);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Add cache control headers
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    
    // Return basic user data
    return res.status(200).json({
      address: user.address,
      username: user.username,
      highestBadgeTier: user.highestBadgeTier,
      checkinCount: user.checkinCount,
      points: user.points,
      lastCheckin: user.lastCheckin
    });
    
  } catch (error) {
    console.error('Error in username lookup API:', error);
    return res.status(500).json({ message: getSafeErrorMessage(error) });
  }
}