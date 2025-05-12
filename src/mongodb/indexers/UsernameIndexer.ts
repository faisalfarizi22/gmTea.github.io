// src/mongodb/indexers/UsernameIndexer.ts
import { ethers } from 'ethers';
import dbConnect from '../connection';
import SyncStatus from '../models/SyncStatus';
import User from '../models/User';
import WebhookService from '../services/WebhookService';
import { USERNAME_REGISTRY_ADDRESS, DEPLOY_BLOCK } from '../../utils/constants';
import GMTeaUsernameABI from '../../abis/GMTeaUsernameABI.json';
import { docVal } from '../utils/documentHelper';

export default class UsernameIndexer {
  private provider: ethers.providers.Provider;
  private contract: ethers.Contract;
  private isIndexing: boolean = false;
  private contractAddress: string;
  private chunkSize: number = 2000; // Number of blocks to process in one batch

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
    this.contractAddress = USERNAME_REGISTRY_ADDRESS;
    this.contract = new ethers.Contract(this.contractAddress, GMTeaUsernameABI, this.provider);
  }

  /**
   * Start indexing username events
   */
  async startIndexing(): Promise<void> {
    if (this.isIndexing) {
      console.log('Username indexing already in progress');
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

      console.log(`Indexing username events from block ${fromBlock} to ${currentBlock}`);

      // Process registration events
      await this.processRegistrationEvents(fromBlock, currentBlock);
      
      // Process username change events
      await this.processUsernameChangeEvents(fromBlock, currentBlock);

      // Mark sync as complete
      await SyncStatus.updateOne(
        { contractAddress: this.contractAddress },
        { isCurrentlySyncing: false, lastSyncTimestamp: new Date() }
      );

    } catch (error) {
      console.error('Error in username indexing:', error);
      
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
   * Process username registration events
   */
  private async processRegistrationEvents(fromBlock: number, toBlock: number): Promise<void> {
    try {
      // Define the username registration event signature from the contract:
      // event UsernameRegistered(address indexed user, string username);
      const usernameRegistrationEventSignature = ethers.utils.id("UsernameRegistered(address,string)");
      
      // Process blocks in chunks to avoid memory issues
      for (let startBlock = fromBlock; startBlock <= toBlock; startBlock += this.chunkSize) {
        const endBlock = Math.min(toBlock, startBlock + this.chunkSize - 1);
        
        // Get logs for the block range
        const logs = await this.provider.getLogs({
          address: this.contractAddress,
          topics: [usernameRegistrationEventSignature],
          fromBlock: startBlock,
          toBlock: endBlock
        });

        console.log(`Found ${logs.length} username registration events in blocks ${startBlock}-${endBlock}`);

        // Process logs in batches to avoid overwhelming MongoDB
        const batchSize = 50;
        for (let i = 0; i < logs.length; i += batchSize) {
          const batch = logs.slice(i, i + batchSize);
          const usernamePromises = batch.map(log => this.processUsernameLog(log, "register"));
          await Promise.all(usernamePromises);
        }
        
        // Update the sync status after each chunk
        await SyncStatus.updateOne(
          { contractAddress: this.contractAddress },
          { lastProcessedBlock: endBlock, lastSyncTimestamp: new Date() }
        );
      }
    } catch (error) {
      console.error(`Error processing registration events from ${fromBlock} to ${toBlock}:`, error);
    }
  }

  /**
   * Process username change events
   */
  private async processUsernameChangeEvents(fromBlock: number, toBlock: number): Promise<void> {
    try {
      // Define the username change event signature from the contract:
      // event UsernameChanged(address indexed user, string oldUsername, string newUsername);
      const usernameChangeEventSignature = ethers.utils.id("UsernameChanged(address,string,string)");
      
      // Process blocks in chunks to avoid memory issues
      for (let startBlock = fromBlock; startBlock <= toBlock; startBlock += this.chunkSize) {
        const endBlock = Math.min(toBlock, startBlock + this.chunkSize - 1);
        
        // Get logs for the block range
        const logs = await this.provider.getLogs({
          address: this.contractAddress,
          topics: [usernameChangeEventSignature],
          fromBlock: startBlock,
          toBlock: endBlock
        });

        console.log(`Found ${logs.length} username change events in blocks ${startBlock}-${endBlock}`);

        // Process logs in batches to avoid overwhelming MongoDB
        const batchSize = 50;
        for (let i = 0; i < logs.length; i += batchSize) {
          const batch = logs.slice(i, i + batchSize);
          const usernamePromises = batch.map(log => this.processUsernameLog(log, "change"));
          await Promise.all(usernamePromises);
        }
      }
    } catch (error) {
      console.error(`Error processing username change events from ${fromBlock} to ${toBlock}:`, error);
    }
  }

  /**
   * Process a single username log
   */
  private async processUsernameLog(log: ethers.providers.Log, type: "register" | "change"): Promise<void> {
    try {
      // Parse the log with the contract interface
      const parsedLog = this.contract.interface.parseLog(log);
      
      // Extract data from the log
      const address = parsedLog.args.user.toLowerCase();
      
      let username: string;
      let oldUsername: string | null = null;
      
      if (type === "register") {
        username = parsedLog.args.username.toLowerCase();
      } else { // change
        oldUsername = parsedLog.args.oldUsername.toLowerCase();
        username = parsedLog.args.newUsername.toLowerCase();
      }
      
      // Get block timestamp
      const block = await this.provider.getBlock(log.blockNumber);
      const timestamp = block.timestamp;
      
      // Update user's username in the database
      const updateResult = await User.findOneAndUpdate(
        { address },
        { 
          $set: { 
            username,
            updatedAt: new Date(timestamp * 1000)
          } 
        },
        { upsert: true, new: true }
      );
      
      // Send webhook event
      const webhookData = {
        address,
        username,
        oldUsername,
        timestamp: new Date(timestamp * 1000),
        transactionHash: log.transactionHash,
        eventType: type
      };
      
      await WebhookService.sendUsernameEvent(address, webhookData);
      
    } catch (error) {
      console.error(`Error processing username log:`, error);
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
    
    // Clear existing usernames (but don't delete the users)
    await User.updateMany(
      { username: { $exists: true } },
      { $unset: { username: "" } }
    );
    
    // Start indexing
    await this.startIndexing();
  }
  
  /**
   * Sync current username data from blockchain
   * This is a direct method that doesn't rely on event logs
   */
  async syncActiveUsernames(): Promise<void> {
    try {
      await dbConnect();
      
      // Get all users from the database
      const users = await User.find();
      
      console.log(`Syncing usernames for ${users.length} users`);
      
      // Process in batches
      const batchSize = 50;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (user) => {
          try {
            // Get username from contract
            const username = await this.contract.getUsernameByAddress(docVal(user, 'address', ''));
            
            if (username && username !== "") {
              // Update username if it exists
              await User.updateOne(
                { address: docVal(user, 'address', '') },
                { $set: { username: username.toLowerCase() } }
              );
              
              console.log(`Updated username for ${docVal(user, 'address', '')}: ${username}`);
            }
          } catch (error) {
            console.error(`Error syncing username for ${docVal(user, 'address', '')}:`, error);
          }
        }));
      }
      
      console.log('Username sync completed');
    } catch (error) {
      console.error('Error in syncActiveUsernames:', error);
    }
  }
}