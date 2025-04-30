import { ethers } from "ethers"
import { DEPLOY_BLOCK } from "./constants"

/**
 * Leaderboard entry type
 * Represents a user entry in the leaderboard
 */
export interface LeaderboardEntry {
  address: string
  checkinCount: number
  lastCheckin?: number
}

/**
 * Get leaderboard data from the blockchain by analyzing CheckinCompleted events
 *
 * @param contract The GMOnchain contract
 * @param limit Optional limit on number of entries to return (default: 10)
 * @returns Promise<LeaderboardEntry[]> Array of leaderboard entries sorted by check-in count
 */
export const getLeaderboardData = async (contract: ethers.Contract, limit = 10): Promise<LeaderboardEntry[]> => {
  try {
    const provider = contract.provider
    if (!provider) {
      console.error("Provider not available")
      return []
    }

    // Try to use contract method if it exists
    try {
      const contractLeaderboard = await contract.getLeaderboard(limit)
      if (Array.isArray(contractLeaderboard) && contractLeaderboard.length > 0) {
        return contractLeaderboard.map((entry) => ({
          address: entry.user,
          checkinCount: ethers.BigNumber.isBigNumber(entry.count) ? entry.count.toNumber() : Number(entry.count),
          lastCheckin: entry.lastCheckin
            ? ethers.BigNumber.isBigNumber(entry.lastCheckin)
              ? entry.lastCheckin.toNumber()
              : Number(entry.lastCheckin)
            : undefined,
        }))
      }
    } catch (contractMethodError) {
      console.warn("Contract doesn't have getLeaderboard method, falling back to events", contractMethodError)
    }

    // Fallback: get events and compute leaderboard
    console.log("Fetching checkin events for leaderboard...")

    // Define event signature for CheckinCompleted event
    const eventSignature = ethers.utils.id("CheckinCompleted(address,uint256,string,uint256)")

    const currentBlock = await provider.getBlockNumber()

    // Process in chunks to avoid RPC limitations
    const CHUNK_SIZE = 10000
    const userCheckins: { [address: string]: { count: number; lastCheckin?: number } } = {}

    // Loop through chunks of blocks
    for (let fromBlock = DEPLOY_BLOCK; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
      const toBlock = Math.min(currentBlock, fromBlock + CHUNK_SIZE - 1)

      try {
        // Get logs for the chunk
        const logs = await provider.getLogs({
          address: contract.address,
          topics: [eventSignature],
          fromBlock,
          toBlock,
        })

        // Process each checkin event
        for (const log of logs) {
          try {
            const parsedLog = contract.interface.parseLog(log)
            const { user, timestamp } = parsedLog.args

            if (!user) continue // Skip if user is undefined

            if (!userCheckins[user]) {
              userCheckins[user] = { count: 0 }
            }

            userCheckins[user].count += 1

            // Update last checkin time if newer
            const timestampNum = ethers.BigNumber.isBigNumber(timestamp) ? timestamp.toNumber() : Number(timestamp)

            if (!userCheckins[user].lastCheckin || timestampNum > userCheckins[user].lastCheckin!) {
              userCheckins[user].lastCheckin = timestampNum
            }
          } catch (parseError) {
            console.warn("Error parsing log:", parseError)
            continue // Skip this log and continue
          }
        }
      } catch (error) {
        console.warn(`Error fetching logs for blocks ${fromBlock}-${toBlock}:`, error)

        // Try smaller chunks if the request fails
        if (CHUNK_SIZE > 1000) {
          const smallerChunkSize = Math.floor(CHUNK_SIZE / 5)

          for (let smallFromBlock = fromBlock; smallFromBlock <= toBlock; smallFromBlock += smallerChunkSize) {
            const smallToBlock = Math.min(toBlock, smallFromBlock + smallerChunkSize - 1)

            try {
              const smallerLogs = await provider.getLogs({
                address: contract.address,
                topics: [eventSignature],
                fromBlock: smallFromBlock,
                toBlock: smallToBlock,
              })

              // Process each checkin event from smaller chunk
              for (const log of smallerLogs) {
                try {
                  const parsedLog = contract.interface.parseLog(log)
                  const { user, timestamp } = parsedLog.args

                  if (!user) continue // Skip if user is undefined

                  if (!userCheckins[user]) {
                    userCheckins[user] = { count: 0 }
                  }

                  userCheckins[user].count += 1

                  // Update last checkin time if newer
                  const timestampNum = ethers.BigNumber.isBigNumber(timestamp)
                    ? timestamp.toNumber()
                    : Number(timestamp)

                  if (!userCheckins[user].lastCheckin || timestampNum > userCheckins[user].lastCheckin!) {
                    userCheckins[user].lastCheckin = timestampNum
                  }
                } catch (parseError) {
                  console.warn("Error parsing log in smaller chunk:", parseError)
                  continue // Skip this log and continue
                }
              }
            } catch (smallerError) {
              console.error(`Failed to process smaller chunk ${smallFromBlock}-${smallToBlock}:`, smallerError)
            }
          }
        }
      }
    }

    // Convert to array and sort by checkin count
    const leaderboard = Object.entries(userCheckins)
      .map(([address, { count, lastCheckin }]) => ({
        address,
        checkinCount: count,
        lastCheckin,
      }))
      .sort((a, b) => {
        // Sort by count (descending)
        if (b.checkinCount !== a.checkinCount) {
          return b.checkinCount - a.checkinCount
        }
        // If counts are equal, sort by most recent checkin (descending)
        if (a.lastCheckin && b.lastCheckin) {
          return b.lastCheckin - a.lastCheckin
        }
        return 0
      })

    // Return limited number of entries
    return leaderboard.slice(0, limit)
  } catch (error) {
    console.error("Error getting leaderboard data:", error)
    return []
  }
}

