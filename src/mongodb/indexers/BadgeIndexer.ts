// src/mongodb/indexers/BadgeIndexer.ts
import { ethers } from 'ethers';
import dbConnect from '../connection';
import SyncStatus from '../models/SyncStatus';
import Badge from '../models/Badge';
import BadgeService from '../services/BadgeService';
import UserService from '../services/UserService';
import { BADGE_CONTRACT_ADDRESS, DEPLOY_BLOCK } from '../../utils/constants';
import GMTeaBadgeABI from '../../abis/GMTeaBadgeABI.json';
import { User } from '../models';

export default class BadgeIndexer {
  private provider: ethers.providers.Provider;
  private contract: ethers.Contract;
  private isIndexing: boolean = false;
  private contractAddress: string;
  private chunkSize: number = 2000; // Number of blocks to process in one batch

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
    this.contractAddress = BADGE_CONTRACT_ADDRESS;
    this.contract = new ethers.Contract(this.contractAddress, GMTeaBadgeABI, this.provider);
  }

  /**
   * Start indexing badge events
   */
  async startIndexing(): Promise<void> {
    if (this.isIndexing) {
      console.log('Badge indexing already in progress');
      return;
    }

    try {
      this.isIndexing = true;
      await dbConnect();

      // Get the last processed block
      let syncStatus = await SyncStatus.findOne({ contractAddress: this.contractAddress });
      
      if (!syncStatus) {
        // If no sync status found, create one starting from the deploy block
        syncStatus = await SyncStatus.create({
          contractAddress: this.contractAddress,
          lastProcessedBlock: DEPLOY_BLOCK - 1, // Start from deploy block
          lastSyncTimestamp: new Date(),
          isCurrentlySyncing: true
        });
      } else {
        // Update sync status
        await SyncStatus.updateOne(
          { contractAddress: this.contractAddress },
          { isCurrentlySyncing: true, lastSyncTimestamp: new Date() }
        );
      }

      const fromBlock = syncStatus.lastProcessedBlock + 1;
      const currentBlock = await this.provider.getBlockNumber();

      console.log(`Indexing badge events from block ${fromBlock} to ${currentBlock}`);

      // Process blocks in chunks to avoid memory issues
      for (let startBlock = fromBlock; startBlock <= currentBlock; startBlock += this.chunkSize) {
        const endBlock = Math.min(currentBlock, startBlock + this.chunkSize - 1);
        await this.processBlockRange(startBlock, endBlock);
        
        // Update the sync status after each chunk
        await SyncStatus.updateOne(
          { contractAddress: this.contractAddress },
          { lastProcessedBlock: endBlock, lastSyncTimestamp: new Date() }
        );
      }

      // Mark sync as complete
      await SyncStatus.updateOne(
        { contractAddress: this.contractAddress },
        { isCurrentlySyncing: false, lastSyncTimestamp: new Date() }
      );

    } catch (error) {
      console.error('Error in badge indexing:', error);
      
      // Update sync status as not syncing
      await SyncStatus.updateOne(
        { contractAddress: this.contractAddress },
        { isCurrentlySyncing: false }
      );
    } finally {
      this.isIndexing = false;
    }
  }

  /**
   * Process a range of blocks for badge events
   */
  private async processBlockRange(fromBlock: number, toBlock: number): Promise<void> {
    try {
      console.log(`Processing badge events in blocks ${fromBlock}-${toBlock}`);
      
      // IMPORTANT: Try both event signatures to ensure we're catching all events
      // The issue might be that we're using the wrong event signature format
      const badgeMintEventSignatures = [
        ethers.utils.id("BadgeMinted(address,uint256,uint8,address)"),  // Original
        ethers.utils.id("BadgeMinted(address,uint256,uint256,address)") // Alternative if tier is uint256
      ];

      let allLogs: ethers.providers.Log[] = [];
      
      // Try to fetch logs with both signatures
      for (const signature of badgeMintEventSignatures) {
        try {
          const logs = await this.provider.getLogs({
            address: this.contractAddress,
            topics: [signature],
            fromBlock,
            toBlock
          });
          
          if (logs.length > 0) {
            console.log(`Found ${logs.length} badge mint events with signature ${signature}`);
            allLogs = [...allLogs, ...logs];
          }
        } catch (error) {
          console.error(`Error fetching logs with signature ${signature}:`, error);
        }
      }
      
      // If no events found with either signature, try a more generic approach
      if (allLogs.length === 0) {
        console.log('No events found with specific signatures, trying generic approach');
        const logs = await this.provider.getLogs({
          address: this.contractAddress,
          fromBlock,
          toBlock
        });
        
        // Filter logs that might be BadgeMinted events
        allLogs = logs.filter(log => {
          try {
            const parsedLog = this.contract.interface.parseLog(log);
            return parsedLog && parsedLog.name === 'BadgeMinted';
          } catch (error) {
            return false;
          }
        });
        
        console.log(`Found ${allLogs.length} potential badge mint events with generic approach`);
      }

      // Process logs in batches to avoid overwhelming MongoDB
      const batchSize = 50;
      for (let i = 0; i < allLogs.length; i += batchSize) {
        const batch = allLogs.slice(i, i + batchSize);
        const badgePromises = batch.map(log => this.processBadgeMintLog(log));
        await Promise.all(badgePromises);
      }
    } catch (error) {
      console.error(`Error processing block range ${fromBlock}-${toBlock}:`, error);
      
      // If chunk size is larger than 1000, retry with smaller chunks
      if (this.chunkSize > 1000 && toBlock - fromBlock >= 1000) {
        console.log(`Retrying with smaller chunk size for range ${fromBlock}-${toBlock}`);
        const smallerChunkSize = Math.floor(this.chunkSize / 5);
        
        for (let smallFromBlock = fromBlock; smallFromBlock <= toBlock; smallFromBlock += smallerChunkSize) {
          const smallToBlock = Math.min(toBlock, smallFromBlock + smallerChunkSize - 1);
          await this.processBlockRange(smallFromBlock, smallToBlock);
        }
      }
    }
  }

  /**
   * Process a single badge mint log
   */
  private async processBadgeMintLog(log: ethers.providers.Log): Promise<void> {
    try {
      console.log(`Processing log: ${log.transactionHash} - ${log.logIndex}`);
      
      // Try to parse the log
      let parsedLog;
      try {
        parsedLog = this.contract.interface.parseLog(log);
      } catch (error) {
        console.error(`Failed to parse log ${log.transactionHash}:`, error);
        // If parsing fails, try to get the transaction receipt and decode manually
        const tx = await this.provider.getTransaction(log.transactionHash);
        if (tx && tx.to && tx.to.toLowerCase() === this.contractAddress.toLowerCase()) {
          console.log(`Attempting manual decode for tx ${log.transactionHash}`);
          // Attempt to decode input data
          try {
            const decodedData = this.contract.interface.decodeFunctionData('mintBadge', tx.data);
            console.log(`Decoded mintBadge transaction data:`, decodedData);
          } catch (e) {
            console.log(`Failed to decode transaction input: ${e}`);
          }
        }
        return;
      }
      
      // Verify this is a BadgeMinted event
      if (parsedLog.name !== 'BadgeMinted') {
        console.log(`Skipping non-BadgeMinted event: ${parsedLog.name}`);
        return;
      }
      
      // Debug event data
      console.log(`Event data:`, parsedLog.args);
      
      // Extract data from the log safely
      const owner = parsedLog.args.to?.toLowerCase() || parsedLog.args[0]?.toLowerCase();
      let tokenId, tier, referrer;
      
      // Handle different argument structures
      if (parsedLog.args.tokenId !== undefined) {
        tokenId = typeof parsedLog.args.tokenId.toNumber === 'function' 
          ? parsedLog.args.tokenId.toNumber() 
          : Number(parsedLog.args.tokenId);
      } else if (parsedLog.args[1] !== undefined) {
        tokenId = typeof parsedLog.args[1].toNumber === 'function'
          ? parsedLog.args[1].toNumber()
          : Number(parsedLog.args[1]);
      }
      
      if (parsedLog.args.tier !== undefined) {
        tier = typeof parsedLog.args.tier.toNumber === 'function'
          ? parsedLog.args.tier.toNumber()
          : Number(parsedLog.args.tier);
      } else if (parsedLog.args[2] !== undefined) {
        tier = typeof parsedLog.args[2].toNumber === 'function'
          ? parsedLog.args[2].toNumber()
          : Number(parsedLog.args[2]);
      }
      
      referrer = (parsedLog.args.referrer || parsedLog.args[3] || ethers.constants.AddressZero);
      const referrerAddress = referrer !== ethers.constants.AddressZero ? referrer.toLowerCase() : null;
      
      console.log(`Parsed event data - Owner: ${owner}, TokenId: ${tokenId}, Tier: ${tier}, Referrer: ${referrerAddress}`);
      
      // Validate required data
      if (!owner || tokenId === undefined || tier === undefined) {
        console.error('Invalid event data:', parsedLog.args);
        return;
      }
      
      // Get block timestamp
      const block = await this.provider.getBlock(log.blockNumber);
      const timestamp = block.timestamp;
      
      // Check if this badge already exists in the database
      const existingBadge = await Badge.findOne({ tokenId: tokenId });
      
      if (existingBadge) {
        console.log(`Badge ${tokenId} already indexed, updating referrer if needed`);
        
        // Update referrer if it was null but is now available
        if (!existingBadge.referrer && referrerAddress) {
          await Badge.updateOne(
            { tokenId: tokenId },
            { $set: { referrer: referrerAddress } }
          );
          console.log(`Updated referrer for badge ${tokenId} to ${referrerAddress}`);
        }
        return;
      }
      
      console.log(`Saving new badge ${tokenId} for owner ${owner}`);
      
      // Save the badge mint
      const savedBadge = await BadgeService.saveBadgeMint({
        tokenId,
        owner,
        tier,
        mintedAt: new Date(timestamp * 1000),
        transactionHash: log.transactionHash,
        referrer: referrerAddress
      });
      
      console.log(`Successfully saved badge ${tokenId}:`, savedBadge);
      
      // Update user's highest tier
      try {
        const user = await User.findOne({ address: owner });
        const currentTier = user ? user.highestBadgeTier : -1;
        
        if (tier > currentTier) {
          await UserService.updateHighestBadgeTier(owner, tier);
          console.log(`Updated highest tier for ${owner} to ${tier}`);
        }
      } catch (error) {
        console.error(`Error updating user tier:`, error);
      }
      
    } catch (error) {
      console.error(`Error processing badge mint log:`, error);
    }
  }

  /**
   * Force reindex all events (for debugging/reset)
   */
  async reindexAll(): Promise<void> {
    await dbConnect();
    
    // Reset sync status
    await SyncStatus.updateOne(
      { contractAddress: this.contractAddress },
      { lastProcessedBlock: DEPLOY_BLOCK - 1, isCurrentlySyncing: false },
      { upsert: true }
    );
    
    // Clear existing data
    await Badge.deleteMany({});
    
    // Start indexing
    await this.startIndexing();
  }
}