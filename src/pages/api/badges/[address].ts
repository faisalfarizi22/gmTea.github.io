// src/pages/api/badges/[address].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { BadgeService } from '../../../mongodb/services';
import { isValidAddress, getSafeErrorMessage } from '../../../mongodb/utils/validators';
import { formatBadgeForResponse, formatBadgeTierName } from '../../../mongodb/utils/formatters';

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
    
    // Get user's badges
    const badges = await BadgeService.getUserBadges(address);
    
    // Get user's highest tier
    let highestTier = -1;
    try {
      highestTier = await BadgeService.getUserHighestTier(address);
    } catch (tierError) {
      console.error('Error getting highest tier:', tierError);
    }
    
    // Format badges for response with safe error handling
    const formattedBadges = [];
    let formatErrors = 0;
    
    for (const badge of badges) {
      try {
        const formattedBadge = formatBadgeForResponse(badge);
        formattedBadges.push(formattedBadge);
      } catch (formatError) {
        console.error(`Error formatting badge ${badge.tokenId}:`, formatError);
        formatErrors++;
        
        // Add a minimal safe version of the badge
        formattedBadges.push({
          tokenId: badge.tokenId,
          owner: badge.owner,
          tier: badge.tier,
          tierName: formatBadgeTierName(badge.tier),
          mintedAt: new Date().toISOString(),
          transactionHash: badge.transactionHash || '',
          referrer: badge.referrer || null,
          referrerFormatted: badge.referrer ? `${badge.referrer.substring(0, 6)}...${badge.referrer.substring(badge.referrer.length - 4)}` : null,
          error: 'Failed to format complete badge data'
        });
      }
    }
    
    if (formatErrors > 0) {
      console.warn(`${formatErrors} badges had formatting errors but were safely handled`);
    }
    
    // Add cache control headers
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    
    return res.status(200).json({
      badges: formattedBadges,
      stats: {
        count: badges.length,
        highestTier,
        highestTierName: highestTier >= 0 ? formatBadgeTierName(highestTier) : 'None'
      }
    });
    
  } catch (error) {
    console.error('Error in badges API:', error);
    return res.status(500).json({ 
      message: getSafeErrorMessage(error),
      error: 'An error occurred while fetching badges'
    });
  }
}