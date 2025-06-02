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
    messages: data?.checkins || [],
    totalCheckins: data?.stats?.totalCheckins || 0
  };
}

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
    checkinCount: data?.pagination.total || 0,
    checkins: data?.checkins || [],
    hasMore: data?.pagination.hasMore || false,
    lastCheckin: data?.checkins[0]?.blockTimestamp ? new Date(data.checkins[0].blockTimestamp) : null
  };
}

export function useTimeUntilNextCheckin(address: string | null = null) {
  const { lastCheckin } = useUserCheckins(address, 1);
  const [timeRemaining, setTimeRemaining] = useState<number>(24 * 60 * 60 * 1000); 
  
  useEffect(() => {
    if (!lastCheckin) return;
    
    const calculateTimeRemaining = () => {
      const now = new Date();
      const lastCheckinTime = new Date(lastCheckin);
      
      const nextCheckinTime = new Date(lastCheckinTime);
      nextCheckinTime.setHours(nextCheckinTime.getHours() + 24);
      
      const remaining = nextCheckinTime.getTime() - now.getTime();
      
      setTimeRemaining(Math.max(0, remaining));
    };
    
    calculateTimeRemaining();
    
    const interval = setInterval(calculateTimeRemaining, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [lastCheckin]);
  
  return {
    timeUntilNextCheckin: timeRemaining,
    canCheckin: timeRemaining <= 0
  };
}

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
  } = useLatestCheckins(1); 
  
  const { timeUntilNextCheckin } = useTimeUntilNextCheckin(targetAddress);
  
  const refreshAll = async () => {
    await Promise.all([
      refetchUserCheckins(),
      refetchLatestCheckins()
    ]);
  };
  
  return {
    checkinCount,
    timeUntilNextCheckin,
    canCheckin: timeUntilNextCheckin <= 0,
    isLoadingUserData: isLoadingUserCheckins,
    
    globalCheckinCount,
    isLoadingGlobalData: isLoadingLatestCheckins,
    
    refreshData: refreshAll
  };
}

export default {
  useLatestCheckins,
  useUserCheckins,
  useTimeUntilNextCheckin,
  useCheckinManager
};