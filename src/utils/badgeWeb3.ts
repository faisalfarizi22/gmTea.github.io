import { ethers } from "ethers";
import { 
  BADGE_CONTRACT_ADDRESS, 
  REFERRAL_CONTRACT_ADDRESS, 
  USERNAME_REGISTRY_ADDRESS,
  TEA_SEPOLIA_CHAIN,
  TEA_SEPOLIA_CHAIN_ID,
  BADGE_TIERS,
  TEA_SEPOLIA_RPC_URL
} from "./constants";
import GMTeaBadgeABI from "../abis/GMTeaBadgeABI.json";
import GMTeaReferralABI from "../abis/GMTeaReferralABI.json";
import GMTeaUsernameABI from "../abis/GMTeaUsernameABI.json";
import { isUsingDBMode } from "../hooks/useDBMode";

// Flag untuk mengetahui apakah blockchain sedang memiliki masalah
let isBlockchainError = false;

declare global {
  interface Window {
    __usernameCache?: Record<string, string | null>;
    __tierCache?: Record<string, number>;
    __updateUsernameCallbacks?: Array<(address: string, username: string | null) => void>;
    __updateTierCallbacks?: Array<(address: string, tier: number) => void>;
  }
}

/**
 * Helper function to normalize username to lowercase
 */
const normalizeUsername = (username: string): string => {
  return username.toLowerCase();
};

/**
 * Simple cache implementation for faster data loading
 */
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

const getCachedData = <T>(key: string): T | null => {
  try {
    if (typeof window === 'undefined') return null;
    
    const item = localStorage.getItem(key);
    if (!item) return null;
    
    const parsed = JSON.parse(item);
    if (!parsed.timestamp || Date.now() - parsed.timestamp > CACHE_EXPIRY) {
      return null;
    }
    
    return parsed.data;
  } catch (e: any) {
    console.error('Error reading from cache:', e);
    return null;
  }
};

const setCachedData = <T>(key: string, data: T): void => {
  try {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e: any) {
    console.error('Error writing to cache:', e);
  }
};

const getCacheKey = (type: string, address: string): string => {
  return `gmtea_${type}_${address.toLowerCase()}`;
};

/**
 * Checks if code is running in browser environment
 */
const isBrowser = typeof window !== "undefined";

/**
 * Get Ethereum provider from window object
 * MODIFIED: Added database fallback mode and error tracking
 */
export const getProvider = () => {
  // Jika kita menggunakan mode database, return null
  if (isUsingDBMode()) {
    console.log("Using database mode, skipping blockchain provider");
    return null;
  }
  
  if (!isBrowser) return null;
  
  try {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      console.warn("No Ethereum provider found, falling back to database mode");
      isBlockchainError = true;
      return null;
    }
    
    // Reset error flag jika provider bisa diambil
    isBlockchainError = false;
    return new ethers.providers.Web3Provider(ethereum, "any");
  } catch (error) {
    console.error("Error getting provider:", error);
    isBlockchainError = true;
    return null;
  }
};

/**
 * Check if blockchain is in error state
 */
export const hasBlockchainError = (): boolean => {
  return isBlockchainError;
}

/**
 * Reset blockchain error state (used after reconnect attempts)
 */
export const resetBlockchainErrorState = () => {
  isBlockchainError = false;
}

/**
 * Switch to Tea Sepolia network
 * MODIFIED: Added database fallback handling
 */
export const switchToTeaSepolia = async () => {
  // Jika menggunakan mode database, return success
  if (isUsingDBMode()) {
    return true;
  }
  
  try {
    if (!isBrowser) return false;
    
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      console.warn("No Ethereum provider found, using database instead");
      isBlockchainError = true;
      return false;
    }
    
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: TEA_SEPOLIA_CHAIN.chainId }],
      });
      isBlockchainError = false;
      return true;
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [TEA_SEPOLIA_CHAIN],
          });
          isBlockchainError = false;
          return true;
        } catch (addError) {
          console.error("Error adding network:", addError);
          isBlockchainError = true;
          return false;
        }
      } else {
        console.error("Switch network error:", switchError);
        isBlockchainError = true;
        return false;
      }
    }
  } catch (error) {
    console.error("Error switching network:", error);
    isBlockchainError = true;
    return false;
  }
};

