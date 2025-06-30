export const formatAddress = (address: string): string => {
  if (!address) return '';
  return address.toLowerCase();
};

export const formatUsername = (username: string): string => {
  if (!username) return '';
  return username.toLowerCase();
};


export const formatTimestamp = (timestamp: Date | string | number): string => {
  try {
    if (!timestamp) {
      console.warn('Received null or undefined timestamp');
      return new Date().toISOString();
    }
    
    let date: Date;
    
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'number') {
      if (timestamp.toString().length <= 10) {
        date = new Date(timestamp * 1000);
      } else {
        date = new Date(timestamp);
      }
    } else {
      date = new Date(timestamp);
    }
    
    if (isNaN(date.getTime())) {
      console.warn(`Invalid timestamp: ${timestamp}, using current date instead`);
      return new Date().toISOString();
    }
    
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


export const formatAddressForDisplay = (address: string): string => {
  if (!address || address.length < 10) return address || '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

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

export const formatBadgeForResponse = (badge: any) => {
  try {
    if (!badge) return null;
    
    let mintedAtFormatted;
    try {
      mintedAtFormatted = badge.mintedAt ? formatTimestamp(badge.mintedAt) : null;
    } catch (error) {
      console.error(`Error formatting mintedAt for badge ${badge.tokenId}:`, error);
      mintedAtFormatted = formatTimestamp(new Date()); // Fallback to current date
    }
    
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

export const formatCheckinForResponse = (checkin: any) => {
  try {
    if (!checkin) return null;
    
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

export const formatReferralForResponse = (referral: any) => {
  try {
    if (!referral) return null;
    
    let timestampFormatted;
    try {
      timestampFormatted = referral.timestamp ? formatTimestamp(referral.timestamp) : formatTimestamp(new Date());
    } catch (error) {
      console.error(`Error formatting timestamp for referral:`, error);
      timestampFormatted = formatTimestamp(new Date());
    }
    
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