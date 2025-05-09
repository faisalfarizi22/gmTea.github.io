// import { ethers } from "ethers";
// import { 
//   BADGE_CONTRACT_ADDRESS, 
//   REFERRAL_CONTRACT_ADDRESS, 
//   USERNAME_REGISTRY_ADDRESS,
//   TEA_SEPOLIA_CHAIN,
//   BADGE_TIERS
// } from "./constants";

// // Import your ABIs (which you've already created)
// import GMTeaBadgeABI from "../abis/GMTeaBadgeABI.json";
// import GMTeaReferralABI from "../abis/GMTeaReferralABI.json";
// import GMTeaUsernameABI from "../abis/GMTeaUsernameABI.json";

// /**
//  * Checks if code is running in browser environment
//  */
// const isBrowser = typeof window !== "undefined";

// /**
//  * Get Ethereum provider from window object
//  */
// export const getProvider = () => {
//   if (!isBrowser) return null;
  
//   const ethereum = (window as any).ethereum;
//   if (!ethereum) return null;
  
//   return new ethers.providers.Web3Provider(ethereum, "any");
// };

// /**
//  * Switch to Tea Sepolia network
//  */
// export const switchToTeaSepolia = async () => {
//   try {
//     const ethereum = (window as any).ethereum;
//     if (!ethereum) throw new Error("No Ethereum provider found");
    
//     try {
//       await ethereum.request({
//         method: "wallet_switchEthereumChain",
//         params: [{ chainId: TEA_SEPOLIA_CHAIN.chainId }],
//       });
//     } catch (switchError: any) {
//       if (switchError.code === 4902) {
//         await ethereum.request({
//           method: "wallet_addEthereumChain",
//           params: [TEA_SEPOLIA_CHAIN],
//         });
//       } else {
//         throw switchError;
//       }
//     }
    
//     return true;
//   } catch (error) {
//     console.error("Error switching network:", error);
//     throw error;
//   }
// };

// /**
//  * Get badge contract instance
//  */
// export const getBadgeContract = (signerOrProvider: ethers.Signer | ethers.providers.Provider) => {
//   return new ethers.Contract(BADGE_CONTRACT_ADDRESS, GMTeaBadgeABI, signerOrProvider);
// };

// /**
//  * Get referral contract instance
//  */
// export const getReferralContract = (signerOrProvider: ethers.Signer | ethers.providers.Provider) => {
//   return new ethers.Contract(REFERRAL_CONTRACT_ADDRESS, GMTeaReferralABI, signerOrProvider);
// };

// /**
//  * Get username registry contract instance
//  */
// export const getUsernameContract = (signerOrProvider: ethers.Signer | ethers.providers.Provider) => {
//   return new ethers.Contract(USERNAME_REGISTRY_ADDRESS, GMTeaUsernameABI, signerOrProvider);
// };

// /**
//  * Check if user has a username
//  */
// export const checkUsername = async (address: string): Promise<string | null> => {
//   try {
//     const provider = getProvider();
//     if (!provider) return null;
    
//     const usernameContract = getUsernameContract(provider);
//     const username = await usernameContract.getUsernameByAddress(address);
    
//     return username && username !== "" ? username : null;
//   } catch (error) {
//     console.error("Error checking username:", error);
//     return null;
//   }
// };

// /**
//  * Check if user has a referrer - using a different approach
//  * This checks if the user has any username, which implies they have a referrer
//  * because username registration requires a referrer in the current system
//  */
// export const checkReferrer = async (address: string): Promise<boolean> => {
//   try {
//     const provider = getProvider();
//     if (!provider) return false;
    
//     // If the user has a username, they must have been referred by someone
//     const username = await checkUsername(address);
//     return username !== null;
    
//   } catch (error) {
//     console.error("Error checking referrer:", error);
//     return false;
//   }
// };

// /**
//  * Get address by username
//  */
// export const getAddressByUsername = async (username: string): Promise<string | null> => {
//   try {
//     const provider = getProvider();
//     if (!provider) return null;
    
//     const usernameContract = getUsernameContract(provider);
//     const address = await usernameContract.getAddressByUsername(username);
    
//     return address && address !== ethers.constants.AddressZero ? address : null;
//   } catch (error) {
//     console.error("Error getting address by username:", error);
//     return null;
//   }
// };

