// src/mongodb/indexers/index.ts
import { ethers } from 'ethers';
import CheckinIndexer from './CheckinIndexer';
import BadgeIndexer from './BadgeIndexer';
import ReferralIndexer from './ReferralIndexer';
import UsernameIndexer from './UsernameIndexer';
import RewardIndexer from './RewardIndexer';
import { TEA_SEPOLIA_RPC_URL } from '../../utils/constants';
import dbConnect from '../connection';
import User from '../models/User';
import { docVal } from '../utils/documentHelper';

class IndexerController {
  private provider: ethers.providers.JsonRpcProvider;
  private checkinIndexer: CheckinIndexer;
  private badgeIndexer: BadgeIndexer;
  private referralIndexer: ReferralIndexer;
  private usernameIndexer: UsernameIndexer;
  private rewardIndexer: RewardIndexer;
  private isRunning: boolean = false;
  private indexInterval: NodeJS.Timeout | null = null;
  private indexFrequency: number = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor() {
    // Create provider
    this.provider = new ethers.providers.JsonRpcProvider(TEA_SEPOLIA_RPC_URL);
    
    // Create indexers
    this.checkinIndexer = new CheckinIndexer(this.provider);
    this.badgeIndexer = new BadgeIndexer(this.provider);
    this.referralIndexer = new ReferralIndexer(this.provider);
    this.usernameIndexer = new UsernameIndexer(this.provider);
    this.rewardIndexer = new RewardIndexer(this.provider);
  }

  /**
   * Start all indexers on a schedule
   */
  startIndexing(): void {
    if (this.isRunning) {
      console.log('Indexing already running');
      return;
    }

    this.isRunning = true;
    
    // Run indexing immediately
    this.runIndexing();

    // Schedule regular indexing
    this.indexInterval = setInterval(() => {
      this.runIndexing();
    }, this.indexFrequency);

    console.log('Indexing started - will run every', this.indexFrequency / 60000, 'minutes');
  }

  /**
   * Stop scheduled indexing
   */
  stopIndexing(): void {
    if (this.indexInterval) {
      clearInterval(this.indexInterval);
      this.indexInterval = null;
    }
    this.isRunning = false;
    console.log('Indexing stopped');
  }

  /**
   * Run a single indexing cycle for all indexers
   */
  private async runIndexing(): Promise<void> {
    console.log('Starting indexing cycle at', new Date().toISOString());

    try {
      // Run indexers sequentially to avoid overwhelming the RPC
      await this.checkinIndexer.startIndexing();
      await this.badgeIndexer.startIndexing();
      await this.referralIndexer.startIndexing();
      await this.usernameIndexer.startIndexing();
      await this.rewardIndexer.startIndexing();
      
      console.log('Indexing cycle completed at', new Date().toISOString());
    } catch (error) {
      console.error('Error in indexing cycle:', error);
    }
  }

  /**
   * Reindex all data (clear and rebuild)
   */
  async reindexAll(): Promise<void> {
    // Stop scheduled indexing
    this.stopIndexing();
    
    console.log('Starting complete reindexing at', new Date().toISOString());
    
    try {
      // Reindex all collections
      await this.checkinIndexer.reindexAll();
      await this.badgeIndexer.reindexAll();
      await this.referralIndexer.reindexAll();
      await this.usernameIndexer.reindexAll();
      await this.rewardIndexer.reindexAll();
      
      console.log('Complete reindexing finished at', new Date().toISOString());
    } catch (error) {
      console.error('Error during complete reindexing:', error);
    }
    
    // Restart scheduled indexing
    this.startIndexing();
  }

  /**
   * Set indexing frequency
   */
  setIndexFrequency(minutes: number): void {
    this.indexFrequency = minutes * 60 * 1000;
    
    // Restart with new frequency if running
    if (this.isRunning) {
      this.stopIndexing();
      this.startIndexing();
    }
    
    console.log('Indexing frequency set to', minutes, 'minutes');
  }

  /**
   * Manually sync rewards for a specific address
   */
  async syncAddressRewards(address: string): Promise<void> {
    console.log(`Manually syncing rewards for ${address}`);
    
    try {
      await dbConnect();
      
      // Normalize address
      const normalizedAddress = address.toLowerCase();
      console.log(`Working with normalized address: ${normalizedAddress}`);
      
      // Check if user exists
      const user = await User.findOne({ address: normalizedAddress });
      
      if (!user) {
        console.log(`User ${normalizedAddress} not found in database, creating record`);
        await User.create({
          address: normalizedAddress,
          highestBadgeTier: -1,
          points: 0,
          createdAt: new Date()
        });
      } else {
        // Badge tier check
        const highestTier = docVal(user, 'highestBadgeTier', -1);
        console.log(`User ${normalizedAddress} highest badge tier: ${highestTier}`);
      }
      
      // Use the existing reward indexer method
      await this.rewardIndexer.syncAddressRewards(normalizedAddress);
      
      console.log(`Reward sync complete for ${normalizedAddress}`);
    } catch (error) {
      console.error(`Error syncing rewards for ${address}:`, error);
      throw error;
    }
  }
  
  /**
   * Fix badge referrer data issues
   */
  async fixBadgeReferrers(): Promise<{ fixed: number, total: number }> {
    console.log('Running badge referrer fix utility');
    
    try {
      await dbConnect();
      
      // We'll use BadgeService for the fix operation
      const BadgeService = require('../services/BadgeService').default;
      return await BadgeService.fixBadgeReferrers();
    } catch (error) {
      console.error('Error fixing badge referrers:', error);
      throw error;
    }
  }
}

// Create singleton instance
const indexerController = new IndexerController();

export default indexerController;