// src/pages/api/check-username.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { isValidUsername } from '../../mongodb/utils/validators';
import { formatUsername } from '../../mongodb/utils/formatters';
import UserService from '../../mongodb/services/UserService';
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
    
    // Validate username
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ 
        message: 'Username parameter is required', 
        isAvailable: false 
      });
    }
    
    // Normalize and validate the username format
    const normalizedUsername = formatUsername(username);
    
    if (!isValidUsername(normalizedUsername)) {
      return res.status(400).json({ 
        message: 'Username must be 3-20 characters and contain only alphanumeric characters and underscores',
        isAvailable: false
      });
    }
    
    // Connect to database
    await dbConnect();
    
    // Check if username exists in database
    const existingUser = await UserService.getUserByUsername(normalizedUsername);
    const isAvailable = !existingUser;
    
    // Add cache control headers (short cache time as availability can change)
    res.setHeader('Cache-Control', 'private, max-age=0, s-maxage=5');
    
    // Return availability status
    return res.status(200).json({
      isAvailable,
      message: isAvailable ? 'Username is available' : 'Username is already taken'
    });
    
  } catch (error: any) {
    console.error('Error in check-username API:', error);
    
    // Return a safe error message
    return res.status(500).json({ 
      message: error?.message || 'Failed to check username availability',
      isAvailable: false
    });
  }
}