/**
 * Get badge contract instance
 */
export const getBadgeContract = (signerOrProvider: ethers.Signer | ethers.providers.Provider) => {
  return new ethers.Contract(BADGE_CONTRACT_ADDRESS, GMTeaBadgeABI, signerOrProvider);
};

/**
 * Get referral contract instance
 */
export const getReferralContract = (signerOrProvider: ethers.Signer | ethers.providers.Provider) => {
  return new ethers.Contract(REFERRAL_CONTRACT_ADDRESS, GMTeaReferralABI, signerOrProvider);
};

/**
 * Get username registry contract instance
 */
export const getUsernameContract = (signerOrProvider: ethers.Signer | ethers.providers.Provider) => {
  return new ethers.Contract(USERNAME_REGISTRY_ADDRESS, GMTeaUsernameABI, signerOrProvider);
};

/**
 * Check if user has a username - dengan non-blocking approach
 * MODIFIED: Added database mode support
 */
export const checkUsername = async (address: string): Promise<string | null> => {
  try {
    if (!address) return null;
    
    // If using database mode, fetch from API instead
    if (isUsingDBMode()) {
      try {
        const response = await fetch(`/api/users/${address}`);
        if (!response.ok) {
          console.warn(`API error: ${response.status} ${response.statusText}`);
          return null;
        }
        
        const data = await response.json();
        return data.user?.username || null;
      } catch (apiError) {
        console.error("API error in checkUsername:", apiError);
        return null;
      }
    }
    
    // Check cache first
    const cacheKey = getCacheKey('username', address);
    const cachedUsername = getCachedData<string>(cacheKey);
    
    if (cachedUsername !== null) {
      return cachedUsername;
    }
    
    if (!window.__usernameCache) {
      window.__usernameCache = {};
    }
    
    if (window.__usernameCache[address] !== undefined) {
      return window.__usernameCache[address];
    }
    
    const defaultUsername = null;
    window.__usernameCache[address] = defaultUsername;
    
    try {
      const provider = getProvider();
      if (!provider) {
        console.warn("No provider available for username lookup");
        return defaultUsername;
      }
      
      const usernameContract = getUsernameContract(provider);
      
      (async () => {
        try {
          const username = await Promise.race([
            usernameContract.getUsernameByAddress(address),
            new Promise<string>((_, reject) => 
              setTimeout(() => reject(new Error('Username lookup timeout')), 10000)
            )
          ]) as string;
          
          const result = username && username !== "" ? username : null;
          
          if (result) {
            setCachedData(cacheKey, result);
            if (window.__usernameCache) {
              window.__usernameCache[address] = result;
            }
            
            if (window.__updateUsernameCallbacks) {
              window.__updateUsernameCallbacks.forEach(callback => {
                if (typeof callback === 'function') {
                  callback(address, result);
                }
              });
            }
          }
        } catch (error) {
          console.warn(`Background username fetch failed for ${address}:`, error);
          isBlockchainError = true;
          
          try {
            const fallbackProvider = typeof getFallbackProvider === 'function' 
              ? getFallbackProvider() 
              : getProvider(); 
              
            if (fallbackProvider) {
              const fallbackContract = getUsernameContract(fallbackProvider);
              const fallbackUsername = await fallbackContract.getUsernameByAddress(address);
              
              const result = fallbackUsername && fallbackUsername !== "" ? fallbackUsername : null;
              
              if (result) {
                setCachedData(cacheKey, result);
                if (window.__usernameCache) {
                  window.__usernameCache[address] = result;
                }
                
                if (window.__updateUsernameCallbacks) {
                  window.__updateUsernameCallbacks.forEach(callback => {
                    if (typeof callback === 'function') {
                      callback(address, result);
                    }
                  });
                }
              }
            }
          } catch (fallbackError) {
            console.error("Fallback provider also failed:", fallbackError);
            isBlockchainError = true;
          }
        }
      })();
      
      return defaultUsername;
    } catch (error) {
      console.error("Error checking username:", error);
      isBlockchainError = true;
      return defaultUsername;
    }
  } catch (error) {
    console.error("Unexpected error in checkUsername:", error);
    isBlockchainError = true;
    return null;
  }
};

