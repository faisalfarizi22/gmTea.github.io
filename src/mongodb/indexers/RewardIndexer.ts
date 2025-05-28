// src/mongodb/indexers/RewardIndexer.ts
import { ethers } from 'ethers';
import dbConnect from '../connection';
import SyncStatus from '../models/SyncStatus';
import Reward from '../models/Reward';
import BadgeService from '../services/BadgeService';
import { REFERRAL_CONTRACT_ADDRESS, DEPLOY_BLOCK } from '../../utils/constants';
import GMTeaReferralABI from '../../abis/GMTeaReferralABI.json';

export default class RewardIndexer {
  private provider: ethers.providers.Provider;
  private contract: ethers.Contract;
  private isIndexing: boolean = false;
  private contractAddress: string;
  private chunkSize: number = 2000; // Number of blocks to process in one batch

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
    
    // Ensure we're using the correct referral contract address
    if (!REFERRAL_CONTRACT_ADDRESS || REFERRAL_CONTRACT_ADDRESS === ethers.constants.AddressZero) {
      throw new Error('Invalid REFERRAL_CONTRACT_ADDRESS in constants: ' + REFERRAL_CONTRACT_ADDRESS);
    }
    
    this.contractAddress = REFERRAL_CONTRACT_ADDRESS;
    console.log(`Initializing RewardIndexer with contract address: ${this.contractAddress}`);
    
