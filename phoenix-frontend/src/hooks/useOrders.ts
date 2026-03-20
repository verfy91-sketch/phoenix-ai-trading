import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tradingApi } from '@/lib/api/trading';
import { Order, OrderRequest, MarketData } from '@/types/trading';
import { toast } from 'react-hot-toast';

export const useOrders = (params?: {
  limit?: number;
  offset?: number;
  status?: string;
}) => {
  const queryClient = useQueryClient();

  const {
    data: ordersResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['orders', params],
    queryFn: () => tradingApi.getOrders(params),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const submitOrderMutation = useMutation({
    mutationFn: (order: OrderRequest) => tradingApi.submitOrder(order),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Order submitted: ${data.data?.orderId}`);
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit order');
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: (orderId: string) => tradingApi.cancelOrder(orderId),
    onSuccess: (data, orderId) => {
      if (data.success) {
        toast.success(`Order cancelled: ${orderId}`);
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      }
    },
    onError: (error: any, orderId) => {
      toast.error(error.response?.data?.message || `Failed to cancel order ${orderId}`);
    },
  });

  const submitOrder = (order: OrderRequest) => {
    submitOrderMutation.mutate(order);
  };

  const cancelOrder = (orderId: string) => {
    cancelOrderMutation.mutate(orderId);
  };

  const refreshOrders = () => {
    refetch();
  };

  return {
    orders: ordersResponse?.data || [],
    isLoading,
    error,
    refreshOrders,
    submitOrder,
    cancelOrder,
    isSubmitting: submitOrderMutation.isPending,
    isCancelling: cancelOrderMutation.isPending,
  };
};

export const useOrderHistory = (params?: {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}) => {
  const {
    data: historyResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order-history', params],
    queryFn: () => tradingApi.getOrderHistory(params),
    refetchInterval: 60000, // Refresh every minute
  });

  return {
    history: historyResponse?.data || [],
    isLoading,
    error,
    refreshHistory: refetch,
  };
};

export const useMarketData = (symbol: string) => {
  const {
    data: marketDataResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['market-data', symbol],
    queryFn: () => tradingApi.getMarketData(symbol),
    refetchInterval: 5000, // Refresh every 5 seconds
    enabled: !!symbol,
  });

  return {
    marketData: marketDataResponse?.data,
    isLoading,
    error,
  };
};

export const useAvailableSymbols = () => {
  const {
    data: symbolsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['available-symbols'],
    queryFn: tradingApi.getAvailableSymbols,
    staleTime: 300000, // Cache for 5 minutes
  });

  return {
    symbols: symbolsResponse?.data || [],
    isLoading,
    error,
  };
};
