// src/mongodb/services/ReferralService.ts
import dbConnect from '../connection';
import Referral from '../models/Referral';
import { formatAddress } from '../utils/formatters';

export default class ReferralService {
  /**
   * Create a new referral relationship
   */
  static async createReferral(referralData: {
    referrer: string;
    referee: string;
    txHash: string;
    timestamp?: Date;
  }) {
    await dbConnect();
    
    // Format addresses to lowercase
    const formattedData = {
      ...referralData,
      referrer: formatAddress(referralData.referrer),
      referee: formatAddress(referralData.referee),
      timestamp: referralData.timestamp || new Date()
    };
    
    // Create new referral entry
    return Referral.create(formattedData);
  }
  
  /**
   * Save referral from blockchain event
   */
  static async saveReferral(referralData: {
    referrer: string;
    referee: string;
    transactionHash: string;
    timestamp: Date;
  }) {
    await dbConnect();
    
    // Format addresses to lowercase
    const formattedData = {
      referrer: formatAddress(referralData.referrer),
      referee: formatAddress(referralData.referee),
      txHash: referralData.transactionHash,
      createdAt: referralData.timestamp,
      updatedAt: referralData.timestamp,
      rewardsClaimed: false,
      rewardsAmount: 0,
      badgeTier: -1
    };
    
    // Check if referral already exists
    const existingReferral = await Referral.findOne({ 
      referee: formattedData.referee 
    });
    
    if (existingReferral) {
      return existingReferral;
    }
    
    // Create new referral
    return Referral.create(formattedData);
  }
  
  /**
   * Update referral reward amount when new badge is minted
   */
  static async updateReferralRewardAmount(
    referrer: string,
    amount: string,
    badgeTier: number,
    timestamp: Date
  ) {
    await dbConnect();
    
    const formattedReferrer = formatAddress(referrer);
    
    // Find the most recent unclaimed referral for this referrer that resulted in a badge mint
    // This is a simplification - you might need to adjust the query based on your specific logic
    const referral = await Referral.findOne({
      referrer: formattedReferrer,
      rewardsClaimed: false,
      badgeTier: { $lt: badgeTier } // Only update if the new tier is higher
    }).sort({ createdAt: -1 });
    
    if (referral) {
      // Update the referral with the new reward amount and badge tier
      return Referral.updateOne(
        { _id: referral._id },
        { 
          $set: { 
            rewardsAmount: parseFloat(amount),
            badgeTier,
            updatedAt: timestamp
          } 
        }
      );
    }
    
    // If no matching referral found, log this for debugging
    console.log(`No unclaimed referral found for referrer ${referrer} to update reward amount ${amount} for tier ${badgeTier}`);
    return null;
  }
  
  /**
   * Mark referral rewards as claimed
   */
  static async markReferralRewardsClaimed(
    claimer: string,
    amount: string,
    transactionHash: string,
    timestamp: Date
  ) {
    await dbConnect();
    
    const formattedClaimer = formatAddress(claimer);
    
    // Find all unclaimed referrals for this claimer
    const result = await Referral.updateMany(
      { 
        referrer: formattedClaimer,
        rewardsClaimed: false,
        rewardsAmount: { $gt: 0 } // Only mark referrals with rewards
      },
      {
        $set: {
          rewardsClaimed: true,
          updatedAt: timestamp
        }
      }
    );
    
    // Return the number of updated referrals
    return result.modifiedCount;
  }
  
  /**
   * Get count of referrals made by an address
   */
  static async getReferralCount(address: string): Promise<number> {
    await dbConnect();
    
    // Count referrals where this address is the referrer
    return Referral.countDocuments({ 
      referrer: formatAddress(address) 
    });
  }
  
  /**
   * Get referrals made by an address
   */
  static async getReferralsByReferrer(address: string, limit?: number) {
    await dbConnect();
    
    const query = Referral.find({ 
      referrer: formatAddress(address) 
    }).sort({ createdAt: -1 });
    
    if (limit) {
      query.limit(limit);
    }
    
    return query.exec();
  }
  
  /**
   * Get referrer for a specific address (who referred this user)
   */
  static async getReferrerForUser(address: string) {
    await dbConnect();
    
    const referral = await Referral.findOne({ 
      referee: formatAddress(address) 
    });
    
    return referral ? referral.referrer : null;
  }
  
  /**
   * Check if a user has a referrer
   */
  static async hasReferrer(address: string): Promise<boolean> {
    await dbConnect();
    
    const count = await Referral.countDocuments({ 
      referee: formatAddress(address) 
    });
    
    return count > 0;
  }
  
  /**
   * Get all referrals
   */
  static async getAllReferrals(limit: number = 100, skip: number = 0) {
    await dbConnect();
    
    return Referral.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }
  
  /**
   * Get user referrals
   */
  static async getUserReferrals(address: string, limit?: number) {
    await dbConnect();
    
    // First normalize the address
    const normalizedAddress = formatAddress(address);
    
    // Get referrals where this address is the referrer
    const query = Referral.find({
      referrer: normalizedAddress
    }).sort({ createdAt: -1 });
    
    // Apply limit if specified
    if (limit) {
      query.limit(limit);
    }
    
    return query.exec();
  }
}