/**
 * Get rank of a specific user in the leaderboard
 *
 * @param contract The GMOnchain contract
 * @param userAddress Address of the user to find rank for
 * @returns Promise<number|null> User's rank (1-based) or null if not found
 */
export const getUserLeaderboardRank = async (
  contract: ethers.Contract,
  userAddress: string,
): Promise<number | null> => {
  try {
    if (!userAddress) return null

    // Normalize the address for comparison
    const normalizedUserAddress = userAddress.toLowerCase()

    // Try to use contract method first if it exists
    try {
      const userRank = await contract.getUserRank(userAddress)
      if (userRank) {
        return ethers.BigNumber.isBigNumber(userRank) ? userRank.toNumber() : Number(userRank)
      }
    } catch (contractMethodError) {
      console.warn("Contract doesn't have getUserRank method, calculating manually", contractMethodError)
    }

    // Get full leaderboard data (with reasonable limit to ensure we can find the user)
    // 1000 is a reasonable limit for performance/practicality reasons
    const allEntries = await getLeaderboardData(contract, 1000)

    // Find user's position
    const userIndex = allEntries.findIndex((entry) => entry.address.toLowerCase() === normalizedUserAddress)

    // Return 1-based rank, or null if not found
    return userIndex !== -1 ? userIndex + 1 : null
  } catch (error) {
    console.error("Error getting user rank:", error)
    return null
  }
}

/**
 * Get statistics about active wallets from the blockchain
 * 
 * @param contract The GMOnchain contract
 * @returns Promise<{activeWallets: number, todayCheckins: number}> Statistics about active wallets
 */
