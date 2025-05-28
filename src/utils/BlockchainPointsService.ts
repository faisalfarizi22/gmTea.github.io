import { ethers } from "ethers";
import GMOnchainABI from "../abis/GMOnchainABI.json";
import GMTeaBadgeABI from "../abis/GMTeaBadgeABI.json";
import { 
  CONTRACT_ADDRESS, 
  BADGE_CONTRACT_ADDRESS, 
  DEPLOY_BLOCK
} from "./constants";

/**
 * Defines the check-in data structure from blockchain
 */
export interface CheckInData {
  blockTimestamp: number;
  blockNumber: number;
  transactionHash: string;
  checkinNumber: number;
}

/**
 * Defines badge mint data from blockchain
 */
export interface BadgeMintData {
  tier: number;
  blockTimestamp: number;
  blockNumber: number;
  transactionHash: string;
  tokenId: number;
}

/**
 * Combined data with points calculation
 */
export interface CheckInWithPointsData extends CheckInData {
  activeTier: number;
  points: number;
  boost: number;
}

/**
 * Points calculation result
 */
export interface PointsCalculationResult {
  checkinWithPointsHistory: CheckInWithPointsData[];
  totalPoints: number;
  achievementPoints: number;
  leaderboardPoints: number;
  highestTier: number;
  checkinCount: number;
}

/**
 * Get Ethereum provider from window object
 * @returns Web3Provider or null if not available
 */
export const getProvider = (): ethers.providers.Web3Provider | null => {
  if (typeof window === "undefined") return null;
  
  const ethereum = (window as any).ethereum;
  if (!ethereum) return null;
  
  return new ethers.providers.Web3Provider(ethereum, "any");
};

/**
 * Get contract instance
 * @param signerOrProvider Signer or Provider to use with contract
 * @returns Contract instance
 */
export const getCheckinContract = (signerOrProvider: ethers.Signer | ethers.providers.Provider): ethers.Contract => {
  return new ethers.Contract(CONTRACT_ADDRESS, GMOnchainABI, signerOrProvider);
};

/**
 * Get badge contract instance
 * @param signerOrProvider Signer or Provider to use with contract
 * @returns Contract instance
 */
export const getBadgeContract = (signerOrProvider: ethers.Signer | ethers.providers.Provider): ethers.Contract => {
  return new ethers.Contract(BADGE_CONTRACT_ADDRESS, GMTeaBadgeABI, signerOrProvider);
};

/**
 * Calculate boost factor based on badge tier
 * @param tier Badge tier (0-4)
 * @returns Boost factor as a number
 */
export const getCheckInBoost = (tier: number): number => {
  const boosts = [1.1, 1.2, 1.3, 1.4, 1.5]; // Common, Uncommon, Rare, Epic, Legendary
  
  if (tier < 0 || tier >= boosts.length) {
    return 1.0; // No boost for invalid tiers
  }
  
  return boosts[tier];
};

/**
 * Calculate expected points for next check-in based on highest tier
 * @param highestTier User's highest badge tier
 * @returns Expected points for next check-in
 */
export const getNextCheckinPoints = (highestTier: number): number => {
  const basePoints = 10;
  const boost = highestTier >= 0 ? getCheckInBoost(highestTier) : 1.0;
  return Math.floor(basePoints * boost);
};

/**
 * Fetch all check-in data from blockchain for a specific address
 * @param address User wallet address
 * @returns Promise resolving to array of check-in data
 */