export const registerUsernameUpdateCallback = (callback: (address: string, username: string | null) => void) => {
  if (!window.__updateUsernameCallbacks) {
    window.__updateUsernameCallbacks = [];
  }
  window.__updateUsernameCallbacks.push(callback);
  
  // Return unregister function
  return () => {
    window.__updateUsernameCallbacks = window.__updateUsernameCallbacks?.filter(cb => cb !== callback);
  };
};

/**
 * Check if user has a referrer - using a different approach
 * MODIFIED: Added database mode support
 */
export const checkReferrer = async (address: string): Promise<boolean> => {
  try {
    if (!address) return false;
    
    // If using database mode, fetch from API instead
    if (isUsingDBMode()) {
      try {
        const response = await fetch(`/api/users/${address}`);
        if (!response.ok) {
          console.warn(`API error: ${response.status} ${response.statusText}`);
          return false;
        }
        
        const data = await response.json();
        // Jika user ada referrer di database
        return !!data.user?.referrer;
      } catch (apiError) {
        console.error("API error in checkReferrer:", apiError);
        return false;
      }
    }
    
    // If the user has a username, they must have been referred by someone
    const username = await checkUsername(address);
    return username !== null;
    
  } catch (error) {
    console.error("Error checking referrer:", error);
    isBlockchainError = true;
    return false;
  }
};

/**
 * Get address by username
 * MODIFIED: Added database mode support
 */
export const getAddressByUsername = async (username: string): Promise<string | null> => {
  try {
    if (!username) return null;
    
    // If using database mode, fetch from API instead
    if (isUsingDBMode()) {
      try {
        const normalizedUsername = normalizeUsername(username);
        const response = await fetch(`/api/username/${normalizedUsername}`);
        if (!response.ok) {
          console.warn(`API error: ${response.status} ${response.statusText}`);
          return null;
        }
        
        const data = await response.json();
        return data.address || null;
      } catch (apiError) {
        console.error("API error in getAddressByUsername:", apiError);
        return null;
      }
    }
    
    // Normalize username to lowercase
    const normalizedUsername = normalizeUsername(username);
    
    const provider = getProvider();
    if (!provider) {
      isBlockchainError = true;
      return null;
    }
    
    const usernameContract = getUsernameContract(provider);
    const address = await usernameContract.getAddressByUsername(normalizedUsername);
    
    return address && address !== ethers.constants.AddressZero ? address : null;
  } catch (error) {
    console.error("Error getting address by username:", error);
    isBlockchainError = true;
    return null;
  }
};

/**
 * Register with referral - updated to sync with database
 */
