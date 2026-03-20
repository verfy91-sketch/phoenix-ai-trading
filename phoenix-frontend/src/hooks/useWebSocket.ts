'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { socketService } from '@/lib/socket/socket';
import { logger } from '@/lib/utils/logger';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { Order, MarketData } from '@/types/trading';

export function useWebSocket() {
  const queryClient = useQueryClient();
  const { token, isAuthenticated } = useAuthStore();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const setupEventListeners = useCallback(() => {
    // Market data events
    socketService.on('market-data', (data: MarketData) => {
      logger.debug('Received market data:', data);
      
      // Update market data cache
      queryClient.setQueryData(['market-data', data.symbol], data);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    });

    socketService.on('tick', (data: MarketData) => {
      logger.debug('Received tick:', data);
      
      // Update market data cache
      queryClient.setQueryData(['market-data', data.symbol], data);
    });

    // Order events
    socketService.on('order-update', (order: Order) => {
      logger.debug('Received order update:', order);
      
      // Show notification for order updates
      const message = `Order ${order.id} updated to ${order.status}`;
      if (order.status === 'FILLED') {
        toast.success(message);
      } else if (order.status === 'CANCELLED') {
        toast(message);
      } else if (order.status === 'REJECTED') {
        toast.error(message);
      }
      
      // Invalidate orders query
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    });

    socketService.on('order-filled', (order: Order) => {
      logger.info('Order filled:', order);
      toast.success(`Order ${order.id} filled at ${order.averagePrice}`);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['trade-history'] });
    });

    socketService.on('order-cancelled', (order: Order) => {
      logger.info('Order cancelled:', order);
      toast(`Order ${order.id} cancelled`);
      
      // Invalidate orders query
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });

    // Connection events
    socketService.on('disconnect', () => {
      logger.warn('WebSocket disconnected');
      toast.error('Real-time connection lost');
    });

    socketService.on('connect', () => {
      logger.info('WebSocket connected');
      toast.success('Real-time connection established');
    });

    socketService.on('connect_error', (error: any) => {
      logger.error('WebSocket connection error:', error);
      toast.error('Failed to establish real-time connection');
    });
  }, [queryClient]);

  const connect = useCallback(async () => {
    if (!token || !isAuthenticated) {
      logger.warn('Cannot connect WebSocket: no token or not authenticated');
      return;
    }

    try {
      await socketService.connect(token);
      setupEventListeners();
    } catch (error) {
      logger.error('Failed to connect WebSocket:', error);
      toast.error('Failed to connect to real-time data');
    }
  }, [token, isAuthenticated, setupEventListeners]);

  const disconnect = useCallback(() => {
    socketService.disconnect();
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  const subscribe = useCallback((symbols: string[]) => {
    socketService.subscribe(symbols);
  }, []);

  const unsubscribe = useCallback((symbols: string[]) => {
    socketService.unsubscribe(symbols);
  }, []);

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, token, connect, disconnect]);

  // Handle page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, disconnect to save resources
        disconnect();
      } else if (isAuthenticated && token) {
        // Page is visible, reconnect
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, token, connect, disconnect]);

  return {
    isConnected: socketService.isConnected,
    subscribedSymbols: socketService.subscribedSymbols,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
  };
}
