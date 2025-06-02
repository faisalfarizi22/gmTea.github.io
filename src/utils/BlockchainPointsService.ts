import { ethers } from "ethers";
import GMOnchainABI from "../abis/GMOnchainABI.json";
import GMTeaBadgeABI from "../abis/GMTeaBadgeABI.json";
import { 
  CONTRACT_ADDRESS, 
  BADGE_CONTRACT_ADDRESS, 
  DEPLOY_BLOCK
} from "./constants";

export interface CheckInData {
  blockTimestamp: number;
  blockNumber: number;
  transactionHash: string;
  checkinNumber: number;
}

export interface BadgeMintData {
  tier: number;
  blockTimestamp: number;
  blockNumber: number;
  transactionHash: string;
  tokenId: number;
}

export interface CheckInWithPointsData extends CheckInData {
  activeTier: number;
  points: number;
  boost: number;
}

export interface PointsCalculationResult {
  checkinWithPointsHistory: CheckInWithPointsData[];
  totalPoints: number;
  achievementPoints: number;
  leaderboardPoints: number;
  highestTier: number;
  checkinCount: number;
}

export const getProvider = (): ethers.providers.Web3Provider | null => {
  if (typeof window === "undefined") return null;
  
  const ethereum = (window as any).ethereum;
  if (!ethereum) return null;
  
  return new ethers.providers.Web3Provider(ethereum, "any");
};

export const getCheckinContract = (signerOrProvider: ethers.Signer | ethers.providers.Provider): ethers.Contract => {
  return new ethers.Contract(CONTRACT_ADDRESS, GMOnchainABI, signerOrProvider);
};

export const getBadgeContract = (signerOrProvider: ethers.Signer | ethers.providers.Provider): ethers.Contract => {
  return new ethers.Contract(BADGE_CONTRACT_ADDRESS, GMTeaBadgeABI, signerOrProvider);
};

export const getCheckInBoost = (tier: number): number => {
  const boosts = [1.1, 1.2, 1.3, 1.4, 1.5];
  
  if (tier < 0 || tier >= boosts.length) {
    return 1.0;
  }
  
  return boosts[tier];
};

export const getNextCheckinPoints = (highestTier: number): number => {
  const basePoints = 10;
  const boost = highestTier >= 0 ? getCheckInBoost(highestTier) : 1.0;
  return Math.floor(basePoints * boost);
};

