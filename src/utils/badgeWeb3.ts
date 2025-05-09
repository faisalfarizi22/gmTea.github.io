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
 * FIXED: Added try-catch to prevent errors from breaking the app
 */
export const getProvider = () => {
  if (!isBrowser) return null;
  
  try {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return null;
    
    return new ethers.providers.Web3Provider(ethereum, "any");
  } catch (error) {
    console.error("Error getting provider:", error);
    return null;
  }
};

/**
 * Switch to Tea Sepolia network
 * FIXED: Added better error handling
 */
export const switchToTeaSepolia = async () => {
  try {
    if (!isBrowser) return false;
    
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
    return false; // Return false instead of throwing to prevent app crashes
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
 * Check if user has a username
 * Enhanced with better error handling and cache
 */
/**
 * Check if user has a username - dengan non-blocking approach
 */
export const checkUsername = async (address: string): Promise<string | null> => {
  try {
    if (!address) return null;
    
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
          }
        }
      })();
      
      return defaultUsername;
    } catch (error) {
      console.error("Error checking username:", error);
      return defaultUsername;
    }
  } catch (error) {
    console.error("Unexpected error in checkUsername:", error);
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
 * This checks if the user has any username, which implies they have a referrer
 * because username registration requires a referrer in the current system
 */
export const checkReferrer = async (address: string): Promise<boolean> => {
  try {
    if (!address) return false;
    
    // If the user has a username, they must have been referred by someone
    const username = await checkUsername(address);
    return username !== null;
    
  } catch (error) {
    console.error("Error checking referrer:", error);
    return false;
  }
};

/**
 * Get address by username
 * FIXED: Normalize username to lowercase to match smart contract behavior
 */
export const getAddressByUsername = async (username: string): Promise<string | null> => {
  try {
    if (!username) return null;
    
    // Normalize username to lowercase
    const normalizedUsername = normalizeUsername(username);
    
    const provider = getProvider();
    if (!provider) return null;
    
    const usernameContract = getUsernameContract(provider);
    const address = await usernameContract.getAddressByUsername(normalizedUsername);
    
    return address && address !== ethers.constants.AddressZero ? address : null;
  } catch (error) {
    console.error("Error getting address by username:", error);
    return null;
  }
};

/**
 * Register with referral
 * FIXED: Normalize usernames to lowercase to match smart contract behavior
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
    if (!existingUsername || existingUsername === "") {
      // Check if username is available
      const isAvailable = await usernameContract.isUsernameAvailable(normalizedUsername);
      if (!isAvailable) {
        return { success: false, error: "Username is already taken or not available" };
      }
      
      // Register username in UsernameRegistry
      const regTx = await usernameContract.registerUsername(normalizedUsername, {
        gasLimit: 200000 // Add explicit gas limit
      });
      await regTx.wait();
      console.log("Username registered in UsernameRegistry:", regTx.hash);
      
      // Update cache
      setCachedData(getCacheKey('username', userAddress), normalizedUsername);
    }
    
    // Step 3: Check if referrer exists in UsernameRegistry
    const referrerAddress = await usernameContract.getAddressByUsername(normalizedReferrerUsername);
    if (!referrerAddress || referrerAddress === ethers.constants.AddressZero) {
      return { success: false, error: "Referrer username not found. Please enter a valid referrer username." };
    }
    
    // Step 4: Register referral relationship in GMTeaReferral
    const referralContract = new ethers.Contract(REFERRAL_CONTRACT_ADDRESS, GMTeaReferralABI, signer);
    const tx = await referralContract.registerWithReferral(normalizedReferrerUsername, {
      gasLimit: 200000 // Add explicit gas limit
    });
    await tx.wait();
    
    return { success: true, txHash: tx.hash };
  } catch (error: any) {
    console.error("Error registering with referral:", error);
    return { 
      success: false, 
      error: error.reason || error.message || "Error registering with referral" 
    };
  }
};

/**
 * Check if user has minted a badge of the specified tier
 * FIXED: Added better error handling
 */
export const hasUserMintedTier = async (
  address: string,
  tier: number
): Promise<boolean> => {
  try {
    if (!address) return false;
    
    // Check cache first
    const cacheKey = getCacheKey(`hasMintedTier_${tier}`, address);
    const cachedResult = getCachedData<boolean>(cacheKey);
    
    if (cachedResult !== null) {
      return cachedResult;
    }
    
    const provider = getProvider();
    if (!provider) return false;
    
    const badgeContract = getBadgeContract(provider);
    const result = await badgeContract.hasMintedTier(address, tier);
    
    // Cache the result
    setCachedData(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error(`Error checking if user has minted tier ${tier}:`, error);
    return false; // Return false instead of letting the error propagate
  }
};

/**
 * Get the highest tier a user has minted
 * Returns -1 if user has not minted any badges
 * FIXED: Added better error handling
 */
export const getUserHighestTier = async (address: string): Promise<number> => {
  try {
    if (!address) return -1;
    
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
      return defaultTier;
    }
  } catch (error) {
    console.error("Unexpected error in getUserHighestTier:", error);
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
    return null;
  }
};

/**
 * Mint a badge with improved error handling and debugging
 * FIXED: Simplified to avoid network switching issues
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
          return { hash: null, success: false, error: "You must mint previous tier first" };
        }
      } catch (error) {
        console.error("Error checking previous tier:", error);
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
    
    return { hash: tx.hash, success: true, txHash: tx.hash };
  } catch (error: any) {
    console.error("Error in mintBadge function:", error);
    
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
 */
export const getUserReferralStats = async (address: string) => {
  try {
    if (!address) return null;
    
    const provider = getProvider();
    if (!provider) return null;
    
    const referralContract = getReferralContract(provider);
    const stats = await referralContract.getReferralStats(address);
    
    return {
      totalReferrals: stats.totalReferrals.toNumber(),
      pendingRewardsAmount: ethers.utils.formatEther(stats.pendingRewardsAmount),
      claimedRewardsAmount: ethers.utils.formatEther(stats.claimedRewardsAmount)
    };
  } catch (error) {
    console.error("Error getting user referral stats:", error);
    return null;
  }
};

/**
 * Claim referral rewards
 */
export const claimReferralRewards = async (
  signer: ethers.Signer
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    const referralContract = getReferralContract(signer);
    
    // Get pending rewards
    const address = await signer.getAddress();
    const pendingRewards = await referralContract.pendingRewards(address);
    
    if (pendingRewards.eq(0)) {
      return { success: false, error: "No rewards to claim" };
    }
    
    // Claim rewards
    const tx = await referralContract.claimRewards({
      gasLimit: 200000 // Add explicit gas limit
    });
    await tx.wait();
    
    return { success: true, txHash: tx.hash };
  } catch (error: any) {
    console.error("Error claiming referral rewards:", error);
    return { 
      success: false, 
      error: error.reason || error.message || "Error claiming referral rewards" 
    };
  }
};

