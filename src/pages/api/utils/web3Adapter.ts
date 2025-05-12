// src/pages/api/utils/web3Adapter.ts
import { ethers } from 'ethers';
import { formatAddress } from '../../../mongodb/utils/formatters';

// This is a server-side utility to interact with blockchain contracts
// It provides a simplified interface for API routes to make blockchain calls

// Initialize provider - this should match your frontend provider configuration
const getProvider = () => {
  // Use environment variables for RPC URL
  const rpcUrl = process.env.RPC_URL || 'https://rpc.sepolia.tea.xyz';
  
  try {
    return new ethers.providers.JsonRpcProvider(rpcUrl);
  } catch (error) {
    console.error('Failed to initialize Web3 provider:', error);
    return null;
  }
};

// Contract addresses - should match frontend addresses
const CONTRACT_ADDRESSES = {
  username: process.env.USERNAME_CONTRACT_ADDRESS,
  referral: process.env.REFERRAL_CONTRACT_ADDRESS,
};

// Load contract ABIs
const usernameAbi = [
  'function register(string memory username) external',
  'function isUsernameAvailable(string memory username) external view returns (bool)',
  'function getAddressByUsername(string memory username) external view returns (address)',
  'function getUsernameByAddress(address user) external view returns (string memory)'
];

const referralAbi = [
  'function registerWithReferral(address referrer) external',
  'function getReferralStats(address referrer) external view returns (uint256 totalReferrals, uint256 claimedReferrals)',
  'function hasReferrer(address user) external view returns (bool)'
];

// Get contract instances
const getUsernameContract = (provider: ethers.providers.Provider) => {
  return new ethers.Contract(CONTRACT_ADDRESSES.username || '', usernameAbi, provider);
};

const getReferralContract = (provider: ethers.providers.Provider) => {
  return new ethers.Contract(CONTRACT_ADDRESSES.referral || '', referralAbi, provider);
};

// Utility functions for blockchain interactions

/**
 * Check if a username is available on the blockchain
 */
export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  try {
    const provider = getProvider();
    if (!provider) throw new Error('Provider not available');
    
    const contract = getUsernameContract(provider);
    return await contract.isUsernameAvailable(username);
  } catch (error) {
    console.error('Error checking username availability:', error);
    throw error;
  }
};

/**
 * Get address by username from the blockchain
 */
export const getAddressByUsername = async (username: string): Promise<string | null> => {
  try {
    const provider = getProvider();
    if (!provider) throw new Error('Provider not available');
    
    const contract = getUsernameContract(provider);
    const address = await contract.getAddressByUsername(username);
    
    // Check if address is zero address (indicating username doesn't exist)
    if (address === ethers.constants.AddressZero) {
      return null;
    }
    
    return formatAddress(address);
  } catch (error) {
    console.error('Error getting address by username:', error);
    return null;
  }
};

/**
 * Get referral stats for a referrer
 */
export const getReferralStats = async (address: string): Promise<{ totalReferrals: number; claimedReferrals: number }> => {
  try {
    const provider = getProvider();
    if (!provider) throw new Error('Provider not available');
    
    const contract = getReferralContract(provider);
    const stats = await contract.getReferralStats(address);
    
    return {
      totalReferrals: stats.totalReferrals.toNumber(),
      claimedReferrals: stats.claimedReferrals.toNumber()
    };
  } catch (error) {
    console.error('Error getting referral stats:', error);
    return { totalReferrals: 0, claimedReferrals: 0 };
  }
};

/**
 * Check if user has a referrer
 */
export const hasReferrer = async (address: string): Promise<boolean> => {
  try {
    const provider = getProvider();
    if (!provider) throw new Error('Provider not available');
    
    const contract = getReferralContract(provider);
    return await contract.hasReferrer(address);
  } catch (error) {
    console.error('Error checking if user has referrer:', error);
    return false;
  }
};

// Export utility functions
export default {
  getProvider,
  getUsernameContract,
  getReferralContract,
  isUsernameAvailable,
  getAddressByUsername,
  getReferralStats,
  hasReferrer
};