export const getWalletStats = async (
  contract: ethers.Contract
): Promise<{activeWallets: number, todayCheckins: number}> => {
  try {
    const provider = contract.provider;
    if (!provider) {
      console.error("Provider not available");
      return { activeWallets: 0, todayCheckins: 0 };
    }

    // Try to use contract method if it exists
    try {
      const stats = await contract.getWalletStats();
      if (stats && stats.activeWallets && stats.todayCheckins) {
        return {
          activeWallets: ethers.BigNumber.isBigNumber(stats.activeWallets) 
            ? stats.activeWallets.toNumber() 
            : Number(stats.activeWallets),
          todayCheckins: ethers.BigNumber.isBigNumber(stats.todayCheckins) 
            ? stats.todayCheckins.toNumber() 
            : Number(stats.todayCheckins)
        };
      }
    } catch (contractMethodError) {
      console.warn("Contract doesn't have getWalletStats method, calculating manually", contractMethodError);
    }

    // Fallback: analyze events to compute stats
    console.log("Analyzing checkin events for wallet statistics...");

    // Define event signature for CheckinCompleted event
    const eventSignature = ethers.utils.id("CheckinCompleted(address,uint256,string,uint256)");

    const currentBlock = await provider.getBlockNumber();
    const now = Math.floor(Date.now() / 1000);
    const startOfToday = now - (now % 86400); // Start of today (00:00:00)

    // Process in chunks to avoid RPC limitations
    const CHUNK_SIZE = 10000;
    const uniqueWallets = new Set<string>();
    const todayWallets = new Set<string>();

    // Loop through chunks of blocks
    for (let fromBlock = DEPLOY_BLOCK; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
      const toBlock = Math.min(currentBlock, fromBlock + CHUNK_SIZE - 1);

      try {
        // Get logs for the chunk
        const logs = await provider.getLogs({
          address: contract.address,
          topics: [eventSignature],
          fromBlock,
          toBlock,
        });

        // Process each checkin event
        for (const log of logs) {
          try {
            const parsedLog = contract.interface.parseLog(log);
            const { user, timestamp } = parsedLog.args;

            if (!user) continue; // Skip if user is undefined

            // Add to unique wallets set
            uniqueWallets.add(user.toLowerCase());

            // Check if this is a check-in from today
            const timestampNum = ethers.BigNumber.isBigNumber(timestamp) 
              ? timestamp.toNumber() 
              : Number(timestamp);
            
            if (timestampNum >= startOfToday) {
              todayWallets.add(user.toLowerCase());
            }
          } catch (parseError) {
            console.warn("Error parsing log:", parseError);
            continue; // Skip this log and continue
          }
        }
      } catch (error) {
        console.warn(`Error fetching logs for blocks ${fromBlock}-${toBlock}:`, error);

        // Try smaller chunks if the request fails
        if (CHUNK_SIZE > 1000) {
          const smallerChunkSize = Math.floor(CHUNK_SIZE / 5);

          for (let smallFromBlock = fromBlock; smallFromBlock <= toBlock; smallFromBlock += smallerChunkSize) {
            const smallToBlock = Math.min(toBlock, smallFromBlock + smallerChunkSize - 1);

            try {
              const smallerLogs = await provider.getLogs({
                address: contract.address,
                topics: [eventSignature],
                fromBlock: smallFromBlock,
                toBlock: smallToBlock,
              });

              // Process each checkin event from smaller chunk
              for (const log of smallerLogs) {
                try {
                  const parsedLog = contract.interface.parseLog(log);
                  const { user, timestamp } = parsedLog.args;

                  if (!user) continue; // Skip if user is undefined

                  // Add to unique wallets set
                  uniqueWallets.add(user.toLowerCase());

                  // Check if this is a check-in from today
                  const timestampNum = ethers.BigNumber.isBigNumber(timestamp) 
                    ? timestamp.toNumber() 
                    : Number(timestamp);
                  
                  if (timestampNum >= startOfToday) {
                    todayWallets.add(user.toLowerCase());
                  }
                } catch (parseError) {
                  console.warn("Error parsing log in smaller chunk:", parseError);
                  continue; // Skip this log and continue
                }
              }
            } catch (smallerError) {
              console.error(`Failed to process smaller chunk ${smallFromBlock}-${smallToBlock}:`, smallerError);
            }
          }
        }
      }
    }

    return {
      activeWallets: uniqueWallets.size,
      todayCheckins: todayWallets.size
    };
  } catch (error) {
    console.error("Error getting wallet statistics:", error);
    return { activeWallets: 0, todayCheckins: 0 };
  }
};