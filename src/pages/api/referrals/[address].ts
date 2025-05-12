// src/pages/api/referrals/[address].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { formatAddress, formatAddressForDisplay } from '../../../mongodb/utils/formatters';
import { isValidAddress, getSafeErrorMessage } from '../../../mongodb/utils/validators';
import Badge from '../../../mongodb/models/Badge';
import User from '../../../mongodb/models/User';
import Reward from '../../../mongodb/models/Reward';
import dbConnect from '../../../mongodb/connection';
import { docVal } from '../../../mongodb/utils/documentHelper';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { address } = req.query;
    
    // Validate address
    if (!address || typeof address !== 'string' || !isValidAddress(address)) {
      return res.status(400).json({ message: 'Invalid address parameter' });
    }
    
    await dbConnect();
    
    const normalizedAddress = formatAddress(address);
    console.log(`Getting referrals for address: ${normalizedAddress}`);
    
    // Find all badges that have this address as a referrer
    const referredBadges = await Badge.find({ 
      referrer: normalizedAddress 
    }).sort({ mintedAt: -1 });
    
    console.log(`Found ${referredBadges.length} badges with referrer ${normalizedAddress}`);
    
    // Filter duplicate owners - count each user only once for referral count
    // This fixes overcounting when a user mints multiple badges using the same referral
    const uniqueReferredAddresses = new Set<string>();
    referredBadges.forEach(badge => {
      if (badge.owner) {
        uniqueReferredAddresses.add(badge.owner.toLowerCase());
      }
    });
    
    const uniqueReferralCount = uniqueReferredAddresses.size;
    console.log(`Filtered to ${uniqueReferralCount} unique referred addresses`);
    
    // Get existing rewards already claimed by this referrer
    const existingRewards = await Reward.find({ referrer: normalizedAddress });
    let claimedRewards = 0;
    
    if (existingRewards && existingRewards.length > 0) {
      claimedRewards = existingRewards.reduce((total, reward) => {
        return total + (typeof reward.amount === 'number' ? reward.amount : 0);
      }, 0);
    }
    
    console.log(`Found ${existingRewards.length} existing reward records, total ${claimedRewards} TEA`);
    
    // Calculate total rewards based on badge tiers
    let pendingRewards = 0;
    
    // Get reward percentages based on tier
    const tierRewardPercentages = [5, 10, 15, 20, 25]; // 5% for tier 0 (Common), 25% for tier 4 (Legendary)
    
    // Badge tier base prices in TEA (matching smart contract)
    const tierPrices = [1, 5, 12, 18, 24];
    
    // Format referrals with reward calculations and skip already rewarded badges
    const referrals = await Promise.all(referredBadges.map(async (badge) => {
      try {
        // Get badge owner's details
        const badgeOwner = await User.findOne({ address: badge.owner });
        
        // Check if reward for this badge has already been claimed
        const badgeRewarded = existingRewards.some(reward => 
          reward.relatedBadges && reward.relatedBadges.includes(badge.tokenId)
        );
        
        // IMPORTANT: For reward calculation, we need to determine what tier the referrer had
        // when this badge was minted, not their current tier.
        
        // First, get the minting time of this badge
        const badgeMintTime = badge.mintedAt ? new Date(badge.mintedAt) : new Date();
        
        // Find the referrer's tier at the time of minting
        // This would require some historical tier data. As a simplified approach,
        // we'll use the tier of the most recent badge the referrer minted before this badge
        
        let referrerTierAtMintTime = 0; // Default to Common (Tier 0)
        
        if (badge.mintedAt) {
          // Find referrer's highest badge minted BEFORE this badge was minted
          const referrerPreviousBadges = await Badge.find({
            owner: normalizedAddress,
            mintedAt: { $lt: badgeMintTime }
          }).sort({ tier: -1 }).limit(1);
          
          if (referrerPreviousBadges.length > 0) {
            referrerTierAtMintTime = referrerPreviousBadges[0].tier;
          }
        }
        
        console.log(`Referrer ${normalizedAddress} had tier ${referrerTierAtMintTime} when badge ${badge.tokenId} was minted`);
        
        // Get the referrer's reward percentage based on their tier at mint time
        const rewardPercentage = referrerTierAtMintTime >= 0 && referrerTierAtMintTime < tierRewardPercentages.length
          ? tierRewardPercentages[referrerTierAtMintTime]
          : 5; // Default to 5% if something is wrong
        
        console.log(`Reward percentage for badge ${badge.tokenId}: ${rewardPercentage}%`);
        
        // Calculate reward based on badge tier
        const badgeTier = badge.tier;
        const badgePrice = badgeTier >= 0 && badgeTier < tierPrices.length
          ? tierPrices[badgeTier]
          : 1; // Default to tier 0 price
        
        // Calculate reward amount
        const rewardAmount = (badgePrice * rewardPercentage) / 100;
        
        // Add to pending rewards if not already claimed
        if (!badgeRewarded) {
          pendingRewards += rewardAmount;
        }
        
        return {
          referrer: normalizedAddress,
          referee: badge.owner,
          referrerFormatted: formatAddressForDisplay(normalizedAddress),
          refereeFormatted: formatAddressForDisplay(badge.owner),
          refereeName: docVal(badgeOwner, 'username', null),
          timestamp: badge.mintedAt,
          transactionHash: badge.transactionHash,
          badgeTier: badge.tier,
          referrerTierAtMint: referrerTierAtMintTime,
          rewardPercentage: rewardPercentage,
          rewardsClaimed: badgeRewarded,
          rewardsAmount: rewardAmount.toString()
        };
      } catch (error) {
        console.error(`Error processing badge ${badge.tokenId}:`, error);
        
        // Return a minimal safe object for this badge
        return {
          referrer: normalizedAddress,
          referee: badge.owner,
          referrerFormatted: formatAddressForDisplay(normalizedAddress),
          refereeFormatted: formatAddressForDisplay(badge.owner),
          timestamp: badge.mintedAt || new Date(),
          transactionHash: badge.transactionHash || '',
          badgeTier: badge.tier || 0,
          referrerTierAtMint: 0,
          rewardPercentage: 5,
          rewardsClaimed: false,
          rewardsAmount: '0'
        };
      }
    }));
    
    // Generate stats object with the correct historical tier-based calculations
    const stats = {
      total: uniqueReferralCount, // Using unique referred addresses count here
      pendingRewards: pendingRewards.toString(),
      claimedRewards: claimedRewards.toString()
    };
    
    console.log(`Stats for ${normalizedAddress}:`, stats);
    
    // Add cache control headers
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    
    return res.status(200).json({
      referrals,
      stats
    });
    
  } catch (error) {
    console.error('Error in referrals API:', error);
    return res.status(500).json({ message: getSafeErrorMessage(error) });
  }
}