// /**
//  * Register without referral - new function to support optional referrals
//  */
// export const registerWithoutReferral = async (
//   signer: ethers.Signer,
//   username: string
// ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
//   try {
//     // Step 1: First check if user already has a username in UsernameRegistry
//     const usernameContract = new ethers.Contract(USERNAME_REGISTRY_ADDRESS, GMTeaUsernameABI, signer);
//     const userAddress = await signer.getAddress();
//     const existingUsername = await usernameContract.getUsernameByAddress(userAddress);
    
//     // Step 2: If no username, register in UsernameRegistry
//     if (!existingUsername || existingUsername === "") {
//       // Check if username is available
//       const isAvailable = await usernameContract.isUsernameAvailable(username);
//       if (!isAvailable) {
//         return { success: false, error: "Username is already taken or not available" };
//       }
      
//       // Register username in UsernameRegistry without a referrer
//       const regTx = await usernameContract.registerUsername(username);
//       await regTx.wait();
//       console.log("Username registered in UsernameRegistry:", regTx.hash);
      
//       return { success: true, txHash: regTx.hash };
//     } else {
//       // User already has a username
//       return { success: false, error: "You already have a registered username" };
//     }
//   } catch (error: any) {
//     console.error("Error registering without referral:", error);
//     return { 
//       success: false, 
//       error: error.reason || error.message || "Error registering without referral" 
//     };
//   }
// };

// /**
//  * Register with referral
//  */
// export const registerWithReferral = async (
//   signer: ethers.Signer,
//   username: string,
//   referrerUsername: string
// ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
//   try {
//     // Step 1: First check if user already has a username in UsernameRegistry
//     const usernameContract = new ethers.Contract(USERNAME_REGISTRY_ADDRESS, GMTeaUsernameABI, signer);
//     const userAddress = await signer.getAddress();
//     const existingUsername = await usernameContract.getUsernameByAddress(userAddress);
    
//     // Step 2: If no username, register in UsernameRegistry first
//     if (!existingUsername || existingUsername === "") {
//       // Check if username is available
//       const isAvailable = await usernameContract.isUsernameAvailable(username);
//       if (!isAvailable) {
//         return { success: false, error: "Username is already taken or not available" };
//       }
      
//       // Register username in UsernameRegistry
//       const regTx = await usernameContract.registerUsername(username);
//       await regTx.wait();
//       console.log("Username registered in UsernameRegistry:", regTx.hash);
//     }
    
//     // Step 3: Check if referrer exists in UsernameRegistry
//     const referrerAddress = await usernameContract.getAddressByUsername(referrerUsername);
//     if (!referrerAddress || referrerAddress === ethers.constants.AddressZero) {
//       return { success: false, error: "Referrer username not found. Please enter a valid referrer username." };
//     }
    
//     // Step 4: Register referral relationship in GMTeaReferral
//     const referralContract = new ethers.Contract(REFERRAL_CONTRACT_ADDRESS, GMTeaReferralABI, signer);
//     const tx = await referralContract.registerWithReferral(referrerUsername);
//     await tx.wait();
    
//     return { success: true, txHash: tx.hash };
//   } catch (error: any) {
//     console.error("Error registering with referral:", error);
//     return { 
//       success: false, 
//       error: error.reason || error.message || "Error registering with referral" 
//     };
//   }
// };

// /**
//  * Check if user has minted a badge of the specified tier
//  */
// export const hasUserMintedTier = async (
//   address: string,
//   tier: number
// ): Promise<boolean> => {
//   try {
//     const provider = getProvider();
//     if (!provider) return false;
    
//     const badgeContract = getBadgeContract(provider);
//     return await badgeContract.hasMintedTier(address, tier);
//   } catch (error) {
//     console.error(`Error checking if user has minted tier ${tier}:`, error);
//     return false;
//   }
// };

// /**
//  * Get the highest tier a user has minted
//  * Returns -1 if user has not minted any badges
//  */
// export const getUserHighestTier = async (address: string): Promise<number> => {
//   try {
//     const provider = getProvider();
//     if (!provider) return -1;
    
//     const badgeContract = getBadgeContract(provider);
    
//     try {
//       const highestTier = await badgeContract.getHighestTier(address);
//       return highestTier;
//     } catch (error) {
//       // If this errors, user probably hasn't minted any badges
//       return -1;
//     }
//   } catch (error) {
//     console.error("Error getting user's highest tier:", error);
//     return -1;
//   }
// };

