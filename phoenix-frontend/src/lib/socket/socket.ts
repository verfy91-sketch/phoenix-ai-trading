import { io, Socket } from 'socket.io-client';
import { MarketData, Order } from '@/types/trading';
import { logger } from '@/lib/utils/logger';

export interface SocketEvents {
  // Market data
  'market-data': (data: MarketData) => void;
  'tick': (data: MarketData) => void;
  
  // Orders
  'order-update': (order: Order) => void;
  'order-filled': (order: Order) => void;
  'order-cancelled': (order: Order) => void;
  
  // Connection
  'connect': () => void;
  'disconnect': () => void;
  'connect_error': (error: any) => void;
  'error': (error: any) => void;
  
  // Authentication
  'authenticated': () => void;
  'authentication_error': (error: any) => void;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscriptions = new Set<string>();

  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
      
      this.socket = io(wsUrl, {
        auth: token ? { token } : undefined,
        transports: ['websocket'],
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        logger.info('WebSocket connected');
        this.reconnectAttempts = 0;
        
        // Re-subscribe to previous subscriptions
        if (this.subscriptions.size > 0) {
          this.subscribe(Array.from(this.subscriptions));
        }
        
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        logger.warn('WebSocket disconnected:', reason);
        this.handleReconnect();
      });

      this.socket.on('error', (error) => {
        logger.error('WebSocket error:', error);
        if (this.reconnectAttempts === 0) {
          reject(error);
        }
      });

      this.socket.on('authenticated', () => {
        logger.info('WebSocket authenticated');
      });

      this.socket.on('authentication_error', (error) => {
        logger.error('WebSocket authentication failed:', error);
        reject(error);
      });
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }, delay);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.subscriptions.clear();
  }

  subscribe(symbols: string[]): void {
    if (!this.socket?.connected) {
      logger.warn('Cannot subscribe: WebSocket not connected');
      return;
    }

    this.socket.emit('subscribe', { symbols });
    symbols.forEach(symbol => this.subscriptions.add(symbol));
    logger.info(`Subscribed to symbols:`, symbols);
  }

  unsubscribe(symbols: string[]): void {
    if (!this.socket?.connected) {
      logger.warn('Cannot unsubscribe: WebSocket not connected');
      return;
    }

    this.socket.emit('unsubscribe', { symbols });
    symbols.forEach(symbol => this.subscriptions.delete(symbol));
    logger.info(`Unsubscribed from symbols:`, symbols);
  }

  authenticate(token: string): void {
    if (!this.socket?.connected) {
      logger.warn('Cannot authenticate: WebSocket not connected');
      return;
    }

    this.socket.emit('authenticate', { token });
  }

  on<K extends keyof SocketEvents>(event: K, listener: SocketEvents[K]): void {
    if (this.socket) {
      this.socket.on(event, listener as any);
    }
  }

  off<K extends keyof SocketEvents>(event: K, listener: SocketEvents[K]): void {
    if (this.socket) {
      this.socket.off(event, listener as any);
    }
  }

  get isConnected(): boolean {
    return this.socket?.connected || false;
  }

  get subscribedSymbols(): string[] {
    return Array.from(this.subscriptions);
  }
}

export const socketService = new SocketService();