export const registerWithReferral = async (
  signer: ethers.Signer,
  username: string,
  referrerUsername: string
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    // Normalize usernames to lowercase
    const normalizedUsername = normalizeUsername(username);
    const normalizedReferrerUsername = normalizeUsername(referrerUsername);
    
    // Step 1: First check if user already has a username in UsernameRegistry
    const usernameContract = new ethers.Contract(USERNAME_REGISTRY_ADDRESS, GMTeaUsernameABI, signer);
    const userAddress = await signer.getAddress();
    const existingUsername = await usernameContract.getUsernameByAddress(userAddress);
    
    // Step 2: If no username, register in UsernameRegistry first
    let usernameTxHash = '';
    if (!existingUsername || existingUsername === "") {
      // Check if username is available
      const isAvailable = await usernameContract.isUsernameAvailable(normalizedUsername);
      if (!isAvailable) {
        isBlockchainError = false; // This is a valid response from the contract
        return { success: false, error: "Username is already taken or not available" };
      }
      
      // Register username in UsernameRegistry
      const regTx = await usernameContract.registerUsername(normalizedUsername, {
        gasLimit: 200000 // Add explicit gas limit
      });
      const receipt = await regTx.wait();
      usernameTxHash = regTx.hash;
      console.log("Username registered in UsernameRegistry:", regTx.hash);
      
      // Update cache
      setCachedData(getCacheKey('username', userAddress), normalizedUsername);
    }
    
    // Step 3: Check if referrer exists in UsernameRegistry
    const referrerAddress = await usernameContract.getAddressByUsername(normalizedReferrerUsername);
    if (!referrerAddress || referrerAddress === ethers.constants.AddressZero) {
      isBlockchainError = false; // This is a valid response from the contract
      return { success: false, error: "Referrer username not found. Please enter a valid referrer username." };
    }
    
    // Step 4: Register referral relationship in GMTeaReferral
    const referralContract = new ethers.Contract(REFERRAL_CONTRACT_ADDRESS, GMTeaReferralABI, signer);
    const tx = await referralContract.registerWithReferral(normalizedReferrerUsername, {
      gasLimit: 200000 // Add explicit gas limit
    });
    
    const receipt = await tx.wait();
    const txHash = tx.hash;
    
    // Step 5: Sync with database - send the transaction data to our API
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: userAddress,
          username: normalizedUsername,
          referrerUsername: normalizedReferrerUsername,
          txHash: txHash // Make sure txHash is included
        }),
      });
      
      if (!response.ok) {
        console.warn('Failed to sync registration with database, but blockchain transaction succeeded');
        const errorData = await response.json();
        console.error('API error details:', errorData);
      } else {
        console.log('Registration synced with database successfully');
      }
    } catch (apiError) {
      console.error("API error when syncing registration:", apiError);
      // We don't fail here since the blockchain transaction already succeeded
    }
    
    isBlockchainError = false; // Success, reset error flag
    return { success: true, txHash };
  } catch (error: any) {
    console.error("Error registering with referral:", error);
    isBlockchainError = true;
    return { 
      success: false, 
      error: error.reason || error.message || "Error registering with referral" 
    };
  }
};

/**
 * Check if user has minted a badge of the specified tier
 * MODIFIED: Added database mode support
 */
