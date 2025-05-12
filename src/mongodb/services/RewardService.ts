// src/mongodb/services/RewardService.ts
import dbConnect from '../connection';
import Referral from '../models/Referral';
import User from '../models/User';
import PointsHistory from '../models/PointsHistory';
import WebhookService from './WebhookService';

/**
 * Service for managing referral rewards
 */
export default class RewardService {
  /**
   * Get user's reward statistics
   * @param address User address
   * @returns Reward statistics
   */
  static async getUserRewardStats(address: string) {
    await dbConnect();
    
    const normalizedAddress = address.toLowerCase();
    
    // Get all referrals for this user
    const referrals = await Referral.find({ referrer: normalizedAddress });
    
    // Calculate pending rewards from unclaimed referrals
    const pendingRewards = referrals
      .filter(ref => !ref.rewardsClaimed)
      .reduce((total, ref) => total + parseFloat(ref.rewardsAmount || "0"), 0);
      
    // Calculate claimed rewards from claimed referrals  
    const claimedRewards = referrals
      .filter(ref => ref.rewardsClaimed)
      .reduce((total, ref) => total + parseFloat(ref.rewardsAmount || "0"), 0);
    
    // Get user record
    const user = await User.findOne({ address: normalizedAddress });
    
    // Update user record if rewards don't match
    if (user) {
      const shouldUpdate = (
        user.get('pendingRewards') !== pendingRewards ||
        user.get('claimedRewards') !== claimedRewards
      );
      
      if (shouldUpdate) {
        await User.updateOne(
          { address: normalizedAddress },
          {
            $set: {
              pendingRewards,
              claimedRewards,
              totalReferralRewards: pendingRewards + claimedRewards
            }
          }
        );
      }
    }
    
    return {
      pendingRewards: pendingRewards.toFixed(6),
      claimedRewards: claimedRewards.toFixed(6),
      totalRewards: (pendingRewards + claimedRewards).toFixed(6),
      pendingReferrals: referrals.filter(ref => !ref.rewardsClaimed).length,
      totalReferrals: referrals.length
    };
  }
  
  /**
   * Process reward claim
   * @param address User address
   * @param transactionHash Optional transaction hash
   * @returns Claim result
   */
  static async claimRewards(address: string, transactionHash?: string) {
    await dbConnect();
    
    const normalizedAddress = address.toLowerCase();
    const timestamp = new Date();
    
    // Find all unclaimed referrals
    const referrals = await Referral.find({
      referrer: normalizedAddress,
      rewardsClaimed: false
    });
    
    if (referrals.length === 0) {
      throw new Error('No pending rewards to claim');
    }
    
    // Calculate total reward amount
    const totalRewardAmount = referrals
      .reduce((total, ref) => total + parseFloat(ref.rewardsAmount || "0"), 0);
    
    if (totalRewardAmount <= 0) {
      throw new Error('No reward amount available to claim');
    }
    
    // Update referrals to claimed status
    const updateResult = await Referral.updateMany(
      {
        referrer: normalizedAddress,
        rewardsClaimed: false
      },
      {
        $set: {
          rewardsClaimed: true,
          claimedAt: timestamp,
          claimTxHash: transactionHash || 'api-claim'
        }
      }
    );
    
    if (updateResult.modifiedCount === 0) {
      throw new Error('Failed to update referrals to claimed status');
    }
    
    // Record in points history
    await PointsHistory.create({
      address: normalizedAddress,
      points: 0, // No points for claiming rewards
      reason: `Claimed referral rewards (${totalRewardAmount.toFixed(6)} TEA)`,
      source: 'referral_claim',
      timestamp,
      transactionHash: transactionHash || 'api-claim'
    });
    
    // Update user's reward balances
    await User.findOneAndUpdate(
      { address: normalizedAddress },
      {
        $inc: { claimedRewards: totalRewardAmount },
        $set: {
          pendingRewards: 0,
          lastRewardClaim: timestamp
        }
      },
      { upsert: true }
    );
    
    // Send webhook notification
    const rewardData = {
      amount: totalRewardAmount.toFixed(6),
      timestamp: timestamp.toISOString(),
      transactionHash: transactionHash || 'api-claim',
      referralsCount: referrals.length
    };
    
    // Use existing webhook service format
    await WebhookService.sendReferralEvent(
      normalizedAddress,
      'reward-claim', // Using referee parameter as event subtype
      rewardData
    );
    
    return {
      success: true,
      claimedAmount: totalRewardAmount.toFixed(6),
      referralsCount: referrals.length,
      txHash: transactionHash || 'api-claim'
    };
  }
  
