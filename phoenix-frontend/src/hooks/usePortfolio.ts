import { useQuery, useQueryClient } from '@tanstack/react-query';
import { portfolioApi } from '@/lib/api/portfolio';
import { Portfolio, Trade, Performance } from '@/types/trading';

export const usePortfolio = () => {
  const {
    data: portfolioResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['portfolio'],
    queryFn: portfolioApi.getPortfolio,
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const refreshPortfolio = () => {
    refetch();
  };

  return {
    portfolio: portfolioResponse?.data,
    isLoading,
    error,
    refreshPortfolio,
  };
};

export const useTradeHistory = (params?: {
  limit?: number;
  offset?: number;
}) => {
  const {
    data: historyResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['trade-history', params],
    queryFn: () => portfolioApi.getHistory(params),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return {
    trades: historyResponse?.data || [],
    isLoading,
    error,
    refreshHistory: refetch,
  };
};

export const usePerformance = () => {
  const {
    data: performanceResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['performance'],
    queryFn: portfolioApi.getPerformance,
    refetchInterval: 60000, // Refresh every minute
  });

  return {
    performance: performanceResponse?.data,
    isLoading,
    error,
    refreshPerformance: refetch,
  };
};

export const usePositions = () => {
  const {
    data: positionsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['positions'],
    queryFn: portfolioApi.getPositions,
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  return {
    positions: positionsResponse?.data || [],
    isLoading,
    error,
    refreshPositions: refetch,
  };
};