export const hasUserMintedTier = async (
  address: string,
  tier: number
): Promise<boolean> => {
  try {
    if (!address) return false;
    
    // If using database mode, fetch from API instead
    if (isUsingDBMode()) {
      try {
        const response = await fetch(`/api/badges/${address}`);
        if (!response.ok) {
          console.warn(`API error: ${response.status} ${response.statusText}`);
          return false;
        }
        
        const data = await response.json();
        // Periksa jika user memiliki badge dengan tier tertentu
        return data.badges?.some((badge: any) => badge.tier === tier) || false;
      } catch (apiError) {
        console.error("API error in hasUserMintedTier:", apiError);
        return false;
      }
    }
    
    // Check cache first
    const cacheKey = getCacheKey(`hasMintedTier_${tier}`, address);
    const cachedResult = getCachedData<boolean>(cacheKey);
    
    if (cachedResult !== null) {
      return cachedResult;
    }
    
    const provider = getProvider();
    if (!provider) {
      isBlockchainError = true;
      return false;
    }
    
    const badgeContract = getBadgeContract(provider);
    const result = await badgeContract.hasMintedTier(address, tier);
    
    // Cache the result
    setCachedData(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error(`Error checking if user has minted tier ${tier}:`, error);
    isBlockchainError = true;
    return false; // Return false instead of letting the error propagate
  }
};

/**
 * Get the highest tier a user has minted
 * MODIFIED: Added database mode support
 */
export const getUserHighestTier = async (address: string): Promise<number> => {
  try {
    if (!address) return -1;
    
    // If using database mode, fetch from API instead
    if (isUsingDBMode()) {
      try {
        const response = await fetch(`/api/users/${address}`);
        if (!response.ok) {
          console.warn(`API error: ${response.status} ${response.statusText}`);
          return -1;
        }
        
        const data = await response.json();
        // Return highest badge tier dari database
        return data.user?.highestBadgeTier ?? -1;
      } catch (apiError) {
        console.error("API error in getUserHighestTier:", apiError);
        return -1;
      }
    }
    
    const cacheKey = getCacheKey('highestTier', address);
    const cachedTier = getCachedData<number>(cacheKey);
    
    if (cachedTier !== null) {
      return cachedTier;
    }
    
    if (!window.__tierCache) {
      window.__tierCache = {};
    }
    
    if (window.__tierCache[address] !== undefined) {
      return window.__tierCache[address];
    }
    
    const defaultTier = -1;
    window.__tierCache[address] = defaultTier;
    
    try {
      const provider = getProvider();
      if (!provider) {
        console.warn("No provider available");
        isBlockchainError = true;
        return defaultTier;
      }
      
      const badgeContract = getBadgeContract(provider);
      
      (async () => {
        try {
          const result = await Promise.race([
            badgeContract.getHighestTier(address),
            new Promise<number>((_, reject) => 
              setTimeout(() => reject(new Error('Contract call timeout')), 10000)
            )
          ]) as number;
          
          setCachedData(cacheKey, result);
          if (window.__tierCache) {
            window.__tierCache[address] = result;
          }
          
          if (window.__updateTierCallbacks) {
            window.__updateTierCallbacks.forEach(callback => {
              if (typeof callback === 'function') {
                callback(address, result);
              }
            });
          }
        } catch (error) {
          console.warn(`Background tier fetch failed for ${address}:`, error);
          isBlockchainError = true;
          
          let highestFound = -1;
          
          for (let i = 0; i <= 4; i++) {
            try {
              const hasTier = await Promise.race([
                badgeContract.hasMintedTier(address, i),
                new Promise<boolean>((_, reject) => 
                  setTimeout(() => reject(new Error('Tier check timeout')), 5000)
                )
              ]) as boolean;
              
              if (hasTier) {
                highestFound = i;
              } else {
                break;
              }
            } catch (tierError) {
              console.warn(`Error checking tier ${i}:`, tierError);
              isBlockchainError = true;
              break; 
            }
          }
          
          setCachedData(cacheKey, highestFound);
          if (window.__tierCache) {
            window.__tierCache[address] = highestFound;
          }
          
          if (window.__updateTierCallbacks) {
            window.__updateTierCallbacks.forEach(callback => {
              if (typeof callback === 'function') {
                callback(address, highestFound);
              }
            });
          }
        }
      })();
      
      return defaultTier;
    } catch (error) {
      console.error("Error getting user's highest tier:", error);
      isBlockchainError = true;
      return defaultTier;
    }
  } catch (error) {
    console.error("Unexpected error in getUserHighestTier:", error);
    isBlockchainError = true;
    return -1;
  }
};

export const registerTierUpdateCallback = (callback: (address: string, tier: number) => void) => {
  if (!window.__updateTierCallbacks) {
    window.__updateTierCallbacks = [];
  }
  window.__updateTierCallbacks.push(callback);
  
  return () => {
    window.__updateTierCallbacks = window.__updateTierCallbacks?.filter(cb => cb !== callback);
  };
};

export const getFallbackProvider = (): any => {
  try {
    return null; 
  } catch (error) {
    console.error("Error getting fallback provider:", error);
    isBlockchainError = true;
    return null;
  }
};

/**
 * Mint a badge with improved error handling and debugging
 * MODIFIED: Added database mode support
 */
export const mintBadge = async (
  signer: ethers.Signer, 
  tier: number
): Promise<{
  hash: string | null; 
  success: boolean; 
  txHash?: string; 
  error?: string;
}> => {
  try {
    console.log(`Starting mintBadge process for tier ${tier}`);
    
    // If using database mode, use API to mint badge
    if (isUsingDBMode()) {
      try {
        const userAddress = await signer.getAddress();
        
        const response = await fetch('/api/mint-badge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: userAddress,
            tier: tier
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          return { 
            hash: null, 
            success: false, 
            error: errorData.message || 'Failed to mint badge in database' 
          };
        }
        
        const data = await response.json();
        return { 
          hash: data.txHash || 'db-minted', 
          success: true, 
          txHash: data.txHash || 'db-minted'
        };
      } catch (apiError: any) {
        console.error("API error in mintBadge:", apiError);
        return { 
          hash: null, 
          success: false, 
          error: apiError?.message || 'Failed to mint badge with API' 
        };
      }
    }
    
    // Get user's address
    const address = await signer.getAddress();
    console.log(`User address: ${address}`);
    
    // Create badge contract instance with signer
    const badgeContract = getBadgeContract(signer);
    
    // Get price directly from the contract instead of constants
    const priceFromContract = await badgeContract.tierPrices(tier);
    console.log(`Price from contract for tier ${tier}: ${ethers.utils.formatEther(priceFromContract)} ETH`);
    
    // Check if user already has previous tier if tier > 0
    if (tier > 0) {
      try {
        const hasPreviousTier = await badgeContract.hasMintedTier(address, tier - 1);
        if (!hasPreviousTier) {
          isBlockchainError = false; // Valid response
          return { hash: null, success: false, error: "You must mint previous tier first" };
        }
      } catch (error) {
        console.error("Error checking previous tier:", error);
        isBlockchainError = true;
        // Continue anyway, let the contract handle the validation
      }
    }
    
    // Send the transaction with price from contract
    console.log('Sending transaction with price from contract:', ethers.utils.formatEther(priceFromContract));
    const tx = await badgeContract.mintBadge(address, tier, {
      value: priceFromContract,
      gasLimit: 1000000
    });
    
    console.log('Transaction sent:', tx.hash);
    
    // Clear cache for this user's badge ownership
    if (typeof window !== 'undefined') {
      localStorage.removeItem(getCacheKey(`hasMintedTier_${tier}`, address));
      localStorage.removeItem(getCacheKey('highestTier', address));
    }
    
    isBlockchainError = false; // Success
    return { hash: tx.hash, success: true, txHash: tx.hash };
  } catch (error: any) {
    console.error("Error in mintBadge function:", error);
    isBlockchainError = true;
    
    // Extract user-friendly error message
    let errorMessage = "Error minting badge";
    
    if (error.reason) {
      errorMessage = error.reason;
    } else if (error.code === 4001) {
      errorMessage = "Transaction was rejected by user";
    } else if (error.message) {
      if (error.message.includes("user rejected")) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds to complete the transaction";
      } else if (error.message.includes("execution reverted")) {
        const revertMatch = error.message.match(/execution reverted:(.+?)(?:\n|$)/);
        errorMessage = revertMatch ? revertMatch[1].trim() : "Transaction failed on the blockchain";
      } else {
        errorMessage = error.message;
      }
    }
    
    return { hash: null, success: false, error: errorMessage };
  }
};