export const fetchAllCheckinsFromBlockchain = async (address: string): Promise<CheckInData[]> => {
  try {
    const provider = getProvider();
    if (!provider) throw new Error("No provider available");
    
    const checkinContract = getCheckinContract(provider);
    
    // Define the check-in event signature
    const eventSignature = ethers.utils.id("CheckinCompleted(address,uint256,string,uint256)");
    
    // Get current block
    const currentBlock = await provider.getBlockNumber();
    
    // Define chunk size for efficient log fetching
    const CHUNK_SIZE = 10000;
    
    // Array to store all check-in events
    const checkinEvents: CheckInData[] = [];
    
    // Fetch logs in chunks to avoid RPC limitations
    for (let fromBlock = DEPLOY_BLOCK; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
      const toBlock = Math.min(currentBlock, fromBlock + CHUNK_SIZE - 1);
      
      try {
        // Get logs for this address only
        const logs = await provider.getLogs({
          address: checkinContract.address,
          topics: [
            eventSignature,
            ethers.utils.hexZeroPad(address, 32) // Filter by user address
          ],
          fromBlock,
          toBlock
        });
        
        for (const log of logs) {
          const parsedLog = checkinContract.interface.parseLog(log);
          
          checkinEvents.push({
            blockNumber: log.blockNumber,
            blockTimestamp: 0, // Will be populated below
            transactionHash: log.transactionHash,
            checkinNumber: parsedLog.args.checkinCount.toNumber()
          });
        }
      } catch (error) {
        console.error(`Error fetching logs for blocks ${fromBlock}-${toBlock}:`, error);
        // Try with smaller chunk size if failed
        if (CHUNK_SIZE > 1000) {
          const smallerChunkSize = Math.floor(CHUNK_SIZE / 5);
          
          for (let smallFromBlock = fromBlock; smallFromBlock <= toBlock; smallFromBlock += smallerChunkSize) {
            const smallToBlock = Math.min(toBlock, smallFromBlock + smallerChunkSize - 1);
            
            try {
              const smallerLogs = await provider.getLogs({
                address: checkinContract.address,
                topics: [
                  eventSignature,
                  ethers.utils.hexZeroPad(address, 32)
                ],
                fromBlock: smallFromBlock,
                toBlock: smallToBlock
              });
              
              for (const log of smallerLogs) {
                const parsedLog = checkinContract.interface.parseLog(log);
                
                checkinEvents.push({
                  blockNumber: log.blockNumber,
                  blockTimestamp: 0,
                  transactionHash: log.transactionHash,
                  checkinNumber: parsedLog.args.checkinCount.toNumber()
                });
              }
            } catch (smallerError) {
              console.error(`Failed to process smaller chunk ${smallFromBlock}-${smallToBlock}:`, smallerError);
            }
          }
        }
      }
    }
    
    // Sort check-ins by block number (ascending order)
    checkinEvents.sort((a, b) => a.blockNumber - b.blockNumber);
    
    // Get block timestamps for all check-ins
    // (We do this in batches to avoid too many simultaneous requests)
    const BATCH_SIZE = 10;
    for (let i = 0; i < checkinEvents.length; i += BATCH_SIZE) {
      const batch = checkinEvents.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (event) => {
        try {
          const block = await provider.getBlock(event.blockNumber);
          event.blockTimestamp = block.timestamp;
        } catch (error) {
          console.error(`Error fetching block ${event.blockNumber}:`, error);
        }
      }));
    }
    
    return checkinEvents;
  } catch (error) {
    console.error("Error fetching check-ins from blockchain:", error);
    throw error;
  }
};

/**
 * Fetch all badge mint events from blockchain for a specific address
 * @param address User wallet address
 * @returns Promise resolving to array of badge mint data
 */
export const fetchAllBadgeMintEventsFromBlockchain = async (address: string): Promise<BadgeMintData[]> => {
  try {
    const provider = getProvider();
    if (!provider) throw new Error("No provider available");
    
    const badgeContract = getBadgeContract(provider);
    
    // Define badge mint event signature
    const eventSignature = ethers.utils.id("BadgeMinted(address,uint256,uint256)");
    
    // Get current block
    const currentBlock = await provider.getBlockNumber();
    
    // Define chunk size for efficient log fetching
    const CHUNK_SIZE = 10000;
    
    // Array to store all badge mint events
    const badgeMintEvents: BadgeMintData[] = [];
    
    // Fetch logs in chunks to avoid RPC limitations
    for (let fromBlock = DEPLOY_BLOCK; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
      const toBlock = Math.min(currentBlock, fromBlock + CHUNK_SIZE - 1);
      
      try {
        // Get logs for this address only
        const logs = await provider.getLogs({
          address: badgeContract.address,
          topics: [
            eventSignature,
            ethers.utils.hexZeroPad(address, 32) // Filter by user address
          ],
          fromBlock,
          toBlock
        });
        
        for (const log of logs) {
          const parsedLog = badgeContract.interface.parseLog(log);
          
          badgeMintEvents.push({
            blockNumber: log.blockNumber,
            blockTimestamp: 0, // Will be populated below
            transactionHash: log.transactionHash,
            tier: parsedLog.args.tier.toNumber(),
            tokenId: parsedLog.args.tokenId.toNumber()
          });
        }
      } catch (error) {
        console.error(`Error fetching badge logs for blocks ${fromBlock}-${toBlock}:`, error);
        // Try with smaller chunk size if failed
        if (CHUNK_SIZE > 1000) {
          const smallerChunkSize = Math.floor(CHUNK_SIZE / 5);
          
          for (let smallFromBlock = fromBlock; smallFromBlock <= toBlock; smallFromBlock += smallerChunkSize) {
            const smallToBlock = Math.min(toBlock, smallFromBlock + smallerChunkSize - 1);
            
            try {
              const smallerLogs = await provider.getLogs({
                address: badgeContract.address,
                topics: [
                  eventSignature,
                  ethers.utils.hexZeroPad(address, 32)
                ],
                fromBlock: smallFromBlock,
                toBlock: smallToBlock
              });
              
              for (const log of smallerLogs) {
                const parsedLog = badgeContract.interface.parseLog(log);
                
                badgeMintEvents.push({
                  blockNumber: log.blockNumber,
                  blockTimestamp: 0,
                  transactionHash: log.transactionHash,
                  tier: parsedLog.args.tier.toNumber(),
                  tokenId: parsedLog.args.tokenId.toNumber()
                });
              }
            } catch (smallerError) {
              console.error(`Failed to process smaller badge chunk ${smallFromBlock}-${smallToBlock}:`, smallerError);
            }
          }
        }
      }
    }
    
    // Sort badge mints by block number (ascending order)
    badgeMintEvents.sort((a, b) => a.blockNumber - b.blockNumber);
    
    // Get block timestamps for all badge mints
    const BATCH_SIZE = 10;
    for (let i = 0; i < badgeMintEvents.length; i += BATCH_SIZE) {
      const batch = badgeMintEvents.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (event) => {
        try {
          const block = await provider.getBlock(event.blockNumber);
          event.blockTimestamp = block.timestamp;
        } catch (error) {
          console.error(`Error fetching block ${event.blockNumber}:`, error);
        }
      }));
    }
    
    return badgeMintEvents;
  } catch (error) {
    console.error("Error fetching badge mints from blockchain:", error);
    throw error;
  }
};