/**
 * Get all badges owned by a user
 * @param address - User's address
 * @returns Array of badges owned by the user
 * FIXED: Added better error handling
 */
export const getUserBadges = async (
  address: string
): Promise<{ tokenId: number; tier: number; mintedAt: number }[]> => {
  try {
    if (!address) return [];
    
    // Check cache first
    const cacheKey = getCacheKey('userBadges', address);
    const cachedBadges = getCachedData<{ tokenId: number; tier: number; mintedAt: number }[]>(cacheKey);
    
    if (cachedBadges) {
      return cachedBadges;
    }
    
    const provider = getProvider();
    if (!provider) return [];
  
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
      }
    }
    
    // Sort badges by tier (ascending)
    badges.sort((a, b) => a.tier - b.tier);
    
    // Cache the result
    setCachedData(cacheKey, badges);
    
    return badges;
  } catch (error) {
    console.error('Error getting user badges:', error);
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
 * FIXED: Added better error handling
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
    // Set default values in case of error to prevent UI from being stuck
    if (callbacks.setUsername) callbacks.setUsername(null);
    if (callbacks.setHighestTier) callbacks.setHighestTier(-1);
    if (callbacks.setUserBadges) callbacks.setUserBadges([]);
  } finally {
    if (setIsLoading) setIsLoading(false);
  }
};