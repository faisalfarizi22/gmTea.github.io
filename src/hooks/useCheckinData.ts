import { useState, useEffect } from 'react';
import { useCurrentAddress } from './useDBData';

interface CheckinData {
  checkins: Array<{
    address: string;
    message: string;
    checkinNumber: number;
    blockTimestamp: string;
    transactionHash: string;
    points: number;
    boost?: number;
    username?: string | null;
  }>;
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  };
  stats?: {
    totalCheckins: number;
  };
}

/**
 * Hook to fetch latest checkins from all users
 */
export function useLatestCheckins(limit: number = 20) {
  const [data, setData] = useState<CheckinData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchLatestCheckins = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/checkins/latest?limit=${limit}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching latest checkins:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestCheckins();
  }, [limit]);

  const refetch = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/checkins/latest?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error refetching latest checkins:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    data,
    isLoading,
    error,
    refetch,
    // Convenience getters
    messages: data?.checkins || [],
    totalCheckins: data?.stats?.totalCheckins || 0
  };
}

/**
 * Hook to fetch a specific user's checkins
 */
export function useUserCheckins(address: string | null = null, limit: number = 20) {
  const [data, setData] = useState<CheckinData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const currentAddress = useCurrentAddress();
  const targetAddress = address || currentAddress;

  useEffect(() => {
    if (!targetAddress) {
      setIsLoading(false);
      return;
    }

    const fetchUserCheckins = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/checkins/${targetAddress}?limit=${limit}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching user checkins:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserCheckins();
  }, [targetAddress, limit]);

  const refetch = async () => {
    if (!targetAddress) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/checkins/${targetAddress}?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error refetching user checkins:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    data,
    isLoading,
    error,
    refetch,
    // Convenience properties
    checkinCount: data?.pagination.total || 0,
    checkins: data?.checkins || [],
    hasMore: data?.pagination.hasMore || false,
    lastCheckin: data?.checkins[0]?.blockTimestamp ? new Date(data.checkins[0].blockTimestamp) : null
  };
}

/**
 * Hook for calculating time until next checkin
 * This can be based on the last checkin time from the database
 */
export function useTimeUntilNextCheckin(address: string | null = null) {
  const { lastCheckin } = useUserCheckins(address, 1);
  const [timeRemaining, setTimeRemaining] = useState<number>(24 * 60 * 60 * 1000); // Default to 24 hours
  
  useEffect(() => {
    if (!lastCheckin) return;
    
    // Calculate time since last checkin
    const calculateTimeRemaining = () => {
      const now = new Date();
      const lastCheckinTime = new Date(lastCheckin);
      
      // Add 24 hours to last checkin time to get next available checkin time
      const nextCheckinTime = new Date(lastCheckinTime);
      nextCheckinTime.setHours(nextCheckinTime.getHours() + 24);
      
      // Calculate remaining time in milliseconds
      const remaining = nextCheckinTime.getTime() - now.getTime();
      
      // If remaining time is negative, user can checkin now
      setTimeRemaining(Math.max(0, remaining));
    };
    
    // Initial calculation
    calculateTimeRemaining();
    
    // Update every minute
    const interval = setInterval(calculateTimeRemaining, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [lastCheckin]);
  
  return {
    timeUntilNextCheckin: timeRemaining,
    canCheckin: timeRemaining <= 0
  };
}

/**
 * Integrated hook that provides all checkin-related data
 */
export function useCheckinManager(address: string | null = null) {
  const currentAddress = useCurrentAddress();
  const targetAddress = address || currentAddress;
  
  const { 
    checkinCount, 
    isLoading: isLoadingUserCheckins,
    refetch: refetchUserCheckins 
  } = useUserCheckins(targetAddress);
  
  const { 
    totalCheckins: globalCheckinCount, 
    isLoading: isLoadingLatestCheckins,
    refetch: refetchLatestCheckins
  } = useLatestCheckins(1); // Just need the count, not all messages
  
  const { timeUntilNextCheckin } = useTimeUntilNextCheckin(targetAddress);
  
  // Refetch all data
  const refreshAll = async () => {
    await Promise.all([
      refetchUserCheckins(),
      refetchLatestCheckins()
    ]);
  };
  
  return {
    // User data
    checkinCount,
    timeUntilNextCheckin,
    canCheckin: timeUntilNextCheckin <= 0,
    isLoadingUserData: isLoadingUserCheckins,
    
    // Global data
    globalCheckinCount,
    isLoadingGlobalData: isLoadingLatestCheckins,
    
    // Actions
    refreshData: refreshAll
  };
}

export default {
  useLatestCheckins,
  useUserCheckins,
  useTimeUntilNextCheckin,
  useCheckinManager
};