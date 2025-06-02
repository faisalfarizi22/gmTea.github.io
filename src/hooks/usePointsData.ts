import { useState, useEffect } from 'react';
import { useDBData } from './useDBData';

interface PointsStatsData {
  totalPoints: number;
  sourceBreakdown: Record<string, number>;
  dailyTrend: Array<{
    _id: string;
    points: number;
    count: number;
  }>;
}

interface PointsActivityData {
  activities: Array<{
    id: string;
    address: string;
    username?: string;
    points: number;
    source: string;
    timestamp: string;
  }>;
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

export function useLatestPointsActivities(limit: number = 20, source?: string) {
  const queryParams = new URLSearchParams();
  queryParams.append('limit', limit.toString());
  if (source) {
    queryParams.append('source', source);
  }
  
  const endpoint = `/api/points/latest?${queryParams.toString()}`;
  return useDBData<PointsActivityData>(endpoint);
}

export function usePointsStats() {
  const endpoint = `/api/points/stats`;
  return useDBData<PointsStatsData>(endpoint);
}

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

export function usePointsTrend() {
  const { data, isLoading, error } = usePointsStats();
  
  const trendData = data && data.dailyTrend ? data.dailyTrend : [];
  
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