// /**
//  * Mint a badge
//  */
// export const mintBadge = async (
//   signer: ethers.Signer,
//   tier: number
// ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
//   try {
//     const address = await signer.getAddress();
//     const badgeContract = getBadgeContract(signer);
    
//     // Get price for the selected tier
//     const tierKey = Object.keys(BADGE_TIERS).find(
//       key => BADGE_TIERS[key as keyof typeof BADGE_TIERS].id === tier
//     );
//     if (!tierKey) {
//       return { success: false, error: "Invalid tier selected" };
//     }
    
//     const price = ethers.utils.parseEther(BADGE_TIERS[tierKey as keyof typeof BADGE_TIERS].price);
    
//     // Check if user already has the previous tier minted if tier > 0
//     if (tier > 0) {
//       const hasPreviousTier = await hasUserMintedTier(address, tier - 1);
//       if (!hasPreviousTier) {
//         return { success: false, error: "You must mint previous tier first" };
//       }
//     }
    
//     // Mint the badge
//     const tx = await badgeContract.mintBadge(address, tier, {
//       value: price
//     });
//     await tx.wait();
    
//     return { success: true, txHash: tx.hash };
//   } catch (error: any) {
//     console.error("Error minting badge:", error);
//     return { 
//       success: false, 
//       error: error.reason || error.message || "Error minting badge" 
//     };
//   }
// };

// /**
//  * Get user's referral stats
//  */
// export const getUserReferralStats = async (address: string) => {
//   try {
//     const provider = getProvider();
//     if (!provider) return null;
    
//     const referralContract = getReferralContract(provider);
//     const stats = await referralContract.getReferralStats(address);
    
//     return {
//       totalReferrals: stats.totalReferrals.toNumber(),
//       pendingRewardsAmount: ethers.utils.formatEther(stats.pendingRewardsAmount),
//       claimedRewardsAmount: ethers.utils.formatEther(stats.claimedRewardsAmount)
//     };
//   } catch (error) {
//     console.error("Error getting user referral stats:", error);
//     return null;
//   }
// };

// /**
//  * Claim referral rewards
//  */
// export const claimReferralRewards = async (
//   signer: ethers.Signer
// ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
//   try {
//     const referralContract = getReferralContract(signer);
    
//     // Get pending rewards
//     const address = await signer.getAddress();
//     const pendingRewards = await referralContract.pendingRewards(address);
    
//     if (pendingRewards.eq(0)) {
//       return { success: false, error: "No rewards to claim" };
//     }
    
//     // Claim rewards
//     const tx = await referralContract.claimRewards();
//     await tx.wait();
    
//     return { success: true, txHash: tx.hash };
//   } catch (error: any) {
//     console.error("Error claiming referral rewards:", error);
//     return { 
//       success: false, 
//       error: error.reason || error.message || "Error claiming referral rewards" 
//     };
//   }
// };

// /**
//  * Get all badges owned by a user
//  * @param address - User's address
//  * @returns Array of badges owned by the user
//  */
// export const getUserBadges = async (
//     address: string
//   ): Promise<{ tokenId: number; tier: number; mintedAt: number }[]> => {
//     try {
//       const provider = getProvider();
//       if (!provider) return [];
  
//       const badgeContract = getBadgeContract(provider);
      
//       // Get user's badge balance
//       const balance = await badgeContract.balanceOf(address);
//       const balanceNumber = balance.toNumber();
      
//       if (balanceNumber === 0) {
//         return [];
//       }
      
//       // Get badges
//       const badges = [];
//       for (let i = 0; i < balanceNumber; i++) {
//         const tokenId = await badgeContract.tokenOfOwnerByIndex(address, i);
//         const metadata = await badgeContract.badgeMetadata(tokenId);
        
//         badges.push({
//           tokenId: tokenId.toNumber(),
//           tier: metadata.tier,
//           mintedAt: metadata.mintTimestamp.toNumber()
//         });
//       }
      
//       // Sort badges by tier (ascending)
//       badges.sort((a, b) => a.tier - b.tier);
      
//       return badges;
//     } catch (error) {
//       console.error('Error getting user badges:', error);
//       return [];
//     }
//   };