/**
 * Get user's referral stats
 * MODIFIED: Added database mode support and improved error handling
 */
export const getUserReferralStats = async (address: string) => {
  try {
    if (!address) return null;
    
    // If using database mode, fetch from API instead
    if (isUsingDBMode()) {
      try {
        const response = await fetch(`/api/referrals/${address}`);
        if (!response.ok) {
          console.warn(`API error: ${response.status} ${response.statusText}`);
          return null;
        }
        
        const data = await response.json();
        if (data.stats) {
          return {
            totalReferrals: data.stats.total || 0,
            pendingRewardsAmount: data.stats.pendingRewards || "0",
            claimedRewardsAmount: data.stats.claimedRewards || "0"
          };
        }
        return null;
      } catch (apiError) {
        console.error("API error in getUserReferralStats:", apiError);
        return null;
      }
    }
    
    // Get cached data if available
    const cacheKey = getCacheKey('referralStats', address);
    const cachedStats = getCachedData<{
      totalReferrals: number;
      pendingRewardsAmount: string;
      claimedRewardsAmount: string;
    }>(cacheKey);
    
    if (cachedStats) {
      return cachedStats;
    }
    
    const provider = getProvider();
    if (!provider) {
      isBlockchainError = true;
      return null;
    }
    
    const referralContract = getReferralContract(provider);
    const stats = await referralContract.getReferralStats(address);
    
    const formattedStats = {
      totalReferrals: stats.totalReferrals.toNumber(),
      pendingRewardsAmount: ethers.utils.formatEther(stats.pendingRewardsAmount),
      claimedRewardsAmount: ethers.utils.formatEther(stats.claimedRewardsAmount)
    };
    
    // Cache the formatted stats
    setCachedData(cacheKey, formattedStats);
    
    return formattedStats;
  } catch (error) {
    console.error("Error getting user referral stats:", error);
    isBlockchainError = true;
    return null;
  }
};

