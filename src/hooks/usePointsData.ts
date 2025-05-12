// src/hooks/usePointsData.ts
import { useState, useEffect } from 'react';
import { useDBData } from './useDBData';

// Definisi interface untuk data points statistics
interface PointsStatsData {
  totalPoints: number;
  sourceBreakdown: Record<string, number>;
  dailyTrend: Array<{
    _id: string;
    points: number;
    count: number;
  }>;
}

// Interface untuk latest points activities
interface PointsActivityData {
  activities: Array<{
    id: string;
    address: string;
    username?: string;
    points: number;
    source: string;
    timestamp: string;
    // tambahkan properti lain yang diperlukan
  }>;
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

/**
 * Hook for fetching latest points activities
 */
export function useLatestPointsActivities(limit: number = 20, source?: string) {
  const queryParams = new URLSearchParams();
  queryParams.append('limit', limit.toString());
  if (source) {
    queryParams.append('source', source);
  }
  
  const endpoint = `/api/points/latest?${queryParams.toString()}`;
  return useDBData<PointsActivityData>(endpoint);
}

/**
 * Hook for fetching points statistics
 */
export function usePointsStats() {
  const endpoint = `/api/points/stats`;
  return useDBData<PointsStatsData>(endpoint);
}

/**
 * Hook for tracking total points in real-time
 */
export function useTotalPoints() {
  const { data, isLoading, error, refetch } = usePointsStats();
  const [totalPoints, setTotalPoints] = useState<number>(0);
  
  useEffect(() => {
    if (data && data.totalPoints !== undefined) {
      setTotalPoints(data.totalPoints);
    }
  }, [data]);
  
  return { 
    totalPoints,
    isLoading,
    error,
    refetch
  };
}

/**
 * Hook for getting points breakdown by source
 */
export function usePointsBreakdown() {
  const { data, isLoading, error } = usePointsStats();
  
  const formattedBreakdown = data && data.sourceBreakdown
    ? Object.entries(data.sourceBreakdown).map(([source, points]) => ({
        source,
        points,
        percentage: data.totalPoints > 0 ? Math.round((points / data.totalPoints) * 100) : 0
      }))
    : [];
  
  return {
    breakdown: formattedBreakdown,
    isLoading,
    error
  };
}

/**
 * Hook for getting points trend data (for charts)
 */
export function usePointsTrend() {
  const { data, isLoading, error } = usePointsStats();
  
  const trendData = data && data.dailyTrend ? data.dailyTrend : [];
  
  // Format for popular chart libraries
  const chartData = trendData.map((day) => ({
    date: day._id,
    points: day.points,
    count: day.count
  }));
  
  return {
    trendData: chartData,
    isLoading,
    error
  };
}