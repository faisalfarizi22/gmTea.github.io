// src/pages/api/register.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { isValidUsername, isValidAddress } from '../../mongodb/utils/validators';
import { formatUsername, formatAddress } from '../../mongodb/utils/formatters';
import UserService from '../../mongodb/services/UserService';
import ReferralService from '../../mongodb/services/ReferralService';
import dbConnect from '../../mongodb/connection';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  try {
    const { address, username, referrerUsername, txHash } = req.body;
    
    // Validate request body
    if (!address || !username || !referrerUsername || !txHash) {
      return res.status(400).json({ 
        success: false,
        message: 'Address, username, referrerUsername, and txHash are all required' 
      });
    }
    
    // Validate address
    if (!isValidAddress(address)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid Ethereum address' 
      });
    }
    
    // Normalize and validate usernames
    const normalizedAddress = formatAddress(address);
    const normalizedUsername = formatUsername(username);
    const normalizedReferrerUsername = formatUsername(referrerUsername);
    
    if (!isValidUsername(normalizedUsername)) {
      return res.status(400).json({ 
        success: false,
        message: 'Username must be 3-20 characters and contain only alphanumeric characters and underscores' 
      });
    }
    
    if (!isValidUsername(normalizedReferrerUsername)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid referrer username format' 
      });
    }
    
    // Connect to database
    await dbConnect();
    
    // Check if user already exists with the address
    const existingUser = await UserService.getUserByAddress(normalizedAddress);
    
    // Only check if the user has already set a username, not just if they exist
    if (existingUser && existingUser.username) {
      return res.status(409).json({ 
        success: false,
        message: 'User already has a username set' 
      });
    }
    
    // Check if username is already taken
    const existingUsername = await UserService.getUserByUsername(normalizedUsername);
    if (existingUsername) {
      return res.status(409).json({ 
        success: false,
        message: 'Username is already taken' 
      });
    }
    
    // Check if referrer exists
    const referrerUser = await UserService.getUserByUsername(normalizedReferrerUsername);
    if (!referrerUser) {
      return res.status(404).json({ 
        success: false,
        message: 'Referrer username not found' 
      });
    }
    
    // Check referrer capacity
    const referralCount = await ReferralService.getReferralCount(referrerUser.address);
    if (referralCount >= 10) {
      return res.status(409).json({ 
        success: false,
        message: 'Referrer has reached maximum capacity (10 referrals)' 
      });
    }
    
    // Create or update user in database after blockchain registration
    try {
      // Wrap this in a database transaction
      const session = await dbConnect().then(mongoose => mongoose.startSession());
      
      try {
        session.startTransaction();
        
        // Create or update the user
        const userData = {
          address: normalizedAddress,
          username: normalizedUsername,
          referrer: referrerUser.address
        };
        
        // If it's a new user, set default values
        if (!existingUser) {
          Object.assign(userData, {
            highestBadgeTier: 0,
            checkinCount: 0,
            points: 0,
            lastCheckin: null
          });
        }
        
        // Save user to database
        const savedUser = await UserService.createOrUpdateUser(userData);
        
        // Create referral relationship in database
        const timestamp = new Date();
        await ReferralService.createReferral({
          referrer: referrerUser.address,
          referee: normalizedAddress,
          txHash,
          timestamp
        });
        
        // Commit the transaction
        await session.commitTransaction();
        
        return res.status(201).json({
          success: true,
          txHash,
          message: 'User registered successfully',
          user: {
            address: savedUser.address,
            username: savedUser.username
          }
        });
      } catch (error) {
        // If any operation fails, abort the transaction
        await session.abortTransaction();
        throw error;
      } finally {
        // End the session
        session.endSession();
      }
    } catch (error) {
      console.error('Transaction error in register API:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to register user and create referral relationship'
      });
    }
    
  } catch (error: any) {
    console.error('Error in register API:', error);
    return res.status(500).json({ 
      success: false,
      message: error?.message || 'Failed to register user'
    });
  }
}