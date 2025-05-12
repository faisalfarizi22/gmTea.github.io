// src/pages/api/usernames/by-address/[address].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { isValidAddress, getSafeErrorMessage } from '../../../../mongodb/utils/validators';
import GMTeaUsernameABI from '../../../../abis/GMTeaUsernameABI.json';
import { isUsingDBMode } from '../../../../hooks/useDBMode';
import UserService from '../../../../mongodb/services/UserService';

// Contract address from environment variable
const USERNAME_REGISTRY_ADDRESS = process.env.USERNAME_REGISTRY_ADDRESS;

// Get RPC provider for blockchain interaction
const getProvider = () => {
  const rpcUrl = process.env.TEA_SEPOLIA_RPC_URL || 'https://rpc.sepolia.tea.xyz';
  return new ethers.providers.JsonRpcProvider(rpcUrl);
};

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
      return res.status(400).json({ message: 'Invalid Ethereum address' });
    }
    
    // Normalize address
    const normalizedAddress = address.toLowerCase();
    
    let username: string | null = null;
    
    // Check if we're using DB mode
    if (isUsingDBMode()) {
      try {
        // Get user from database
        const user = await UserService.getUserByAddress(normalizedAddress);
        username = user?.username || null;
      } catch (dbError) {
        console.error('Database error in get username by address:', dbError);
        // Fall back to blockchain if DB fails
      }
    }
    
    // If we don't have a username from DB or DB mode is off, try blockchain
    if (username === null) {
      // Get blockchain provider
      const provider = getProvider();
      if (!provider) {
        return res.status(500).json({ message: 'Could not connect to blockchain' });
      }
      
      // Create contract instance with minimal ABI
      const usernameContract = new ethers.Contract(
        USERNAME_REGISTRY_ADDRESS || '',
        ['function getUsernameByAddress(address user) external view returns (string memory)'],
        provider
      );
      
      // Get username from blockchain
      const blockchainUsername = await usernameContract.getUsernameByAddress(normalizedAddress);
      
      // Check if username exists
      username = blockchainUsername && blockchainUsername !== '' ? blockchainUsername : null;
    }
    
    // Add cache control headers
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    
    // Return username data
    return res.status(200).json({
      address: normalizedAddress,
      username,
      hasUsername: username !== null
    });
    
  } catch (error) {
    console.error('Error in get username by address API:', error);
    return res.status(500).json({ 
      message: getSafeErrorMessage(error) || 'Failed to get username',
      username: null,
      hasUsername: false
    });
  }
}