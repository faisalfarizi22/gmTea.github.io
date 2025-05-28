import { ethers } from "ethers";
import GMOnchainABI from "../abis/GMOnchainABI.json";
import { CONTRACT_ADDRESS, TEA_SEPOLIA_CHAIN, TEA_SEPOLIA_CHAIN_ID } from "./constants";
import { getUserLeaderboardRank } from "./leaderboradUtils";

// Add the deployment block constant
const DEPLOY_BLOCK = 1155300;

/**
 * Checks if code is running in browser environment
 * Used to prevent SSR issues with window object
 */
const isBrowser = typeof window !== "undefined";

/**
 * Get Ethereum provider from window object
 * @returns Web3Provider or null if not available
 */
export const getProvider = () => {
  if (!isBrowser) return null;
  
  const ethereum = (window as any).ethereum;
  if (!ethereum) return null;
  
  return new ethers.providers.Web3Provider(ethereum, "any"); // "any" is important here
};

/**
 * Connect to wallet and request account access
 * @returns Object containing signer, address and chainId
 */
export const connectWallet = async () => {
  try {
    if (!isBrowser) throw new Error("Cannot connect wallet server-side");
    
    const ethereum = (window as any).ethereum;
    if (!ethereum) throw new Error("No Ethereum provider found. Please install MetaMask.");
    
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts returned from wallet");
    }
    
    const provider = new ethers.providers.Web3Provider(ethereum, "any");
    
    const signer = provider.getSigner();
    const address = accounts[0]; 
    
    const network = await provider.getNetwork();
    const chainId = network.chainId;
    
    return { signer, address, chainId, provider };
  } catch (error) {
    console.error("Error connecting wallet:", error);
    throw error;
  }
};

/**
 * Switch to Tea Sepolia network
 */
export const switchToTeaSepolia = async () => {
  try {
    const ethereum = (window as any).ethereum;
    if (!ethereum) throw new Error("No Ethereum provider found");
    
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: TEA_SEPOLIA_CHAIN.chainId }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [TEA_SEPOLIA_CHAIN],
        });
      } else {
        throw switchError;
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error switching network:", error);
    throw error;
  }
};

/**
 * Get contract instance
 * @param signerOrProvider Signer or Provider to use with contract
 * @returns Contract instance
 */
export const getContract = (signerOrProvider: ethers.Signer | ethers.providers.Provider) => {
  return new ethers.Contract(CONTRACT_ADDRESS, GMOnchainABI, signerOrProvider);
};

/**
 * Format timestamp to human-readable date
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted date string
 */
export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

/**
 * Format Ethereum address to shorter version
 * @param address Full Ethereum address
 * @returns Shortened address with format "0x1234...5678"
 */
export const formatAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

/**
 * Format Ethereum address to shorter version
 * @param address Full Ethereum address
 * @returns Shortened address with format "0x1234...5678"
 */
