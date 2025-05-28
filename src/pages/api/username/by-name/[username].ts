// src/pages/api/usernames/by-name/[username].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { isValidUsername, getSafeErrorMessage } from '../../../../mongodb/utils/validators';
import { formatUsername } from '../../../../mongodb/utils/formatters';
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
    const { username } = req.query;
    
    // Validate username
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ message: 'Invalid username parameter' });
    }
    
    // Format username to lowercase for lookup
    const formattedUsername = formatUsername(username);
    
    if (!isValidUsername(formattedUsername)) {
      return res.status(400).json({ message: 'Invalid username format' });
    }
    
    let address: string | null = null;
    
    // Check if we're using DB mode
    if (isUsingDBMode()) {
      try {
        // Get user from database
        const user = await UserService.getUserByUsername(formattedUsername);
        address = user?.address || null;
      } catch (dbError) {
        console.error('Database error in get address by username:', dbError);
        // Fall back to blockchain if DB fails
      }
    }
    
    // If we don't have an address from DB or DB mode is off, try blockchain
    if (address === null) {
      // Get blockchain provider
      const provider = getProvider();
      if (!provider) {
        return res.status(500).json({ message: 'Could not connect to blockchain' });
      }
      
      // Create contract instance with minimal ABI
      const usernameContract = new ethers.Contract(
        USERNAME_REGISTRY_ADDRESS || '',
        ['function getAddressByUsername(string memory username) external view returns (address)'],
        provider
      );
      
      // Get address from blockchain
      const blockchainAddress = await usernameContract.getAddressByUsername(formattedUsername);
      
      // Check if address exists (not zero address)
      address = blockchainAddress && blockchainAddress !== ethers.constants.AddressZero 
        ? blockchainAddress.toLowerCase() 
        : null;
    }
    
    // If address not found, return 404
    if (!address) {
      return res.status(404).json({ message: 'Username not found' });
    }
    
    // Add cache control headers
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    
    // Return address data
    return res.status(200).json({
      username: formattedUsername,
      address
    });
    
  } catch (error) {
    console.error('Error in get address by username API:', error);
    return res.status(500).json({ 
      message: getSafeErrorMessage(error) || 'Failed to get address for username',
      address: null
    });
  }
}