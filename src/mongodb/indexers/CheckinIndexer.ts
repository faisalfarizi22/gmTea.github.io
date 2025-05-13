// src/mongodb/indexers/CheckinIndexer.ts
import { ethers } from 'ethers';
import dbConnect from '../connection';
import SyncStatus from '../models/SyncStatus';
import Checkin from '../models/Checkin';
import User from '../models/User';
import PointsHistory from '../models/PointsHistory';
import WebhookService from '../services/WebhookService';
import GMOnchainABI from '../../abis/GMOnchainABI.json';
import { CONTRACT_ADDRESS, DEPLOY_BLOCK } from '../../utils/constants';
import { getCheckInBoost } from '../../utils/pointCalculation';

export default class CheckinIndexer {
  private provider: ethers.providers.Provider;
  private contract: ethers.Contract;
  private isIndexing: boolean = false;
  private contractAddress: string;
  private chunkSize: number = 2000; // Number of blocks to process in one batch
  private debug: boolean = true; // Set to false in production

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
    this.contractAddress = CONTRACT_ADDRESS;
    this.contract = new ethers.Contract(this.contractAddress, GMOnchainABI, this.provider);
  }

  /**
   * Start indexing checkin events
   */
  async startIndexing(): Promise<void> {
    if (this.isIndexing) {
      console.log('Checkin indexing already in progress');
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

      console.log(`Indexing checkin events from block ${fromBlock} to ${currentBlock}`);

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
      console.error('Error in checkin indexing:', error);
      
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
   * Process a range of blocks for checkin events
   */
  private async processBlockRange(fromBlock: number, toBlock: number): Promise<void> {
    try {
      // Define the checkin event signature
      // This matches the contract event: CheckinCompleted(address indexed user, uint256 timestamp, string message, uint256 count)
      const checkinEventSignature = ethers.utils.id("CheckinCompleted(address,uint256,string,uint256)");
      
      // Get logs for the block range
      const logs = await this.provider.getLogs({
        address: this.contractAddress,
        topics: [checkinEventSignature],
        fromBlock,
        toBlock
      });

      console.log(`Found ${logs.length} checkin events in blocks ${fromBlock}-${toBlock}`);

      // Process logs in batches to avoid overwhelming MongoDB
      const batchSize = 50;
      for (let i = 0; i < logs.length; i += batchSize) {
        const batch = logs.slice(i, i + batchSize);
        const checkinPromises = batch.map(log => this.processCheckinLog(log));
        await Promise.all(checkinPromises);
      }
    } catch (error) {
      console.error(`Error processing block range ${fromBlock}-${toBlock}:`, error);
      
      // If chunk size is larger than 1000, retry with smaller chunks
      if (this.chunkSize > 1000) {
        const smallerChunkSize = Math.floor(this.chunkSize / 5);
        
        for (let smallFromBlock = fromBlock; smallFromBlock <= toBlock; smallFromBlock += smallerChunkSize) {
          const smallToBlock = Math.min(toBlock, smallFromBlock + smallerChunkSize - 1);
          await this.processBlockRange(smallFromBlock, smallToBlock);
        }
      }
    }
  }

  /**
   * Helper function to safely convert BigNumber to number
   */
  private safeToNumber(value: any, defaultValue: number = 0): number {
    if (!value) return defaultValue;
    
    try {
      // If it's a BigNumber (has toNumber method)
      if (typeof value.toNumber === 'function') {
        return value.toNumber();
      }
      
      // If it's already a number
      if (typeof value === 'number') {
        return value;
      }
      
      // Try to parse as number
      return parseInt(String(value), 10) || defaultValue;
    } catch (error) {
      console.warn('Error converting to number:', error);
      return defaultValue;
    }
  }
  
  /**
   * Debug log for event structure
   */
  private logEventStructure(log: ethers.providers.Log, parsedLog: any): void {
    if (!this.debug) return;
    
    console.log('\n--- EVENT DEBUG INFO ---');
    console.log('Transaction Hash:', log.transactionHash);
    console.log('Topics:', log.topics);
    
    if (parsedLog && parsedLog.args) {
      console.log('Parsed args:');
      for (const key in parsedLog.args) {
        if (isNaN(parseInt(key, 10))) { // Skip numeric keys (duplicates)
          const value = parsedLog.args[key];
          const type = typeof value;
          console.log(`- ${key}: ${value} (${type})`);
          
          // Show more details if it's a complex object
          if (type === 'object' && value !== null) {
            console.log(`  Details: ${JSON.stringify(value)}`);
          }
        }
      }
    }
    console.log('--- END DEBUG INFO ---\n');
  }

  /**
   * Process a single checkin log
   */
  private async processCheckinLog(log: ethers.providers.Log): Promise<void> {
    try {
      // Parse the log with the contract interface
      const parsedLog = this.contract.interface.parseLog(log);
      
      // Debug - log the event structure
      if (this.debug) {
        this.logEventStructure(log, parsedLog);
      }
      
      // Extract data from the log
      // Based on event: CheckinCompleted(address indexed user, uint256 timestamp, string message, uint256 count)
      const userAddress = parsedLog.args.user?.toLowerCase();
      const eventTimestamp = this.safeToNumber(parsedLog.args.timestamp);
      const message = parsedLog.args.message || '';
      const checkinNumber = this.safeToNumber(parsedLog.args.count);
      
      if (!userAddress) {
        console.warn(`Missing user address in checkin log: ${log.transactionHash}`);
        return;
      }
      
      // Get block for additional data
      const block = await this.provider.getBlock(log.blockNumber);
      const blockTimestamp = block.timestamp;
      
      // Use event timestamp if available, otherwise fall back to block timestamp
      const timestamp = eventTimestamp > 0 ? eventTimestamp : blockTimestamp;
      
      // Check if this checkin already exists in the database
      const existingCheckin = await Checkin.findOne({ 
        transactionHash: log.transactionHash 
      });
      
      if (existingCheckin) {
        // Skip if already processed
        return;
      }
      
      // Get user data to determine the boost factor
      const user = await User.findOne({ address: userAddress });
      const tier = user ? user.get('highestBadgeTier') : -1;
      
      // Calculate boost based on tier using the utility function
      const boost = getCheckInBoost(tier);
      
      // Calculate final points with boost
      const basePoints = 10;
      const points = Math.floor(basePoints * boost);
      
      // Create checkin record
      const checkin = await Checkin.create({
        address: userAddress,
        checkinNumber,
        blockNumber: log.blockNumber,
        blockTimestamp: new Date(timestamp * 1000),
        transactionHash: log.transactionHash,
        points,
        boost,
        message, // Save the message too
        tierAtCheckin: tier // Save the tier at the time of checkin
      });
      
      console.log(`Created checkin record for ${userAddress}, checkin #${checkinNumber}`);
      
      // Add points to user
      await User.findOneAndUpdate(
        { address: userAddress },
        { 
          $inc: { checkinCount: 1, points },
          $set: { lastCheckin: new Date(timestamp * 1000) }
        },
        { upsert: true }
      );
      
      // Record points history
      await PointsHistory.create({
        address: userAddress,
        points,
        reason: `Check-in #${checkinNumber}`,
        source: 'checkin',
        timestamp: new Date(timestamp * 1000),
        tierAtEvent: tier // Store the tier at time of event
      });
      
      // Send webhook event
      await WebhookService.sendCheckinEvent(userAddress, {
        address: userAddress,
        checkinNumber,
        blockTimestamp: new Date(timestamp * 1000),
        points,
        transactionHash: log.transactionHash,
        message,
        tierAtCheckin: tier // Include tier info
      });
      
    } catch (error) {
      console.error(`Error processing checkin log:`, error);
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
    await Checkin.deleteMany({ address: { $exists: true } });
    await PointsHistory.deleteMany({ source: 'checkin' });
    
    // Start indexing
    await this.startIndexing();
  }
}