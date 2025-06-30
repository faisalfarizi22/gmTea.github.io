import dbConnect from '../connection';
import Badge from '../models/Badge';
import User from '../models/User';
import PointsHistory from '../models/PointsHistory';
import WebhookService from './WebhookService';
import PointsService from './PointsService';
import { docVal } from '../utils/documentHelper';
import { calculateBadgePoints } from '../../utils/pointCalculation';

export default class BadgeService {
 
  static async getUserBadges(address: string) {
    await dbConnect();
    
    const normalizedAddress = address.toLowerCase();
    console.log(`Getting badges for user: ${normalizedAddress}`);
    
    const badges = await Badge.find({ owner: normalizedAddress })
      .sort({ tier: 1 }); 
      
    console.log(`Found ${badges.length} badges for user ${normalizedAddress}`);
    return badges;
  }

  static async getUserHighestTier(address: string): Promise<number> {
    await dbConnect();
    
    const normalizedAddress = address.toLowerCase();
    
    const highestBadge = await Badge.findOne({ owner: normalizedAddress })
      .sort({ tier: -1 }) 
      .limit(1);
    
    const highestTier = highestBadge ? highestBadge.tier : -1;
    console.log(`Highest tier for user ${normalizedAddress}: ${highestTier}`);
    
    return highestTier;
  }

  static async getBadgesByReferrer(referrerAddress: string) {
    await dbConnect();
    
    const normalizedAddress = referrerAddress.toLowerCase();
    console.log(`Getting badges referred by: ${normalizedAddress}`);
    
    const badges = await Badge.find({ referrer: normalizedAddress });
    console.log(`Found ${badges.length} badges referred by ${normalizedAddress}`);
    
    return badges;
  }

  static async saveBadgeMint(badgeData: {
    tokenId: number;
    owner: string;
    tier: number;
    mintedAt: Date;
    transactionHash: string;
    referrer?: string | null;
  }) {
    await dbConnect();
    
    const owner = badgeData.owner.toLowerCase();
    const referrer = badgeData.referrer ? badgeData.referrer.toLowerCase() : null;
    
    console.log(`Saving badge mint - TokenId: ${badgeData.tokenId}, Owner: ${owner}, Tier: ${badgeData.tier}, Referrer: ${referrer}`);
    
    const existing = await Badge.findOne({ 
      tokenId: badgeData.tokenId 
    });
    
    if (existing) {
      console.log(`Badge ${badgeData.tokenId} already exists in database`);
      
      if (!existing.referrer && referrer) {
        console.log(`Updating referrer for existing badge ${badgeData.tokenId} to ${referrer}`);
        
        await Badge.updateOne(
          { tokenId: badgeData.tokenId },
          { $set: { referrer: referrer } }
        );
      }
      
      return existing;
    }
    
    console.log(`Creating new badge record for tokenId ${badgeData.tokenId}`);
    
    try {
      const badge = await Badge.create({
        tokenId: badgeData.tokenId,
        owner: owner,
        tier: badgeData.tier,
        mintedAt: badgeData.mintedAt,
        transactionHash: badgeData.transactionHash,
        referrer: referrer
      });
      
      console.log(`Badge created successfully: ${badge._id}`);
      
      await this.updateUserHighestTier(owner, badgeData.tier);
      
      if (referrer) {
        console.log(`Ensuring referrer ${referrer} exists in database`);
        
        const referrerDoc = await User.findOne({ address: referrer });
        
        if (!referrerDoc) {
          console.log(`Creating new user record for referrer ${referrer}`);
          
          await User.create({
            address: referrer,
            highestBadgeTier: -1,
            points: 0,
            createdAt: new Date()
          });
        }
      }
      
      try {
        await WebhookService.sendBadgeMintEvent(owner, {
          owner,
          tier: badgeData.tier,
          tokenId: badgeData.tokenId,
          mintedAt: badgeData.mintedAt,
          transactionHash: badgeData.transactionHash,
          referrer: referrer
        });
      } catch (webhookError) {
        console.error('Failed to send webhook event:', webhookError);
      }
      
      return badge;
    } catch (error) {
      console.error(`Error creating badge:`, error);
      throw error;
    }
  }
  
  private static async updateUserHighestTier(address: string, newTier: number) {
    const normalizedAddress = address.toLowerCase();
    
    const user = await User.findOne({ address: normalizedAddress });
    const currentHighestTier = user ? docVal(user, 'highestBadgeTier', -1) : -1;
    
    console.log(`Updating highest tier - User: ${normalizedAddress}, Current: ${currentHighestTier}, New: ${newTier}`);
    
    if (newTier > currentHighestTier) {
      console.log(`Tier upgrade detected for ${normalizedAddress}: ${currentHighestTier} -> ${newTier}`);
      
      await User.findOneAndUpdate(
        { address: normalizedAddress },
        { 
          $set: { highestBadgeTier: newTier },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true, new: true }
      );
      
      const badgePoints = calculateBadgePoints(newTier); 
      
      await PointsHistory.create({
        address: normalizedAddress,
        points: badgePoints,
        reason: `Badge Tier ${newTier} Earned`,
        source: 'achievement', 
        timestamp: new Date(),
        tierAtEvent: newTier
      });
      
      await PointsService.recalculateSingleUserPoints(normalizedAddress);
      
      console.log(`Points recalculated for ${normalizedAddress} after tier update`);
    }
  }

  static async hasUserMintedTier(address: string, tier: number): Promise<boolean> {
    await dbConnect();
    
    const normalizedAddress = address.toLowerCase();
    
    const badge = await Badge.findOne({ 
      owner: normalizedAddress,
      tier 
    });
    
    const hasTier = !!badge;
    console.log(`User ${normalizedAddress} has minted tier ${tier}: ${hasTier}`);
    
    return hasTier;
  }
  
  static getTierName(tier: number): string {
    switch (tier) {
      case 0: return "Common";
      case 1: return "Uncommon";
      case 2: return "Rare";
      case 3: return "Epic";
      case 4: return "Legendary";
      default: return `Tier ${tier}`;
    }
  }
  
  static async getBadgeStats() {
    await dbConnect();
    
    const totalBadges = await Badge.countDocuments();
    
    const tierCounts = await Badge.aggregate([
      { $group: { _id: "$tier", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    const tierStats = tierCounts.reduce((acc, curr) => {
      acc[this.getTierName(curr._id)] = curr.count;
      return acc;
    }, {} as Record<string, number>);
    
    const referredBadges = await Badge.countDocuments({
      referrer: { $ne: null }
    });
    
    return {
      totalBadges,
      tierStats,
      referredBadges
    };
  }
  
  static async fixBadgeReferrers(): Promise<{ fixed: number, total: number }> {
    await dbConnect();
    
    console.log('Running badge referrer fix utility');
    
    const badges = await Badge.find();
    console.log(`Found ${badges.length} total badges`);
    
    let fixedCount = 0;
    for (const badge of badges) {
      if (!badge.referrer) {
        continue;
      }
      
      const normalizedReferrer = badge.referrer.toLowerCase();
      
      if (badge.referrer !== normalizedReferrer) {
        console.log(`Fixing referrer case for badge ${badge.tokenId}: ${badge.referrer} -> ${normalizedReferrer}`);
        
        await Badge.updateOne(
          { _id: badge._id },
          { $set: { referrer: normalizedReferrer } }
        );
        
        fixedCount++;
      }
    }
    
    console.log(`Fixed ${fixedCount} badge referrer addresses`);
    
    return {
      fixed: fixedCount,
      total: badges.length
    };
  }
}