/**
 * Calculate points for check-ins with badge boosts applied based on actual blockchain data
 * @param address User wallet address
 * @returns Promise resolving to object with check-in and points data
 */
export const calculateCheckinPointsFromBlockchain = async (address: string): Promise<PointsCalculationResult> => {
  try {
    // Fetch all check-ins and badge mints from blockchain
    const [checkins, badgeMints] = await Promise.all([
      fetchAllCheckinsFromBlockchain(address),
      fetchAllBadgeMintEventsFromBlockchain(address)
    ]);
    
    // Process badge mints to find highest tier at any given time
    // This stores the highest tier available after each badge mint
    const badgeTierTimeline: {
      timestamp: number;
      blockNumber: number;
      tier: number;
      transactionHash: string;
    }[] = [];
    
    let currentHighestTier = -1;
    
    // Process badge mints in chronological order
    for (const badgeMint of badgeMints) {
      // Update highest tier if this badge is higher
      if (badgeMint.tier > currentHighestTier) {
        currentHighestTier = badgeMint.tier;
      }
      
      // Add to timeline
      badgeTierTimeline.push({
        timestamp: badgeMint.blockTimestamp,
        blockNumber: badgeMint.blockNumber,
        tier: currentHighestTier,
        transactionHash: badgeMint.transactionHash
      });
    }
    
    // Calculate points for each check-in based on highest tier badge at time of check-in
    const checkinWithPoints: CheckInWithPointsData[] = checkins.map(checkin => {
      // Find highest badge tier at the time of this check-in
      let activeTier = -1; // No tier/no boost by default
      
      // Find the latest badge mint that happened before this check-in
      for (const tierChange of badgeTierTimeline) {
        if (tierChange.blockNumber < checkin.blockNumber) {
          activeTier = tierChange.tier;
        } else {
          // Stop looking once we reach badge mints that happened after this check-in
          break;
        }
      }
      
      // Calculate boost based on active tier
      const boost = activeTier >= 0 ? getCheckInBoost(activeTier) : 1.0;
      
      // Base points for check-in
      const basePoints = 10;
      
      // Calculate points with boost applied
      const points = Math.floor(basePoints * boost);
      
      return {
        ...checkin,
        activeTier,
        boost,
        points
      };
    });
    
    // Calculate total points from check-ins
    const checkInPointsTotal = checkinWithPoints.reduce((sum, checkin) => sum + checkin.points, 0);
    
    // Calculate achievement points based on check-in count
    const totalCheckins = checkins.length;
    let achievementPoints = 0;
    
    if (totalCheckins >= 1) achievementPoints += 50; // First check-in
    if (totalCheckins >= 7) achievementPoints += 50; // 7 check-ins
    if (totalCheckins >= 50) achievementPoints += 50; // 50 check-ins
    if (totalCheckins >= 100) achievementPoints += 200; // 100 check-ins
    
    // Calculate leaderboard points (would need to be implemented with actual leaderboard data)
    const leaderboardPoints = 0; // Placeholder, to be implemented with real leaderboard data
    
    // Calculate total points
    const totalPoints = checkInPointsTotal + achievementPoints + leaderboardPoints;
    
    // Get highest tier badge the user has minted
    const highestTier = currentHighestTier;
    
    return {
      checkinWithPointsHistory: checkinWithPoints.reverse(), // Most recent first
      totalPoints,
      achievementPoints,
      leaderboardPoints,
      highestTier,
      checkinCount: totalCheckins
    };
  } catch (error) {
    console.error("Error calculating check-in points from blockchain:", error);
    throw error;
  }
};

/**
 * Get user's leaderboard rank based on total points
 * @param address User wallet address
 * @returns Promise resolving to user's rank
 */
export const getUserLeaderboardRank = async (address: string): Promise<number> => {
  try {
    // This function would need to be implemented based on your leaderboard contract logic
    // For now, return a placeholder value
    return 0;
  } catch (error) {
    console.error("Error getting user leaderboard rank:", error);
    return 0;
  }
};