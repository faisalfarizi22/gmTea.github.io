import { useState, useEffect } from 'react';
import { useCurrentAddress } from './useDBData';

// Interface for badge data
interface Badge {
  tokenId: number;
  owner: string;
  tier: number;
  tierName: string;
  mintedAt: string;
  transactionHash: string;
  referrer?: string | null;
}

// Interface for badge API response
interface BadgeResponse {
  badges: Badge[];
  stats: {
    count: number;
    highestTier: number;
    highestTierName: string;
  };
}

/**
 * Hook to fetch user badges data from the database API
 */
export function useUserBadges(address: string | null = null) {
  const [data, setData] = useState<BadgeResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const currentAddress = useCurrentAddress();
  const targetAddress = address || currentAddress;

  useEffect(() => {
    if (!targetAddress) {
      setIsLoading(false);
      return;
    }

    const fetchBadges = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/badges/${targetAddress}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching badges:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchBadges();
  }, [targetAddress]);

  return {
    data,
    badges: data?.badges || [],
    highestTier: data?.stats.highestTier ?? -1,
    highestTierName: data?.stats.highestTierName || 'None',
    badgeCount: data?.stats.count || 0,
    isLoading,
    error,
    refetch: async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/badges/${targetAddress}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error refetching badges:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }
  };
}

/**
 * Hook to fetch username by address
 */
export function useUsername(address: string | null = null) {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const currentAddress = useCurrentAddress();
  const targetAddress = address || currentAddress;

  useEffect(() => {
    if (!targetAddress) {
      setIsLoading(false);
      return;
    }

    const fetchUsername = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/usernames/by-address/${targetAddress}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const result = await response.json();
        setUsername(result.username);
      } catch (err) {
        console.error('Error fetching username:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsername();
  }, [targetAddress]);

  return {
    username,
    isLoading,
    error,
    hasUsername: username !== null
  };
}

/**
 * Hook to get badge tier and username data for multiple addresses at once
 * This is optimized for the hybrid GMMessageList to fetch badge data for multiple users efficiently
 */
export function useMultipleUserBadgeData(addresses: string[]) {
  const [badgeData, setBadgeData] = useState<Record<string, { 
    highestTier: number, 
    username: string | null,
    tierName: string 
  }>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!addresses.length) return;

    // Only fetch for addresses we don't already have
    const addressesToFetch = addresses.filter(addr => !badgeData[addr]);
    if (!addressesToFetch.length) return;

    const fetchBadgeData = async () => {
      setIsLoading(true);
      
      // Process in batches of 5 to avoid overwhelming the API
      const batchSize = 5;
      const newBadgeData = { ...badgeData };
      
      for (let i = 0; i < addressesToFetch.length; i += batchSize) {
        const batch = addressesToFetch.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (address) => {
          try {
            // Fetch badge tier
            const badgeResponse = await fetch(`/api/badges/${address}`);
            if (!badgeResponse.ok) {
              throw new Error(`Badge API error: ${badgeResponse.status}`);
            }
            const badgeResult = await badgeResponse.json();
            
            // Fetch username
            const usernameResponse = await fetch(`/api/usernames/by-address/${address}`);
            let username = null;
            if (usernameResponse.ok) {
              const usernameResult = await usernameResponse.json();
              username = usernameResult.username;
            }
            
            // Store data
            newBadgeData[address] = {
              highestTier: badgeResult.stats.highestTier,
              username,
              tierName: badgeResult.stats.highestTierName
            };
          } catch (error) {
            console.error(`Error fetching data for ${address}:`, error);
            // Add default data
            newBadgeData[address] = {
              highestTier: -1,
              username: null,
              tierName: 'None'
            };
          }
        }));
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < addressesToFetch.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      setBadgeData(newBadgeData);
      setIsLoading(false);
    };

    fetchBadgeData();
  }, [addresses, badgeData]);

  return {
    badgeData,
    isLoading,
    error,
    refetch: async () => {
      // Reset data for all addresses to force refetch
      const addressesToRefetch = [...addresses];
      setBadgeData({});
      setIsLoading(true);
      
      // Wait a brief moment to ensure state updates
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Process in batches
      const batchSize = 5;
      const newBadgeData: Record<string, { 
        highestTier: number, 
        username: string | null,
        tierName: string 
      }> = {};
      
      for (let i = 0; i < addressesToRefetch.length; i += batchSize) {
        const batch = addressesToRefetch.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (address) => {
          try {
            // Fetch badge tier
            const badgeResponse = await fetch(`/api/badges/${address}`);
            if (!badgeResponse.ok) {
              throw new Error(`Badge API error: ${badgeResponse.status}`);
            }
            const badgeResult = await badgeResponse.json();
            
            // Fetch username
            const usernameResponse = await fetch(`/api/usernames/by-address/${address}`);
            let username = null;
            if (usernameResponse.ok) {
              const usernameResult = await usernameResponse.json();
              username = usernameResult.username;
            }
            
            // Store data
            newBadgeData[address] = {
              highestTier: badgeResult.stats.highestTier,
              username,
              tierName: badgeResult.stats.highestTierName
            };
          } catch (error) {
            console.error(`Error refetching data for ${address}:`, error);
            // Add default data
            newBadgeData[address] = {
              highestTier: -1,
              username: null,
              tierName: 'None'
            };
          }
        }));
      }
      
      setBadgeData(newBadgeData);
      setIsLoading(false);
    }
  };
}