// src/mongodb/utils/formatters.ts

/**
 * Format Ethereum address to lowercase
 */
export const formatAddress = (address: string): string => {
  if (!address) return '';
  return address.toLowerCase();
};

/**
 * Format username to lowercase for consistent lookups
 */
export const formatUsername = (username: string): string => {
  if (!username) return '';
  return username.toLowerCase();
};

/**
 * Format timestamp for API responses with error handling
 */
export const formatTimestamp = (timestamp: Date | string | number): string => {
  try {
    // Handle null or undefined
    if (!timestamp) {
      console.warn('Received null or undefined timestamp');
      return new Date().toISOString();
    }
    
    // Create a date object based on the timestamp
    let date: Date;
    
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'number') {
      // Check if it's a Unix timestamp in seconds (10 digits or less)
      if (timestamp.toString().length <= 10) {
        date = new Date(timestamp * 1000);
      } else {
        date = new Date(timestamp);
      }
    } else {
      date = new Date(timestamp);
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn(`Invalid timestamp: ${timestamp}, using current date instead`);
      return new Date().toISOString();
    }
    
    // Handle dates that are outside the valid JavaScript date range
    const year = date.getFullYear();
    if (year < 1970 || year > 9999) {
      console.warn(`Timestamp outside valid range: ${timestamp}, using current date instead`);
      return new Date().toISOString();
    }
    
    return date.toISOString();
  } catch (error) {
    console.error(`Error formatting timestamp ${timestamp}:`, error);
    return new Date().toISOString();
  }
};

/**
 * Format time remaining until next checkin (in seconds)
 */
export const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return "Available now";
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  const format = (num: number) => num.toString().padStart(2, '0');
  
  if (days > 0) {
    return `${days}d ${format(hours)}:${format(minutes)}:${format(remainingSeconds)}`;
  } else {
    return `${format(hours)}:${format(minutes)}:${format(remainingSeconds)}`;
  }
};

/**
 * Format Ethereum address for display
 */
export const formatAddressForDisplay = (address: string): string => {
  if (!address || address.length < 10) return address || '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

/**
 * Format ETH amount with appropriate decimals
 */
export const formatEther = (amount: string | number): string => {
  if (!amount) return '0.0000';
  
  if (typeof amount === 'number') {
    return amount.toFixed(4);
  }
  
  try {
    const parsed = parseFloat(amount);
    return isNaN(parsed) ? '0.0000' : parsed.toFixed(4);
  } catch (e) {
    return '0.0000';
  }
};

/**
 * Format tier name based on tier number
 */
export const formatTierName = (tier: number): string => {
  switch (tier) {
    case 0: return 'Common';
    case 1: return 'Uncommon';
    case 2: return 'Rare';
    case 3: return 'Epic';
    case 4: return 'Legendary';
    default: return 'Unknown';
  }
};

/**
 * Format badge data for API response with error handling
 */
export const formatBadgeForResponse = (badge: any) => {
  try {
    if (!badge) return null;
    
    // Safely format the timestamp
    let mintedAtFormatted;
    try {
      mintedAtFormatted = badge.mintedAt ? formatTimestamp(badge.mintedAt) : null;
    } catch (error) {
      console.error(`Error formatting mintedAt for badge ${badge.tokenId}:`, error);
      mintedAtFormatted = formatTimestamp(new Date()); // Fallback to current date
    }
    
    // Safe tier formatting
    const tier = typeof badge.tier === 'number' ? badge.tier : 0;
    
    return {
      tokenId: badge.tokenId,
      tier: tier,
      tierName: formatTierName(tier),
      mintedAt: mintedAtFormatted,
      transactionHash: badge.transactionHash || '',
      referrer: badge.referrer || null,
      referrerFormatted: badge.referrer ? formatAddressForDisplay(badge.referrer) : null
    };
  } catch (error) {
    console.error(`Error formatting badge ${badge?.tokenId || 'unknown'}:`, error);
    
    // Return minimal safe badge data on error
    return {
      tokenId: badge?.tokenId || 0,
      tier: badge?.tier || 0,
      tierName: formatTierName(badge?.tier || 0),
      mintedAt: formatTimestamp(new Date()),
      transactionHash: badge?.transactionHash || '',
      referrer: null,
      referrerFormatted: null,
      error: 'Failed to format complete badge data'
    };
  }
};

/**
 * Format checkin data for API response with error handling
 */
export const formatCheckinForResponse = (checkin: any) => {
  try {
    if (!checkin) return null;
    
    // Safely format the timestamp
    let timestampFormatted;
    try {
      timestampFormatted = checkin.blockTimestamp ? formatTimestamp(checkin.blockTimestamp) : formatTimestamp(new Date());
    } catch (error) {
      console.error(`Error formatting timestamp for checkin ${checkin.checkinNumber}:`, error);
      timestampFormatted = formatTimestamp(new Date());
    }
    
    return {
      checkinNumber: checkin.checkinNumber || 0,
      timestamp: timestampFormatted,
      points: checkin.points || 0,
      boost: checkin.boost || 0,
      transactionHash: checkin.transactionHash || '',
      message: checkin.message || ''
    };
  } catch (error) {
    console.error('Error formatting checkin:', error);
    
    // Return minimal safe checkin data on error
    return {
      checkinNumber: checkin?.checkinNumber || 0,
      timestamp: formatTimestamp(new Date()),
      points: 0,
      boost: 0,
      transactionHash: '',
      message: '',
      error: 'Failed to format complete checkin data'
    };
  }
};

/**
 * Format referral data for API response with error handling
 */
export const formatReferralForResponse = (referral: any) => {
  try {
    if (!referral) return null;
    
    // Safely format the timestamp
    let timestampFormatted;
    try {
      timestampFormatted = referral.timestamp ? formatTimestamp(referral.timestamp) : formatTimestamp(new Date());
    } catch (error) {
      console.error(`Error formatting timestamp for referral:`, error);
      timestampFormatted = formatTimestamp(new Date());
    }
    
    // Safe tier formatting
    const badgeTier = typeof referral.badgeTier === 'number' ? referral.badgeTier : -1;
    
    return {
      referrer: referral.referrer || '',
      referee: referral.referee || '',
      referrerFormatted: formatAddressForDisplay(referral.referrer || ''),
      refereeFormatted: formatAddressForDisplay(referral.referee || ''),
      timestamp: timestampFormatted,
      transactionHash: referral.transactionHash || '',
      rewardsClaimed: referral.rewardsClaimed || false,
      rewardsAmount: referral.rewardsAmount || 0,
      badgeTier: badgeTier,
      badgeTierName: badgeTier >= 0 ? formatTierName(badgeTier) : 'None'
    };
  } catch (error) {
    console.error('Error formatting referral:', error);
    
    // Return minimal safe referral data on error
    return {
      referrer: referral?.referrer || '',
      referee: referral?.referee || '',
      referrerFormatted: formatAddressForDisplay(referral?.referrer || ''),
      refereeFormatted: formatAddressForDisplay(referral?.referee || ''),
      timestamp: formatTimestamp(new Date()),
      transactionHash: '',
      rewardsClaimed: false,
      rewardsAmount: 0,
      badgeTier: -1,
      badgeTierName: 'None',
      error: 'Failed to format complete referral data'
    };
  }
};

/**
 * Format badge tier name based on tier number from badge contract
 */
export const formatBadgeTierName = (tier: number): string => {
  switch (tier) {
    case 0: return 'Common';
    case 1: return 'Uncommon';
    case 2: return 'Rare';
    case 3: return 'Epic';
    case 4: return 'Legendary';
    default: return 'None';
  }
};