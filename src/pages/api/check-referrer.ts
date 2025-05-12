// src/pages/api/check-referrer.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { isValidUsername } from '../../mongodb/utils/validators';
import { formatUsername } from '../../mongodb/utils/formatters';
import UserService from '../../mongodb/services/UserService';
import ReferralService from '../../mongodb/services/ReferralService';
import dbConnect from '../../mongodb/connection';

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
    
    // Validate username parameter
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ 
        message: 'Referrer username parameter is required',
        isValid: false
      });
    }
    
    // Normalize and validate the username format
    const normalizedUsername = formatUsername(username);
    
    if (!isValidUsername(normalizedUsername)) {
      return res.status(400).json({ 
        message: 'Invalid referrer username format',
        isValid: false
      });
    }
    
    // Connect to database
    await dbConnect();
    
    // Step 1: Check if referrer username exists in the database
    const referrerUser = await UserService.getUserByUsername(normalizedUsername);
    
    if (!referrerUser) {
      return res.status(404).json({ 
        message: 'Referrer username not found',
        isValid: false
      });
    }
    
    // Step 2: Check referrer's capacity (max 10 referrals)
    const referrerAddress = referrerUser.address;
    const referralCount = await ReferralService.getReferralCount(referrerAddress);
    const atCapacity = referralCount >= 10;
    
    // Add cache control headers (short cache time as capacity can change)
    res.setHeader('Cache-Control', 'private, max-age=0, s-maxage=5');
    
    return res.status(200).json({
      isValid: true,
      atCapacity,
      address: referrerAddress,
      message: atCapacity ? 'Referrer has reached maximum capacity (10 referrals)' : 'Referrer is valid'
    });
    
  } catch (error: any) {
    console.error('Error in check-referrer API:', error);
    
    // Return a safe error message
    return res.status(500).json({
      message: error?.message || 'Failed to verify referrer',
      isValid: false
    });
  }
}