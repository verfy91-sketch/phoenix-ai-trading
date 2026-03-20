import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { strategiesApi } from '@/lib/api/strategies';
import { Strategy, StrategyConfig } from '@/types/api';
import { toast } from 'react-hot-toast';

export const useStrategies = () => {
  const queryClient = useQueryClient();

  const {
    data: strategiesResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['strategies'],
    queryFn: strategiesApi.getStrategies,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const createStrategyMutation = useMutation({
    mutationFn: (data: StrategyConfig) => strategiesApi.createStrategy(data),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Strategy created successfully');
        queryClient.invalidateQueries({ queryKey: ['strategies'] });
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create strategy');
    },
  });

  const updateStrategyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StrategyConfig> }) =>
      strategiesApi.updateStrategy(id, data),
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success(`Strategy "${variables.id}" updated successfully`);
        queryClient.invalidateQueries({ queryKey: ['strategies'] });
        queryClient.invalidateQueries({ queryKey: ['strategy', variables.id] });
      }
    },
    onError: (error: any, variables) => {
      toast.error(error.response?.data?.message || `Failed to update strategy "${variables.id}"`);
    },
  });

  const deleteStrategyMutation = useMutation({
    mutationFn: (id: string) => strategiesApi.deleteStrategy(id),
    onSuccess: (_, id) => {
      toast.success(`Strategy "${id}" deleted successfully`);
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
    },
    onError: (error: any, id) => {
      toast.error(error.response?.data?.message || `Failed to delete strategy "${id}"`);
    },
  });

  const startStrategyMutation = useMutation({
    mutationFn: (id: string) => strategiesApi.startStrategy(id),
    onSuccess: (_, id) => {
      toast.success(`Strategy "${id}" started successfully`);
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      queryClient.invalidateQueries({ queryKey: ['strategy', id] });
    },
    onError: (error: any, id) => {
      toast.error(error.response?.data?.message || `Failed to start strategy "${id}"`);
    },
  });

  const stopStrategyMutation = useMutation({
    mutationFn: (id: string) => strategiesApi.stopStrategy(id),
    onSuccess: (_, id) => {
      toast.success(`Strategy "${id}" stopped successfully`);
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      queryClient.invalidateQueries({ queryKey: ['strategy', id] });
    },
    onError: (error: any, id) => {
      toast.error(error.response?.data?.message || `Failed to stop strategy "${id}"`);
    },
  });

  const createStrategy = (data: StrategyConfig) => {
    createStrategyMutation.mutate(data);
  };

  const updateStrategy = (id: string, data: Partial<StrategyConfig>) => {
    updateStrategyMutation.mutate({ id, data });
  };

  const deleteStrategy = (id: string) => {
    deleteStrategyMutation.mutate(id);
  };

  const startStrategy = (id: string) => {
    startStrategyMutation.mutate(id);
  };

  const stopStrategy = (id: string) => {
    stopStrategyMutation.mutate(id);
  };

  const refreshStrategies = () => {
    refetch();
  };

  return {
    strategies: strategiesResponse?.data || [],
    isLoading,
    error,
    refreshStrategies,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    startStrategy,
    stopStrategy,
    isCreating: createStrategyMutation.isPending,
    isUpdating: updateStrategyMutation.isPending,
    isDeleting: deleteStrategyMutation.isPending,
    isStarting: startStrategyMutation.isPending,
    isStopping: stopStrategyMutation.isPending,
  };
};

export const useStrategy = (id: string) => {
  const {
    data: strategyResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['strategy', id],
    queryFn: () => strategiesApi.getStrategy(id),
    enabled: !!id,
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const {
    data: performanceResponse,
    isLoading: isPerformanceLoading,
    error: performanceError,
  } = useQuery({
    queryKey: ['strategy-performance', id],
    queryFn: () => strategiesApi.getStrategyPerformance(id),
    enabled: !!id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return {
    strategy: strategyResponse?.data,
    performance: performanceResponse?.data,
    isLoading,
    isPerformanceLoading,
    error,
    performanceError,
    refreshStrategy: refetch,
  };
};
