// src/hooks/useDBData.ts
import { useState, useEffect } from 'react';
import { useActiveAccount, useActiveWalletConnectionStatus } from "thirdweb/react"; // Updated imports

interface ApiResponse<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Get current user's address from ThirdWeb wallet
 */
export function useCurrentAddress(): string | null {
  const account = useActiveAccount(); // This gives the active account directly
  return account?.address || null; // Return the address or null if no account
}

/**
 * Custom hook for fetching data from our API
 */
export function useDBData<T>(endpoint: string | null): ApiResponse<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [fetchCount, setFetchCount] = useState<number>(0);

  // Function to refetch data
  const refetch = () => {
    setFetchCount(prev => prev + 1);
  };

  useEffect(() => {
    // Skip if no endpoint provided
    if (!endpoint) {
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Tambahkan log untuk debugging
        console.log(`Fetching data from: ${endpoint}`);
        
        // Periksa format endpoint
        if (!endpoint || !endpoint.startsWith('/api/')) {
          console.warn(`Invalid API endpoint: ${endpoint}`);
          setData(null);
          setIsLoading(false);
          return;
        }

        const response = await fetch(endpoint);

        // Tangani respons 404 secara khusus
        if (response.status === 404) {
          console.warn(`API endpoint not found: ${endpoint}`);
          // Untuk 404, kita set data sebagai null tapi tidak throw error
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

/**
 * Hook for fetching user data
 */
export function useUserData(address: string | null) {
  const currentAddress = useCurrentAddress(); // Custom hook to get address
  const targetAddress = address || currentAddress; // Use provided address or current user's address
  const endpoint = targetAddress ? `/api/users/${targetAddress}` : null;
  return useDBData(endpoint);
}

/**
 * Hook for fetching user badges
 */
export function useUserBadges(address: string | null) {
  const currentAddress = useCurrentAddress(); // Custom hook
  const targetAddress = address || currentAddress; // Use provided address or current user's address
  const endpoint = targetAddress ? `/api/badges/${targetAddress}` : null;
  return useDBData(endpoint);
}

/**
 * Hook for fetching user checkins
 */
export function useUserCheckins(address: string | null) {
  const currentAddress = useCurrentAddress(); // Custom hook
  const targetAddress = address || currentAddress; // Use provided address or current user's address
  const endpoint = targetAddress ? `/api/checkins/${targetAddress}` : null;
  return useDBData(endpoint);
}

/**
 * Hook for fetching leaderboard data
 */
export function useLeaderboard(limit: number = 10) {
  const endpoint = `/api/points/leaderboard?limit=${limit}`;
  return useDBData(endpoint);
}

/**
 * Hook for fetching user referrals
 */
export function useUserReferrals(address: string | null) {
  const currentAddress = useCurrentAddress(); // Custom hook
  const targetAddress = address || currentAddress; // Use provided address or current user's address
  const endpoint = targetAddress ? `/api/referrals/${targetAddress}` : null;
  return useDBData(endpoint);
}

/**
 * Hook for fetching user points
 */
export function useUserPoints(address: string | null) {
  const currentAddress = useCurrentAddress(); // Custom hook
  const targetAddress = address || currentAddress; // Use provided address or current user's address
  const endpoint = targetAddress ? `/api/points/${targetAddress}` : null;
  return useDBData(endpoint);
}

/**
 * Hook for fetching badge statistics
 */
export function useBadgeStats() {
  const endpoint = `/api/badges/stats`;
  return useDBData(endpoint);
}

/**
 * Hook for checking if the current user is the owner of a profile
 */
export function useIsOwnProfile(profileAddress: string | null): boolean {
  const currentAddress = useCurrentAddress(); // Custom hook
  
  if (!currentAddress || !profileAddress) {
    return false;
  }
  
  return currentAddress.toLowerCase() === profileAddress.toLowerCase();
}