export const fullAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address}`;
};

/**
 * Format seconds to readable time string
 * @param seconds Time in seconds
 * @returns Formatted time string (e.g. "1d 12:34:56" or "00:45:30")
 */
export const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return "Available now";
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  const format = (num: number) => num.toString().padStart(2, '0');
  
  if (days > 0) {
    return `${days}d ${format(hours)}:${format(minutes)}:${format(remainingSeconds)}`;
  } else {
    return `${format(hours)}:${format(minutes)}:${format(remainingSeconds)}`;
  }
};

/**
 * Check if wallet is connected
 * @returns Promise<boolean> True if wallet is connected
 */
export const isWalletConnected = async (): Promise<boolean> => {
  try {
    const provider = getProvider();
    if (!provider) return false;
    
    const accounts = await provider.listAccounts();
    return accounts.length > 0;
  } catch (error) {
    console.error("Error checking wallet connection:", error);
    return false;
  }
};

/**
 * Get wallet balance
 * @param address Wallet address
 * @returns Promise<string> Formatted balance in ETH
 */
export const getWalletBalance = async (address: string): Promise<string> => {
  try {
    const provider = getProvider();
    if (!provider || !address) return "0.0";
    
    const balance = await provider.getBalance(address);
    return ethers.utils.formatEther(balance);
  } catch (error) {
    console.error("Error getting wallet balance:", error);
    return "0.0";
  }
};

/**
 * Check if network is Tea Sepolia Testnet
 * @returns Promise<boolean> True if on correct network
 */
export const isTeaSepoliaNetwork = async (): Promise<boolean> => {
  try {
    const provider = getProvider();
    if (!provider) return false;
    
    const network = await provider.getNetwork();
    return network.chainId === TEA_SEPOLIA_CHAIN_ID;
  } catch (error) {
    console.error("Error checking network:", error);
    return false;
  }
};

/**
 * Get total global checkins directly from blockchain using the exact DEPLOY_BLOCK
 * @param contract The GMOnchain contract
 * @returns Promise<number> Total global check-ins
 */
export const getTotalCheckins = async (contract: ethers.Contract): Promise<number> => {
  try {
    const provider = contract.provider;
    if (!provider) return 0;
    
    const eventSignature = ethers.utils.id("CheckinCompleted(address,uint256,string,uint256)");
    
    const currentBlock = await provider.getBlockNumber();
    console.log(`Scanning from block ${DEPLOY_BLOCK} to ${currentBlock}`);
    
    const CHUNK_SIZE = 10000;
    let totalCount = 0;
    
    for (let fromBlock = DEPLOY_BLOCK; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
      const toBlock = Math.min(currentBlock, fromBlock + CHUNK_SIZE - 1);
      
      try {
        const logs = await provider.getLogs({
          address: contract.address,
          topics: [eventSignature],
          fromBlock,
          toBlock
        });
        
        totalCount += logs.length;
        console.log(`Processed blocks ${fromBlock}-${toBlock}: Found ${logs.length} events (Running total: ${totalCount})`);
      } catch (error) {
        console.warn(`Error querying logs for blocks ${fromBlock}-${toBlock}:`, error);
        
        if (CHUNK_SIZE > 1000) {
          const smallerChunkSize = CHUNK_SIZE / 5;
          
          for (let smallFromBlock = fromBlock; smallFromBlock <= toBlock; smallFromBlock += smallerChunkSize) {
            const smallToBlock = Math.min(toBlock, smallFromBlock + smallerChunkSize - 1);
            
            try {
              const smallerLogs = await provider.getLogs({
                address: contract.address,
                topics: [eventSignature],
                fromBlock: smallFromBlock,
                toBlock: smallToBlock
              });
              
              totalCount += smallerLogs.length;
              console.log(`Processed smaller chunk ${smallFromBlock}-${smallToBlock}: Found ${smallerLogs.length} events`);
            } catch (smallerError) {
              console.error(`Failed to process smaller chunk ${smallFromBlock}-${smallToBlock}:`, smallerError);
            }
          }
        }
      }
    }
    if (totalCount === 0) {
      try {
        const recentGMs = await contract.getRecentGMs();
        if (recentGMs && recentGMs.length > 0) {
          console.log(`No events found, using recentGMs length as minimum: ${recentGMs.length}`);
          return recentGMs.length;
        }
      } catch (recentError) {
        console.warn("Error getting recent GMs:", recentError);
      }
    }
    return totalCount;
  } catch (error) {
    console.error("Error in getTotalCheckins:", error);
    return 0;
  }
};

/**
 * Get user rank and stats data for profile display
 * @param contract The GMOnchain contract
 * @param address User's wallet address
 * @returns Promise with rank and points data
 */
export const getUserRankData = async (contract: ethers.Contract, address: string) => {
  try {
    // Get user's check-in count directly from contract
    let checkinCount;
    try {
      checkinCount = await contract.getCheckinCount(address);
    } catch (e) {
      try {
        // Fallback to direct mapping access if the function fails
        const userData = await contract.userCheckins(address);
        checkinCount = userData.checkinCount || ethers.BigNumber.from(0);
      } catch (mappingError) {
        // If all attempts fail, default to zero
        checkinCount = ethers.BigNumber.from(0);
      }
    }
    
    // Convert to number for calculations
    const count = ethers.BigNumber.isBigNumber(checkinCount) 
      ? checkinCount.toNumber() 
      : Number(checkinCount);
    
    // Get user's rank from leaderboard
    let userRank = 0;
    try {
      const rank = await getUserLeaderboardRank(contract, address);
      userRank = rank !== null ? rank : 0;
    } catch (error) {
      console.warn("Error getting user leaderboard rank:", error);
      
      // Fallback: calculate approx rank based on check-in count
      if (count > 0) {
        // If we can't get the true rank, estimate based on check-in count
        // This is just a placeholder until proper rank can be determined
        const estimatedRank = Math.max(1, Math.floor(100 / (count + 1)));
        userRank = estimatedRank;
      }
    }
    
    // Calculate points - 10 points per check-in plus bonuses
    // This should match your application's point calculation logic
    let points = count * 10;
    
    // Add bonus points based on check-in milestones
    if (count >= 50) points += 500;
    else if (count >= 25) points += 250;
    else if (count >= 10) points += 100;
    else if (count >= 5) points += 50;
    
    // Also add bonus based on rank if available
    if (userRank > 0 && userRank <= 10) {
      // Top 10 bonus
      points += 1000 - ((userRank - 1) * 100);
    } else if (userRank > 10 && userRank <= 50) {
      // Top 50 bonus
      points += 100;
    }
    
    // Return data in consistent format
    return {
      rank: ethers.BigNumber.from(userRank),
      points: ethers.BigNumber.from(points),
      checkinCount: ethers.BigNumber.from(count)
    };
  } catch (error) {
    console.error("Error getting user rank data:", error);
    // Return default values in case of error
    return {
      rank: ethers.BigNumber.from(0),
      points: ethers.BigNumber.from(0),
      checkinCount: ethers.BigNumber.from(0)
    };
  }
};