/**
 * Helper function to update referral stats in cache after a successful claim
 * This avoids the need to refetch from blockchain or API
 */
const updateReferralStatsAfterClaim = async (address: string, pendingAmount?: number) => {
  try {
    const cacheKey = getCacheKey('referralStats', address);
    const existingStats = getCachedData<{
      totalReferrals: number;
      pendingRewardsAmount: string;
      claimedRewardsAmount: string;
    }>(cacheKey);
    
    if (existingStats) {
      // If we have the pending amount value, use it, otherwise use the cached value
      const amountToMove = pendingAmount !== undefined ? 
        pendingAmount : 
        Number.parseFloat(existingStats.pendingRewardsAmount);
      
      // Update the stats with pending moved to claimed
      const updatedStats = {
        ...existingStats,
        pendingRewardsAmount: "0",
        claimedRewardsAmount: (
          Number.parseFloat(existingStats.claimedRewardsAmount) + amountToMove
        ).toFixed(4)
      };
      
      // Update the cache
      setCachedData(cacheKey, updatedStats);
      
      console.log("Updated referral stats in cache after claim:", updatedStats);
    } else {
      // If we don't have cached stats, fetch them again
      await getUserReferralStats(address);
    }
  } catch (error) {
    console.error("Error updating referral stats after claim:", error);
  }
};

/**
 * Claim referral rewards with improved state handling
 * MODIFIED: Added database mode support and immediate cache update
 */
export const claimReferralRewards = async (
  signer: ethers.Signer
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    const userAddress = await signer.getAddress();
    
    // If using database mode, use API to claim rewards
    if (isUsingDBMode()) {
      try {
        const response = await fetch('/api/claim-rewards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: userAddress
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          return { 
            success: false, 
            error: errorData.message || 'Failed to claim rewards in database' 
          };
        }
        
        const data = await response.json();
        
        // Immediately update the local cache with the claimed rewards
        updateReferralStatsAfterClaim(userAddress);
        
        return { success: true, txHash: data.txHash || 'db-claimed' };
      } catch (apiError: any) {
        console.error("API error in claimReferralRewards:", apiError);
        return { 
          success: false, 
          error: apiError?.message || 'Failed to claim rewards with API' 
        };
      }
    }
    
    const referralContract = getReferralContract(signer);
    
    // Get pending rewards
    const pendingRewards = await referralContract.pendingRewards(userAddress);
    
    if (pendingRewards.eq(0)) {
      isBlockchainError = false; // Valid response
      return { success: false, error: "No rewards to claim" };
    }
    
    // Record the pending amount before claiming
    const currentStats = await getUserReferralStats(userAddress);
    const pendingAmount = currentStats ? 
      Number.parseFloat(currentStats.pendingRewardsAmount) : 0;
    
    // Claim rewards
    const tx = await referralContract.claimRewards({
      gasLimit: 200000 // Add explicit gas limit
    });
    await tx.wait();
    
    // Immediately update the stats in the cache
    updateReferralStatsAfterClaim(userAddress, pendingAmount);
    
    isBlockchainError = false; // Success
    return { success: true, txHash: tx.hash };
  } catch (error: any) {
    console.error("Error claiming referral rewards:", error);
    isBlockchainError = true;
    return { 
      success: false, 
      error: error.reason || error.message || "Error claiming referral rewards" 
    };
  }
};

/**
 * Get all badges owned by a user
 * MODIFIED: Added database mode support
 */