export const fetchAllCheckinsFromBlockchain = async (address: string): Promise<CheckInData[]> => {
  try {
    const provider = getProvider();
    if (!provider) throw new Error("No provider available");
    
    const checkinContract = getCheckinContract(provider);
    
    const eventSignature = ethers.utils.id("CheckinCompleted(address,uint256,string,uint256)");
    
    const currentBlock = await provider.getBlockNumber();
    
    const CHUNK_SIZE = 10000;
    
    const checkinEvents: CheckInData[] = [];
    
    for (let fromBlock = DEPLOY_BLOCK; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
      const toBlock = Math.min(currentBlock, fromBlock + CHUNK_SIZE - 1);
      
      try {
        const logs = await provider.getLogs({
          address: checkinContract.address,
          topics: [
            eventSignature,
            ethers.utils.hexZeroPad(address, 32)
          ],
          fromBlock,
          toBlock
        });
        
        for (const log of logs) {
          const parsedLog = checkinContract.interface.parseLog(log);
          
          checkinEvents.push({
            blockNumber: log.blockNumber,
            blockTimestamp: 0,
            transactionHash: log.transactionHash,
            checkinNumber: parsedLog.args.checkinCount.toNumber()
          });
        }
      } catch (error) {
        console.error(`Error fetching logs for blocks ${fromBlock}-${toBlock}:`, error);
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
    
    checkinEvents.sort((a, b) => a.blockNumber - b.blockNumber);
    
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

export const fetchAllBadgeMintEventsFromBlockchain = async (address: string): Promise<BadgeMintData[]> => {
  try {
    const provider = getProvider();
    if (!provider) throw new Error("No provider available");
    
    const badgeContract = getBadgeContract(provider);
    
    const eventSignature = ethers.utils.id("BadgeMinted(address,uint256,uint256)");
    
    const currentBlock = await provider.getBlockNumber();
    
    const CHUNK_SIZE = 10000;
    
    const badgeMintEvents: BadgeMintData[] = [];
    
    for (let fromBlock = DEPLOY_BLOCK; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
      const toBlock = Math.min(currentBlock, fromBlock + CHUNK_SIZE - 1);
      
      try {
        const logs = await provider.getLogs({
          address: badgeContract.address,
          topics: [
            eventSignature,
            ethers.utils.hexZeroPad(address, 32)
          ],
          fromBlock,
          toBlock
        });
        
        for (const log of logs) {
          const parsedLog = badgeContract.interface.parseLog(log);
          
          badgeMintEvents.push({
            blockNumber: log.blockNumber,
            blockTimestamp: 0,
            transactionHash: log.transactionHash,
            tier: parsedLog.args.tier.toNumber(),
            tokenId: parsedLog.args.tokenId.toNumber()
          });
        }
      } catch (error) {
        console.error(`Error fetching badge logs for blocks ${fromBlock}-${toBlock}:`, error);
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
    
    badgeMintEvents.sort((a, b) => a.blockNumber - b.blockNumber);
    
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

export const calculateCheckinPointsFromBlockchain = async (address: string): Promise<PointsCalculationResult> => {
  try {
    const [checkins, badgeMints] = await Promise.all([
      fetchAllCheckinsFromBlockchain(address),
      fetchAllBadgeMintEventsFromBlockchain(address)
    ]);
    
    const badgeTierTimeline: {
      timestamp: number;
      blockNumber: number;
      tier: number;
      transactionHash: string;
    }[] = [];
    
    let currentHighestTier = -1;
    
    for (const badgeMint of badgeMints) {
      if (badgeMint.tier > currentHighestTier) {
        currentHighestTier = badgeMint.tier;
      }
      
      badgeTierTimeline.push({
        timestamp: badgeMint.blockTimestamp,
        blockNumber: badgeMint.blockNumber,
        tier: currentHighestTier,
        transactionHash: badgeMint.transactionHash
      });
    }
    
    const checkinWithPoints: CheckInWithPointsData[] = checkins.map(checkin => {
      let activeTier = -1;
      
      for (const tierChange of badgeTierTimeline) {
        if (tierChange.blockNumber < checkin.blockNumber) {
          activeTier = tierChange.tier;
        } else {
          break;
        }
      }
      
      const boost = activeTier >= 0 ? getCheckInBoost(activeTier) : 1.0;
      
      const basePoints = 10;
      
      const points = Math.floor(basePoints * boost);
      
      return {
        ...checkin,
        activeTier,
        boost,
        points
      };
    });
    
    const checkInPointsTotal = checkinWithPoints.reduce((sum, checkin) => sum + checkin.points, 0);
    
    const totalCheckins = checkins.length;
    let achievementPoints = 0;
    
    if (totalCheckins >= 1) achievementPoints += 50;
    if (totalCheckins >= 7) achievementPoints += 50;
    if (totalCheckins >= 50) achievementPoints += 50;
    if (totalCheckins >= 100) achievementPoints += 200;
    
    const leaderboardPoints = 0;
    
    const totalPoints = checkInPointsTotal + achievementPoints + leaderboardPoints;
    
    const highestTier = currentHighestTier;
    
    return {
      checkinWithPointsHistory: checkinWithPoints.reverse(),
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

export const getUserLeaderboardRank = async (address: string): Promise<number> => {
  try {
    return 0;
  } catch (error) {
    console.error("Error getting user leaderboard rank:", error);
    return 0;
  }
};