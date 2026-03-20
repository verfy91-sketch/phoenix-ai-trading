import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { ipcClient } from '../../config/ipc';
import { logger } from '../../config/logger';
import { redisService } from '../../config/redis';

interface ConnectedClient {
  id: string;
  userId?: string;
  subscriptions: Set<string>;
}

class TradingWebSocket {
  private io: SocketIOServer;
  private connectedClients: Map<string, ConnectedClient> = new Map();

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production' ? false : ["http://localhost:3000"],
      },
      transports: ['websocket'],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.info('WebSocket client connected', { socketId: socket.id });

      const client: ConnectedClient = {
        id: socket.id,
        subscriptions: new Set(),
      };

      this.connectedClients.set(socket.id, client);

      socket.on('authenticate', async (data) => {
        try {
          // Here you would verify JWT token
          // For now, just mark as authenticated
          client.userId = data.userId;
          
          socket.emit('authenticated', { success: true });
          logger.info('WebSocket client authenticated', { socketId: socket.id, userId: data.userId });
        } catch (error) {
          socket.emit('authentication_error', { error: 'Authentication failed' });
        }
      });

      socket.on('subscribe', (data) => {
        if (!client.userId) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        const { symbol } = data;
        if (!symbol) {
          socket.emit('error', { message: 'Symbol is required' });
          return;
        }

        client.subscriptions.add(symbol);
        socket.emit('subscribed', { symbol });
        logger.info('Client subscribed to symbol', { socketId: socket.id, symbol });
      });

      socket.on('unsubscribe', (data) => {
        const { symbol } = data;
        client.subscriptions.delete(symbol);
        socket.emit('unsubscribed', { symbol });
        logger.info('Client unsubscribed from symbol', { socketId: socket.id, symbol });
      });

      socket.on('disconnect', () => {
        logger.info('WebSocket client disconnected', { socketId: socket.id });
        this.connectedClients.delete(socket.id);
      });

      socket.on('error', (error) => {
        logger.error('WebSocket error:', { socketId: socket.id, error });
      });
    });

    // Set up IPC client for market data
    this.setupMarketDataStreaming();
  }

  private async setupMarketDataStreaming(): Promise<void> {
    try {
      await ipcClient.connect();

      // Subscribe to ticks from engine
      await ipcClient.subscribeToTicks();

      // Handle incoming tick data
      ipcClient.on('message', (message) => {
        if (message.type === 'tick') {
          this.broadcastTick(message.data);
        } else if (message.type === 'order_update') {
          this.broadcastOrderUpdate(message.data);
        }
      });

      logger.info('Market data streaming started');
    } catch (error) {
      logger.error('Failed to start market data streaming:', error);
    }
  }

  private broadcastTick(tickData: any): void {
    // Send to all subscribed clients
    for (const [socketId, client] of this.connectedClients) {
      if (client.subscriptions.has(tickData.symbol)) {
        this.io.to(socketId).emit('tick', {
          symbol: tickData.symbol,
          price: tickData.price,
          volume: tickData.volume,
          timestamp: tickData.timestamp_ns,
        });
      }
    }
  }

  private broadcastOrderUpdate(orderUpdate: any): void {
    // Send to relevant user
    for (const [socketId, client] of this.connectedClients) {
      // Here you would check if this order belongs to this user
      // For now, broadcast to all authenticated clients
      if (client.userId) {
        this.io.to(socketId).emit('order_update', orderUpdate);
      }
    }
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  getAuthenticatedClientsCount(): number {
    return Array.from(this.connectedClients.values()).filter(client => client.userId).length;
  }
}

export { TradingWebSocket };
