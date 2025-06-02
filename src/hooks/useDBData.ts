import { useState, useEffect } from 'react';
import { useActiveAccount, useActiveWalletConnectionStatus } from "thirdweb/react"; 

interface ApiResponse<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useCurrentAddress(): string | null {
  const account = useActiveAccount(); 
  return account?.address || null; 
}

export function useDBData<T>(endpoint: string | null): ApiResponse<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [fetchCount, setFetchCount] = useState<number>(0);

  const refetch = () => {
    setFetchCount(prev => prev + 1);
  };

  useEffect(() => {
    if (!endpoint) {
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log(`Fetching data from: ${endpoint}`);
        
        if (!endpoint || !endpoint.startsWith('/api/')) {
          console.warn(`Invalid API endpoint: ${endpoint}`);
          setData(null);
          setIsLoading(false);
          return;
        }

        const response = await fetch(endpoint);

        if (response.status === 404) {
          console.warn(`API endpoint not found: ${endpoint}`);
          setData(null);
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [endpoint, fetchCount]);

  return { data, isLoading, error, refetch };
}

export function useUserData(address: string | null) {
  const currentAddress = useCurrentAddress(); 
  const targetAddress = address || currentAddress; 
  const endpoint = targetAddress ? `/api/users/${targetAddress}` : null;
  return useDBData(endpoint);
}

export function useUserBadges(address: string | null) {
  const currentAddress = useCurrentAddress(); 
  const targetAddress = address || currentAddress; 
  const endpoint = targetAddress ? `/api/badges/${targetAddress}` : null;
  return useDBData(endpoint);
}


export function useUserCheckins(address: string | null) {
  const currentAddress = useCurrentAddress(); 
  const targetAddress = address || currentAddress; 
  const endpoint = targetAddress ? `/api/checkins/${targetAddress}` : null;
  return useDBData(endpoint);
}

export function useLeaderboard(limit: number = 10) {
  const endpoint = `/api/points/leaderboard?limit=${limit}`;
  return useDBData(endpoint);
}

export function useUserReferrals(address: string | null) {
  const currentAddress = useCurrentAddress(); 
  const targetAddress = address || currentAddress; 
  const endpoint = targetAddress ? `/api/referrals/${targetAddress}` : null;
  return useDBData(endpoint);
}

export function useUserPoints(address: string | null) {
  const currentAddress = useCurrentAddress(); 
  const targetAddress = address || currentAddress; 
  const endpoint = targetAddress ? `/api/points/${targetAddress}` : null;
  return useDBData(endpoint);
}

export function useBadgeStats() {
  const endpoint = `/api/badges/stats`;
  return useDBData(endpoint);
}

export function useIsOwnProfile(profileAddress: string | null): boolean {
  const currentAddress = useCurrentAddress();
  
  if (!currentAddress || !profileAddress) {
    return false;
  }
  
  return currentAddress.toLowerCase() === profileAddress.toLowerCase();
}