  /**
   * Update reward amount for referrals
   * @param referrerAddress Referrer address
   * @param totalRewardAmount Total reward amount to distribute
   * @param tier Badge tier
   * @param timestamp Event timestamp
   * @returns Number of updated referrals
   */
  static async updateReferralRewards(
    referrerAddress: string,
    totalRewardAmount: string,
    tier: number,
    timestamp: Date
  ) {
    await dbConnect();
    
    const normalizedAddress = referrerAddress.toLowerCase();
    
    // Find all unclaimed referrals for this referrer
    const referrals = await Referral.find({
      referrer: normalizedAddress,
      rewardsClaimed: false
    });
    
    if (referrals.length === 0) {
      console.log(`No unclaimed referrals found for referrer ${normalizedAddress}`);
      return 0;
    }
    
    // Calculate reward per referral
    const rewardAmount = parseFloat(totalRewardAmount);
    const rewardPerReferral = (rewardAmount / referrals.length).toFixed(6);
    
    // Update each referral with its portion of the reward
    const updatePromises = referrals.map(referral =>
      Referral.updateOne(
        { _id: referral._id },
        {
          $set: {
            rewardsAmount: rewardPerReferral,
            badgeTier: tier
          }
        }
      )
    );
    
    const results = await Promise.all(updatePromises);
    const updatedCount = results.reduce((acc, result) => acc + result.modifiedCount, 0);
    
    if (updatedCount > 0) {
      // Update user's pending rewards
      await User.findOneAndUpdate(
        { address: normalizedAddress },
        {
          $set: {
            pendingRewards: rewardAmount,
            lastRewardUpdate: timestamp
          },
          $inc: {
            totalReferralRewards: rewardAmount
          }
        },
        { upsert: true }
      );
      
      // Record in points history
      await PointsHistory.create({
        address: normalizedAddress,
        points: 0, // No points for reward addition
        reason: `Earned referral rewards (${rewardAmount.toFixed(6)} TEA) for tier ${tier}`,
        source: 'referral_reward',
        timestamp
      });
      
      // Send webhook using existing format
      const rewardData = {
        amount: rewardAmount.toFixed(6),
        tier,
        timestamp: timestamp.toISOString(),
        referralsCount: referrals.length,
        rewardPerReferral
      };
      
      await WebhookService.sendReferralEvent(
        normalizedAddress,
        'reward-added', // Using referee parameter as event subtype
        rewardData
      );
    }
    
    return updatedCount;
  }
  
  /**
   * Get top earners by referral rewards
   * @param limit Number of results to return
   * @returns List of top earners
   */
  static async getTopEarners(limit: number = 10) {
    await dbConnect();
    
    const topEarners = await User.find({
      totalReferralRewards: { $gt: 0 }
    })
    .sort({ totalReferralRewards: -1 })
    .limit(limit)
    .select('address username totalReferralRewards claimedRewards pendingRewards');
    
    return topEarners.map(user => ({
      address: user.get('address'),
      username: user.get('username') || null,
      totalRewards: (user.get('totalReferralRewards') || 0).toFixed(6),
      claimedRewards: (user.get('claimedRewards') || 0).toFixed(6),
      pendingRewards: (user.get('pendingRewards') || 0).toFixed(6)
    }));
  }
  
  /**
   * Sync user's reward data with referrals
   * @param address User address to sync
   * @returns Updated reward stats
   */
  static async syncUserRewards(address: string) {
    await dbConnect();
    
    const normalizedAddress = address.toLowerCase();
    
    // Get all referrals for this user
    const referrals = await Referral.find({ referrer: normalizedAddress });
    
    // Calculate total pending and claimed rewards
    const pendingRewards = referrals
      .filter(ref => !ref.rewardsClaimed)
      .reduce((total, ref) => total + parseFloat(ref.rewardsAmount || "0"), 0);
      
    const claimedRewards = referrals
      .filter(ref => ref.rewardsClaimed)
      .reduce((total, ref) => total + parseFloat(ref.rewardsAmount || "0"), 0);
    
    // Update user document
    await User.findOneAndUpdate(
      { address: normalizedAddress },
      {
        $set: {
          pendingRewards,
          claimedRewards,
          totalReferralRewards: pendingRewards + claimedRewards,
          lastRewardSync: new Date()
        }
      },
      { upsert: true }
    );
    
    return {
      address: normalizedAddress,
      pendingRewards: pendingRewards.toFixed(6),
      claimedRewards: claimedRewards.toFixed(6),
      totalReferralRewards: (pendingRewards + claimedRewards).toFixed(6),
      referralCount: referrals.length
    };
  }
}