    this.contract = new ethers.Contract(this.contractAddress, GMTeaReferralABI, this.provider);
  }

  /**
   * Start indexing reward events
   */
  async startIndexing(): Promise<void> {
    if (this.isIndexing) {
      console.log('Reward indexing already in progress');
      return;
    }

    try {
      this.isIndexing = true;
      await dbConnect();
      
      console.log(`Starting reward indexing for contract: ${this.contractAddress}`);
      
      // Verify the contract address is valid
      if (this.contractAddress === ethers.constants.AddressZero) {
        console.error('Cannot index rewards: Contract address is zero address');
        return;
      }

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
        
        console.log(`Created new sync status for reward indexing, starting from block ${DEPLOY_BLOCK}`);
      } else {
        // Update sync status
        await SyncStatus.updateOne(
          { contractAddress: this.contractAddress },
          { isCurrentlySyncing: true, lastSyncTimestamp: new Date() }
        );
        
        console.log(`Resuming reward indexing from block ${syncStatus.lastProcessedBlock}`);
      }

      const fromBlock = syncStatus.lastProcessedBlock + 1;
      const currentBlock = await this.provider.getBlockNumber();

      console.log(`Processing reward events from block ${fromBlock} to ${currentBlock}`);

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
      
      console.log(`Reward indexing completed up to block ${currentBlock}`);

    } catch (error) {
      console.error('Error in reward indexing:', error);
      
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
   * Process a range of blocks for reward events
   */
  private async processBlockRange(fromBlock: number, toBlock: number): Promise<void> {
    try {
      console.log(`Processing reward events in blocks ${fromBlock}-${toBlock}`);
      
      // Try multiple possible event signatures for RewardClaimed event
      const rewardEventSignatures = [
        ethers.utils.id("RewardClaimed(address,uint256)"),
        ethers.utils.id("ReferralRewardClaimed(address,uint256)"),
        ethers.utils.id("RewardSent(address,uint256)"),
        ethers.utils.id("RewardAdded(address,uint256)"), // Added potential event
        ethers.utils.id("ReferralReward(address,uint256)") // Added potential event
      ];
      
      let allLogs: ethers.providers.Log[] = [];
      
      // Try to fetch logs with different signatures
      for (const signature of rewardEventSignatures) {
        try {
          console.log(`Searching for events with signature: ${signature}`);
          const logs = await this.provider.getLogs({
            address: this.contractAddress,
            topics: [signature],
            fromBlock,
            toBlock
          });
          
          if (logs.length > 0) {
            console.log(`Found ${logs.length} reward events with signature ${signature}`);
            allLogs = [...allLogs, ...logs];
          }
        } catch (error) {
          console.error(`Error fetching logs with signature ${signature}:`, error);
        }
      }
      
      // Try common event names directly from the contract interface
      try {
        const eventFilter = {
          address: this.contractAddress,
          fromBlock,
          toBlock
        };
        
        // Try to find RewardAdded events
        const rewardAddedFilter = this.contract.filters.RewardAdded ? 
          this.contract.filters.RewardAdded() : null;
          
        if (rewardAddedFilter) {
          const rewardAddedLogs = await this.provider.getLogs({
            ...eventFilter,
            topics: rewardAddedFilter.topics
          });
          console.log(`Found ${rewardAddedLogs.length} RewardAdded events`);
          allLogs = [...allLogs, ...rewardAddedLogs];
        }
        
        // Try to find RewardClaimed events
        const rewardClaimedFilter = this.contract.filters.RewardClaimed ? 
          this.contract.filters.RewardClaimed() : null;
          
        if (rewardClaimedFilter) {
          const rewardClaimedLogs = await this.provider.getLogs({
            ...eventFilter,
            topics: rewardClaimedFilter.topics
          });
          console.log(`Found ${rewardClaimedLogs.length} RewardClaimed events`);
          allLogs = [...allLogs, ...rewardClaimedLogs];
        }
      } catch (error) {
        console.error('Error using contract filters:', error);
      }
      
      // If no events found with specific signatures, try a generic approach
      if (allLogs.length === 0) {
        console.log('No events found with specific signatures, trying generic approach');
        
        // Get the contract code to check if it exists
        const code = await this.provider.getCode(this.contractAddress);
        if (code === '0x') {
          console.error(`Contract at ${this.contractAddress} does not exist or has no code`);
          return;
        }
        
        const logs = await this.provider.getLogs({
          address: this.contractAddress,
          fromBlock,
          toBlock
        });
        
        console.log(`Found ${logs.length} total events from contract`);
        
        // Filter logs that might be reward events
        allLogs = logs.filter(log => {
          try {
            const parsedLog = this.contract.interface.parseLog(log);
            return parsedLog && (
              parsedLog.name.includes('Reward') || 
              parsedLog.name.includes('Referral')
            );
          } catch (error) {
            return false;
          }
        });
        
        console.log(`Found ${allLogs.length} potential reward events with generic approach`);
      }

      // Process logs in batches to avoid overwhelming MongoDB
      const batchSize = 50;
      for (let i = 0; i < allLogs.length; i += batchSize) {
        const batch = allLogs.slice(i, i + batchSize);
        const rewardPromises = batch.map(log => this.processRewardLog(log));
        await Promise.all(rewardPromises);
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
   * Process a single reward log
   */
  private async processRewardLog(log: ethers.providers.Log): Promise<void> {
    try {
      console.log(`Processing reward log: ${log.transactionHash} - ${log.logIndex}`);
      
      // Try to parse the log
      let parsedLog;
      try {
        parsedLog = this.contract.interface.parseLog(log);
      } catch (error) {
        console.error(`Failed to parse log ${log.transactionHash}:`, error);
        return;
      }
      
      // Debug the event data
      console.log(`Event: ${parsedLog.name}, Data:`, parsedLog.args);
      
      // Extract data from the log safely
      let referrer: string;
      let amount: number;
      
      // Handle different argument structures
      if (parsedLog.args.referrer) {
        referrer = parsedLog.args.referrer.toLowerCase();
      } else if (parsedLog.args.user) {
        referrer = parsedLog.args.user.toLowerCase();
      } else if (parsedLog.args[0]) {
        referrer = parsedLog.args[0].toLowerCase();
      } else {
        console.error('Could not extract referrer from event:', parsedLog);
        return;
      }
      
      if (parsedLog.args.amount) {
        amount = typeof parsedLog.args.amount.toNumber === 'function'
          ? parsedLog.args.amount.toNumber()
          : Number(parsedLog.args.amount);
      } else if (parsedLog.args.reward) {
        amount = typeof parsedLog.args.reward.toNumber === 'function'
          ? parsedLog.args.reward.toNumber()
          : Number(parsedLog.args.reward);
      } else if (parsedLog.args[1]) {
        amount = typeof parsedLog.args[1].toNumber === 'function'
          ? parsedLog.args[1].toNumber()
          : Number(parsedLog.args[1]);
      } else {
        console.error('Could not extract amount from event:', parsedLog);
        return;
      }
      
      // Convert amount from Wei to Ether if needed
      if (amount > 1e9) {
        const etherAmount = Number(ethers.utils.formatEther(amount.toString()));
        amount = etherAmount;
      }
      
      console.log(`Extracted reward data - Referrer: ${referrer}, Amount: ${amount}`);
      
      // Validate referrer address
      if (!ethers.utils.isAddress(referrer)) {
        console.error(`Invalid referrer address: ${referrer}`);
        return;
      }
      
      // Check if this reward already exists in the database
      const existingReward = await Reward.findOne({ 
        transactionHash: log.transactionHash,
        logIndex: log.logIndex
      });
      
      if (existingReward) {
        console.log(`Reward already indexed: ${log.transactionHash}-${log.logIndex}`);
        return;
      }
      
      // Get block timestamp
      const block = await this.provider.getBlock(log.blockNumber);
      const timestamp = block.timestamp;
      
      console.log(`Saving new reward for ${referrer}`);
      
      // Important: Find badges referred by this user to confirm relationship
      const referredBadges = await BadgeService.getBadgesByReferrer(referrer);
      console.log(`Found ${referredBadges.length} badges referred by ${referrer}`);
      
      // Save the reward
      const reward = await Reward.create({
        referrer: referrer,
        amount: amount,
        claimedAt: new Date(timestamp * 1000),
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
        blockNumber: log.blockNumber,
        relatedBadges: referredBadges.map(badge => badge.tokenId)
      });
      
      console.log(`Successfully saved reward: ${reward._id}`);
      
    } catch (error) {
      console.error(`Error processing reward log:`, error);
    }
  }

  /**
   * Sync rewards for a specific address
   */
  async syncAddressRewards(address: string): Promise<void> {
    console.log(`Syncing rewards for address: ${address}`);
    
    try {
      await dbConnect();
      
      // Normalize address
      const normalizedAddress = address.toLowerCase();
      
      // Find badges referred by this user
      const referredBadges = await BadgeService.getBadgesByReferrer(normalizedAddress);
      console.log(`Found ${referredBadges.length} badges referred by ${normalizedAddress}`);
      
      if (referredBadges.length === 0) {
        console.log(`No referred badges found for ${normalizedAddress}, skipping reward sync`);
        return;
      }
      
      // Find existing rewards for this address
      const existingRewards = await Reward.find({ referrer: normalizedAddress });
      console.log(`Found ${existingRewards.length} existing rewards for ${normalizedAddress}`);
      
      // Example implementation of reward syncing
      // This would need to be customized based on your contract and reward system
      // For now, we'll just ensure all referred badges are recorded in the rewards
      
      let updatedCount = 0;
      
      // Update related badges for each reward
      for (const reward of existingRewards) {
        const badgeIds = referredBadges.map(badge => badge.tokenId);
        
        // Check if we need to update this reward's related badges
        const needsUpdate = !reward.relatedBadges || 
                           reward.relatedBadges.length !== badgeIds.length || 
                           !reward.relatedBadges.every(id => badgeIds.includes(id));
        
        if (needsUpdate) {
          await Reward.updateOne(
            { _id: reward._id },
            { $set: { relatedBadges: badgeIds } }
          );
          updatedCount++;
        }
      }
      
      console.log(`Updated ${updatedCount} rewards for ${normalizedAddress}`);
      
    } catch (error) {
      console.error(`Error syncing rewards for ${address}:`, error);
      throw error;
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
    await Reward.deleteMany({});
    
    // Start indexing
    await this.startIndexing();
  }
}