export const getUserBadges = async (
  address: string
): Promise<{ tokenId: number; tier: number; mintedAt: number }[]> => {
  try {
    if (!address) return [];
    
    // If using database mode, fetch from API instead
    if (isUsingDBMode()) {
      try {
        const response = await fetch(`/api/badges/${address}`);
        if (!response.ok) {
          console.warn(`API error: ${response.status} ${response.statusText}`);
          return [];
        }
        
        const data = await response.json();
        if (data.badges) {
          return data.badges.map((badge: any) => ({
            tokenId: badge.tokenId || 0,
            tier: badge.tier || 0,
            mintedAt: new Date(badge.mintedAt).getTime() / 1000
          }));
        }
        return [];
      } catch (apiError) {
        console.error("API error in getUserBadges:", apiError);
        return [];
      }
    }
    
    // Check cache first
    const cacheKey = getCacheKey('userBadges', address);
    const cachedBadges = getCachedData<{ tokenId: number; tier: number; mintedAt: number }[]>(cacheKey);
    
    if (cachedBadges) {
      return cachedBadges;
    }
    
    const provider = getProvider();
    if (!provider) {
      isBlockchainError = true;
      return [];
    }
  
    const badgeContract = getBadgeContract(provider);
    
    // Get user's badge balance
    const balance = await badgeContract.balanceOf(address);
    const balanceNumber = balance.toNumber();
    
    if (balanceNumber === 0) {
      return [];
    }
    
    // Get badges
    const badges = [];
    for (let i = 0; i < balanceNumber; i++) {
      try {
        const tokenId = await badgeContract.tokenOfOwnerByIndex(address, i);
        const metadata = await badgeContract.badgeMetadata(tokenId);
        
        badges.push({
          tokenId: tokenId.toNumber(),
          tier: metadata.tier,
          mintedAt: metadata.mintTimestamp.toNumber()
        });
      } catch (error) {
        console.error(`Error fetching badge ${i}:`, error);
        isBlockchainError = true;
      }
    }
    
    // Sort badges by tier (ascending)
    badges.sort((a, b) => a.tier - b.tier);
    
    // Cache the result
    setCachedData(cacheKey, badges);
    
    return badges;
  } catch (error) {
    console.error('Error getting user badges:', error);
    isBlockchainError = true;
    return []; // Return empty array instead of letting the error propagate
  }
};

/**
 * Simple helper to publish mint success event
 */
export const publishMintSuccess = (address: string, tier: number, txHash: string) => {
  try {
    if (typeof window === 'undefined') return;
    
    const event = new CustomEvent('mintSuccess', { 
      detail: { address, tier, txHash } 
    });
    window.dispatchEvent(event);
  } catch (error) {
    console.error('Error publishing mint success event:', error);
  }
};

/**
 * Refresh user data after significant changes
 * MODIFIED: Added database mode support
 */
export const refreshUserData = async (
  address: string,
  callbacks: {
    setUsername?: (value: string | null) => void;
    setHighestTier?: (value: number) => void;
    setUserBadges?: (value: any[]) => void;
  },
  setIsLoading?: (value: boolean) => void
) => {
  if (!address) return;
  
  if (setIsLoading) setIsLoading(true);
  
  try {
    // Clear cache for critical data
    if (typeof window !== 'undefined') {
      localStorage.removeItem(getCacheKey('highestTier', address));
      localStorage.removeItem(getCacheKey('userBadges', address));
    }
    
    // Fetch data sequentially to avoid race conditions
    const username = await checkUsername(address);
    if (callbacks.setUsername) callbacks.setUsername(username);
    
    const highestTier = await getUserHighestTier(address);
    if (callbacks.setHighestTier) callbacks.setHighestTier(highestTier);
    
    const badges = await getUserBadges(address);
    if (callbacks.setUserBadges) callbacks.setUserBadges(badges);
    
    return {
      username,
      highestTier,
      badgeCount: badges.length
    };
  } catch (error) {
    console.error("Error refreshing user data:", error);
    isBlockchainError = true;
    // Set default values in case of error to prevent UI from being stuck
    if (callbacks.setUsername) callbacks.setUsername(null);
    if (callbacks.setHighestTier) callbacks.setHighestTier(-1);
    if (callbacks.setUserBadges) callbacks.setUserBadges([]);
  } finally {
    if (setIsLoading) setIsLoading(false);
  }
};