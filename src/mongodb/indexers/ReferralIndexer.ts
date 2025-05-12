// src/mongodb/indexers/ReferralIndexer.ts
import { ethers } from 'ethers';
import dbConnect from '../connection';
import SyncStatus from '../models/SyncStatus';
import Referral from '../models/Referral';
import ReferralService from '../services/ReferralService';
import { REFERRAL_CONTRACT_ADDRESS, DEPLOY_BLOCK } from '../../utils/constants';
import GMTeaReferralABI from '../../abis/GMTeaReferralABI.json';

export default class ReferralIndexer {
  private provider: ethers.providers.Provider;
  private contract: ethers.Contract;
  private isIndexing: boolean = false;
  private contractAddress: string;
  private chunkSize: number = 2000; // Number of blocks to process in one batch

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
    this.contractAddress = REFERRAL_CONTRACT_ADDRESS;
    this.contract = new ethers.Contract(this.contractAddress, GMTeaReferralABI, this.provider);
  }

  /**
   * Start indexing referral events
   */
  async startIndexing(): Promise<void> {
    if (this.isIndexing) {
      console.log('Referral indexing already in progress');
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

      console.log(`Indexing referral events from block ${fromBlock} to ${currentBlock}`);

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

      // Also process reward claimed events
      await this.processRewardClaimEvents(fromBlock, currentBlock);
      
      // Also process reward added events
      await this.processRewardAddedEvents(fromBlock, currentBlock);

      // Mark sync as complete
      await SyncStatus.updateOne(
        { contractAddress: this.contractAddress },
        { isCurrentlySyncing: false, lastSyncTimestamp: new Date() }
      );

    } catch (error) {
      console.error('Error in referral indexing:', error);
      
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
   * Process a range of blocks for referral events
   */
  private async processBlockRange(fromBlock: number, toBlock: number): Promise<void> {
    try {
      // Define the referral recorded event signature based on the contract's event:
      // event ReferralRecorded(address indexed referrer, address indexed referee);
      const referralEventSignature = ethers.utils.id("ReferralRecorded(address,address)");
      
      // Get logs for the block range
      const logs = await this.provider.getLogs({
        address: this.contractAddress,
        topics: [referralEventSignature],
        fromBlock,
        toBlock
      });

      console.log(`Found ${logs.length} referral events in blocks ${fromBlock}-${toBlock}`);

      // Process logs in batches to avoid overwhelming MongoDB
      const batchSize = 50;
      for (let i = 0; i < logs.length; i += batchSize) {
        const batch = logs.slice(i, i + batchSize);
        const referralPromises = batch.map(log => this.processReferralLog(log));
        await Promise.all(referralPromises);
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
   * Process a single referral log
   */
  private async processReferralLog(log: ethers.providers.Log): Promise<void> {
    try {
      // Parse the log with the contract interface
      const parsedLog = this.contract.interface.parseLog(log);
      
      // Extract data from the log based on ReferralRecorded(address indexed referrer, address indexed referee)
      const referrer = parsedLog.args.referrer.toLowerCase();
      const referee = parsedLog.args.referee.toLowerCase();
      
      // Get block timestamp
      const block = await this.provider.getBlock(log.blockNumber);
      const timestamp = block.timestamp;
      
      // Check if this referral already exists in the database
      const existingReferral = await Referral.findOne({ 
        referee
      });
      
      if (existingReferral) {
        // Skip if already processed
        return;
      }
      
      // Save the referral
      await ReferralService.saveReferral({
        referrer,
        referee,
        transactionHash: log.transactionHash,
        timestamp: new Date(timestamp * 1000)
      });
      
    } catch (error) {
      console.error(`Error processing referral log:`, error);
    }
  }

  /**
   * Process reward claim events
   */
  private async processRewardClaimEvents(fromBlock: number, toBlock: number): Promise<void> {
    try {
      // Define the reward claimed event signature based on the contract's event:
      // event RewardClaimed(address indexed user, uint256 amount);
      const rewardClaimedEventSignature = ethers.utils.id("RewardClaimed(address,uint256)");
      
      // Get logs for the block range
      const logs = await this.provider.getLogs({
        address: this.contractAddress,
        topics: [rewardClaimedEventSignature],
        fromBlock,
        toBlock
      });

      console.log(`Found ${logs.length} reward claim events in blocks ${fromBlock}-${toBlock}`);

      // Process logs in batches
      const batchSize = 50;
      for (let i = 0; i < logs.length; i += batchSize) {
        const batch = logs.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (log) => {
          try {
            // Parse the log
            const parsedLog = this.contract.interface.parseLog(log);
            
            // Extract data
            const claimer = parsedLog.args.user.toLowerCase();
            const amount = parsedLog.args.amount.toString();
            
            // Get block timestamp
            const block = await this.provider.getBlock(log.blockNumber);
            const timestamp = block.timestamp;
            
            // Mark rewards as claimed
            await ReferralService.markReferralRewardsClaimed(
              claimer,
              ethers.utils.formatEther(amount),
              log.transactionHash,
              new Date(timestamp * 1000)
            );
          } catch (error) {
            console.error(`Error processing reward claim:`, error);
          }
        }));
      }
    } catch (error) {
      console.error(`Error processing reward claims for blocks ${fromBlock}-${toBlock}:`, error);
    }
  }

  /**
   * Process reward added events
   */
  private async processRewardAddedEvents(fromBlock: number, toBlock: number): Promise<void> {
    try {
      // Define the reward added event signature based on the contract's event:
      // event RewardAdded(address indexed referrer, uint256 amount, IGMTeaBadge.BadgeTier tier);
      const rewardAddedEventSignature = ethers.utils.id("RewardAdded(address,uint256,uint8)");
      
      // Get logs for the block range
      const logs = await this.provider.getLogs({
        address: this.contractAddress,
        topics: [rewardAddedEventSignature],
        fromBlock,
        toBlock
      });

      console.log(`Found ${logs.length} reward added events in blocks ${fromBlock}-${toBlock}`);

      // Process logs in batches
      const batchSize = 50;
      for (let i = 0; i < logs.length; i += batchSize) {
        const batch = logs.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (log) => {
          try {
            // Parse the log
            const parsedLog = this.contract.interface.parseLog(log);
            
            // Extract data
            const referrer = parsedLog.args.referrer.toLowerCase();
            const amount = parsedLog.args.amount.toString();
            const tier = parsedLog.args.tier;
            
            // Get block timestamp
            const block = await this.provider.getBlock(log.blockNumber);
            const timestamp = block.timestamp;
            
            // Update referral reward amount
            await ReferralService.updateReferralRewardAmount(
              referrer,
              ethers.utils.formatEther(amount),
              tier,
              new Date(timestamp * 1000)
            );
          } catch (error) {
            console.error(`Error processing reward added:`, error);
          }
        }));
      }
    } catch (error) {
      console.error(`Error processing reward added events for blocks ${fromBlock}-${toBlock}:`, error);
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
    await Referral.deleteMany({});
    
    // Start indexing
    await this.startIndexing();
  }
}