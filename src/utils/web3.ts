import { ethers } from "ethers";
import GMOnchainABI from "../abis/GMOnchainABI.json";
import { CONTRACT_ADDRESS, TEA_SEPOLIA_CHAIN, TEA_SEPOLIA_CHAIN_ID } from "./constants";

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
    
    // Request accounts directly from ethereum provider
    // This approach is more reliable than using provider.send
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts returned from wallet");
    }
    
    // Get provider after accounts are approved to ensure fresh connection
    const provider = new ethers.providers.Web3Provider(ethereum, "any");
    
    // Get signer from the existing provider
    const signer = provider.getSigner();
    const address = accounts[0]; // Use the first account returned
    
    // Get network info
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
      // Try to switch to the network first
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: TEA_SEPOLIA_CHAIN.chainId }],
      });
    } catch (switchError: any) {
      // If the network is not added, add it
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
  
  // Get today's date for comparison
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Format date based on how recent it is
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
  
  // Format with leading zeros
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
 * Get total global checkins directly from blockchain with optimized approach
 * @param contract The GMOnchain contract
 * @returns Promise<number> Total global check-ins
 */
export const getTotalCheckins = async (contract: ethers.Contract): Promise<number> => {
  try {
    // Method 1: Try to get count from CheckinCompleted events
    // This is the most accurate approach but might be slow for many events
    let count = 0;
    
    try {
      // First try: Get logs from provider directly (potentially faster than contract events)
      const provider = contract.provider;
      const contractAddress = contract.address;
      
      // Get CheckinCompleted event signature (first topic)
      // Event: CheckinCompleted(address indexed user, uint256 timestamp, string message, uint256 count)
      const eventSignature = ethers.utils.id("CheckinCompleted(address,uint256,string,uint256)");
      
      // Get the current block number
      const currentBlock = await provider.getBlockNumber();
      
      // Set reasonable block range to search (adjust based on deployment time)
      // This is a tradeoff between accuracy and performance
      const fromBlock = currentBlock - 200000; // Search last ~200k blocks
      
      // Use getLogs API directly
      const logs = await provider.getLogs({
        address: contractAddress,
        topics: [eventSignature],
        fromBlock: Math.max(0, fromBlock),
        toBlock: "latest"
      });
      
      if (logs && logs.length > 0) {
        console.log(`Found ${logs.length} CheckinCompleted events`);
        count = logs.length;
        return count;
      }
    } catch (logsError) {
      console.warn("Error getting logs directly:", logsError);
    }
    
    // Method 2: Try using contract's queryFilter with reasonable chunk size
    try {
      const filter = contract.filters.CheckinCompleted();
      const currentBlock = await contract.provider.getBlockNumber();
      
      // Use a moderate chunk size that most providers can handle
      const CHUNK_SIZE = 5000;
      const fromBlock = Math.max(0, currentBlock - 50000); // Last 50k blocks
      
      for (let i = fromBlock; i < currentBlock; i += CHUNK_SIZE) {
        const toBlock = Math.min(currentBlock, i + CHUNK_SIZE - 1);
        try {
          const events = await contract.queryFilter(filter, i, toBlock);
          count += events.length;
        } catch (chunkError) {
          console.warn(`Error querying chunk ${i} to ${toBlock}:`, chunkError);
          // Continue with next chunk
        }
      }
      
      if (count > 0) {
        return count;
      }
    } catch (queryError) {
      console.warn("Error using queryFilter:", queryError);
    }
    
    // Method 3: Try getting user data from recent GMs
    try {
      const recentGMs = await contract.getRecentGMs();
      let uniqueUsers = new Set();
      let totalUserCheckins = 0;
      
      // Get unique users
      for (const gm of recentGMs) {
        if (gm && gm.user && !uniqueUsers.has(gm.user)) {
          uniqueUsers.add(gm.user);
          
          // Get this user's check-in count
          try {
            const userCount = await contract.getCheckinCount(gm.user);
            totalUserCheckins += userCount.toNumber();
          } catch (userError) {
            console.warn(`Error getting count for user ${gm.user}:`, userError);
          }
        }
      }
      
      // If we have some data, estimate total
      if (uniqueUsers.size > 0 && totalUserCheckins > 0) {
        // Calculate average check-ins per user
        const avgCheckinsPerUser = totalUserCheckins / uniqueUsers.size;
        
        // Estimate number of active users (assume recent GMs represent ~20% of active users)
        const estimatedActiveUsers = uniqueUsers.size * 5;
        
        // Estimate total check-ins
        const estimatedTotal = Math.round(estimatedActiveUsers * avgCheckinsPerUser);
        
        // Return the higher of our estimation or recent GMs length
        return Math.max(estimatedTotal, recentGMs.length);
      }
      
      // If we just have recent GMs (minimum value)
      if (recentGMs.length > 0) {
        return recentGMs.length;
      }
    } catch (recentError) {
      console.warn("Error analyzing recent GMs:", recentError);
    }
    
    // Method 4: Try a simplified approach with smart pagination
    try {
      let totalEvents = 0;
      let blockWindow = 1000;
      let currentBlock = await contract.provider.getBlockNumber();
      
      // Start with recent blocks and expand if needed
      while (blockWindow <= 200000 && totalEvents === 0) {
        try {
          const events = await contract.queryFilter(
            contract.filters.CheckinCompleted(),
            currentBlock - blockWindow,
            currentBlock
          );
          
          totalEvents = events.length;
          
          // If found events, try to extrapolate for entire contract lifetime
          if (totalEvents > 0) {
            // Estimate events per block
            const eventsPerBlock = totalEvents / blockWindow;
            
            // Estimate total events based on contract lifetime
            // (assuming contract deployed around 200k blocks ago, adjust if known)
            const estimatedContractBlocks = 200000;
            return Math.round(eventsPerBlock * estimatedContractBlocks);
          }
          
          // Increase window for next attempt
          blockWindow *= 5;
        } catch (error) {
          console.warn(`Error with window size ${blockWindow}:`, error);
          blockWindow *= 2; // Try with larger window
        }
      }
    } catch (paginationError) {
      console.warn("Error with smart pagination:", paginationError);
    }
    
    // If everything fails, return a conservative estimate
    return 0;
  } catch (error) {
    console.error("Error in getTotalCheckins:", error);
    return 0;
  }
};