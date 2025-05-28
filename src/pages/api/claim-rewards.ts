// src/pages/api/claim-rewards.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../mongodb/connection';
import Badge from '../../mongodb/models/Badge';
import Reward from '../../mongodb/models/Reward';
import User from '../../mongodb/models/User';
import { isValidAddress, getSafeErrorMessage } from '../../mongodb/utils/validators';
import { formatAddress } from '../../mongodb/utils/formatters';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { address } = req.body;
    
    // Validate address
    if (!address || !isValidAddress(address)) {
      return res.status(400).json({ message: 'Invalid address parameter' });
    }
    
    await dbConnect();
    
    const normalizedAddress = formatAddress(address);
    console.log(`Processing reward claim for address: ${normalizedAddress}`);
    
    // Find badges referred by this user
    const referredBadges = await Badge.find({ referrer: normalizedAddress });
    
    if (referredBadges.length === 0) {
      return res.status(400).json({ 
        message: 'No referred badges found for this address' 
      });
    }
    
    console.log(`Found ${referredBadges.length} badges referred by ${normalizedAddress}`);
    
    // Get already claimed rewards
    const existingRewards = await Reward.find({ referrer: normalizedAddress });
    const alreadyRewardedBadgeIds = new Set<number>();
    
    existingRewards.forEach(reward => {
      if (reward.relatedBadges && Array.isArray(reward.relatedBadges)) {
        reward.relatedBadges.forEach(badgeId => {
          alreadyRewardedBadgeIds.add(badgeId);
        });
      }
    });
    
    console.log(`Found ${existingRewards.length} existing rewards with ${alreadyRewardedBadgeIds.size} badges already rewarded`);
    
    // Calculate reward amount based on badge tiers
    // Get reward percentages based on tier
    const tierRewardPercentages = [5, 10, 15, 20, 25]; // 5% for tier 0 (Common), 25% for tier 4 (Legendary)
    
    // Get the referrer's highest badge tier to determine reward percentage
    const referrerUser = await User.findOne({ address: normalizedAddress });
    if (!referrerUser) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }
    
    const referrerTier = referrerUser.highestBadgeTier || 0;
    console.log(`Referrer ${normalizedAddress} has highest tier: ${referrerTier}`);
    
    // Get the referrer's reward percentage
    const rewardPercentage = referrerTier >= 0 && referrerTier < tierRewardPercentages.length
      ? tierRewardPercentages[referrerTier]
      : 5; // Default to 5% if something is wrong
    
    console.log(`Referrer reward percentage: ${rewardPercentage}%`);
    
    // Badge tier base prices in TEA (matching smart contract)
    const tierPrices = [1, 5, 12, 18, 24];
    
    // Calculate the total pending rewards
    let pendingRewardAmount = 0;
    const pendingBadgeIds: number[] = [];
    
    for (const badge of referredBadges) {
      // Skip badges that have already had rewards claimed
      if (alreadyRewardedBadgeIds.has(badge.tokenId)) {
        console.log(`Reward already claimed for badge ${badge.tokenId}`);
        continue;
      }
      
      // Calculate reward based on badge tier
      const badgeTier = badge.tier;
      const badgePrice = badgeTier >= 0 && badgeTier < tierPrices.length
        ? tierPrices[badgeTier]
        : 1; // Default to tier 0 price
      
      // Calculate reward amount
      const rewardAmount = (badgePrice * rewardPercentage) / 100;
      pendingRewardAmount += rewardAmount;
      pendingBadgeIds.push(badge.tokenId);
    }
    
    if (pendingRewardAmount <= 0 || pendingBadgeIds.length === 0) {
      return res.status(400).json({ 
        message: 'No pending rewards to claim' 
      });
    }
    
    console.log(`Total pending reward amount: ${pendingRewardAmount} TEA from ${pendingBadgeIds.length} badges`);
    
    // Generate transaction hash for the claim
    const timestamp = Date.now();
    const txHash = `db-claim-${normalizedAddress.substring(2, 6)}-${timestamp}`;
    
    // Create a reward record
    const rewardRecord = await Reward.create({
      referrer: normalizedAddress,
      amount: pendingRewardAmount,
      claimedAt: new Date(),
      transactionHash: txHash,
      logIndex: 0,
      blockNumber: 0,
      relatedBadges: pendingBadgeIds
    });
    
    console.log(`Created reward record: ${rewardRecord._id} with txHash ${txHash}`);
    
    // Return success
    return res.status(200).json({
      success: true,
      amount: pendingRewardAmount,
      txHash: rewardRecord.transactionHash,
      message: `Successfully claimed ${pendingRewardAmount} TEA rewards from ${pendingBadgeIds.length} badges`
    });
    
  } catch (error) {
    console.error('Error claiming rewards:', error);
    return res.status(500).json({ 
      message: getSafeErrorMessage(error),
      error: 'An error occurred while claiming rewards'
    });
  }
}