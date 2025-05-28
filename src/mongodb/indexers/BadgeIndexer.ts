// src/mongodb/indexers/BadgeIndexer.ts
import { ethers } from 'ethers';
import dbConnect from '../connection';
import SyncStatus from '../models/SyncStatus';
import Badge from '../models/Badge';
import User from '../models/User';
import PointsHistory from '../models/PointsHistory';
import CheckinService from '../services/CheckinService';
import WebhookService from '../services/WebhookService';
import { BADGE_CONTRACT_ADDRESS, DEPLOY_BLOCK } from '../../utils/constants';
import GMTeaBadgeABI from '../../abis/GMTeaBadgeABI.json';
import PointsService from '../services/PointsService';

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
   * Process a badge mint event
   */
  private async processBadgeMintLog(log: ethers.providers.Log): Promise<void> {
    try {
      // Parse the log
      const parsedLog = this.contract.interface.parseLog(log);
      
      // Extract data from the log
      const to = parsedLog.args.to.toLowerCase();
      const tokenId = parsedLog.args.tokenId.toNumber();
      const tier = parsedLog.args.tier; // Tier is provided in the event
      
      // Get block for timestamp
      const block = await this.provider.getBlock(log.blockNumber);
      const blockTimestamp = block.timestamp;
      
      // Check if this badge already exists
      const existing = await Badge.findOne({ tokenId });
      if (existing) {
        return;
      }
      
      // Create badge record
      const badge = await Badge.create({
        tokenId,
        tier,
        owner: to,
        mintedAt: new Date(blockTimestamp * 1000),
        transactionHash: log.transactionHash
      });
      
      console.log(`Created badge record for token #${tokenId}, tier ${tier}`);
      
      // Update user's highest badge tier if needed
      const user = await User.findOne({ address: to });
      const currentHighestTier = user ? user.highestBadgeTier : -1;
      
      // Only update if the new badge is a higher tier
      if (tier > currentHighestTier) {
        await User.findOneAndUpdate(
          { address: to },
          { $set: { highestBadgeTier: tier } },
          { upsert: true }
        );
        
        // Add record to PointsHistory but don't increment points directly
        const tierPoints = [20, 30, 50, 70, 100]; // Updated badge points values
        const badgePoints = tier >= 0 && tier < tierPoints.length ? tierPoints[tier] : 0;
        
        // Record event in PointsHistory
        await PointsHistory.create({
          address: to,
          points: badgePoints,
          reason: `Badge Tier ${tier} Earned`,
          source: 'achievement',
          timestamp: new Date(blockTimestamp * 1000),
          tierAtEvent: tier
        });
        
        // Recalculate user's total points to ensure consistency
        await PointsService.recalculateSingleUserPoints(to);
        
        console.log(`Updated highest badge tier for ${to} to ${tier}`);
      }
      
      // Send webhook event
      await WebhookService.sendBadgeMintEvent(to, {
        address: to,
        tokenId,
        tier,
        transactionHash: log.transactionHash,
        mintedAt: new Date(blockTimestamp * 1000)
      });
      
    } catch (error) {
      console.error(`Error processing badge mint:`, error);
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