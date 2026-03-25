import { Socket, createConnection } from 'net';
import { EventEmitter } from 'events';

interface RequestResponse {
  id: number;
  success: boolean;
  data?: any;
  error?: string;
}

interface EngineMessage {
  type: string;
  data?: any;
  request_id?: number;
  method?: string;
  params?: any;
  success?: boolean;
  error?: string;
}

export class IpcClient extends EventEmitter {
  private socket: Socket | null = null;
  private requestId: number = 0;
  private pendingRequests: Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private enabled: boolean = true;

  constructor(
    private host: string = 'localhost',
    private port: number = 5555
  ) {
    super();
    
    // Check if trading engine should be enabled
    this.enabled = process.env.ENABLE_TRADING_ENGINE !== 'false';
    if (!this.enabled) {
      console.log('Trading engine disabled - running without engine connection');
      return;
    }
  }

  async connect(): Promise<void> {
    if (!this.enabled) {
      console.log('Trading engine connection disabled');
      return;
    }

    return new Promise((resolve, reject) => {
      this.socket = createConnection(this.port, this.host);

      this.socket.on('connect', () => {
        console.log(`Connected to Phoenix engine at ${this.host}:${this.port}`);
        this.connected = true;
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('data', (data) => {
        this.handleData(data);
      });

      this.socket.on('error', (error) => {
        console.warn('Trading engine connection error (non-fatal):', error);
        if (!this.enabled) {
          return; // Don't reject if engine is disabled
        }
        if (!this.connected) {
          reject(new Error(`Failed to connect to engine: ${(error as Error).message}`));
        }
      });

      this.socket.on('close', () => {
        console.log('Disconnected from engine');
        this.connected = false;
        if (this.enabled) {
          this.handleReconnect();
        }
      });

      this.socket.on('timeout', () => {
        console.warn('Trading engine socket timeout (non-fatal)');
        if (this.enabled) {
          this.socket?.destroy();
        }
      });
    });
  }

  private handleReconnect(): void {
    if (!this.enabled || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Trading engine reconnection disabled or max attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch((error) => {
        console.warn('Trading engine reconnect failed (non-fatal):', error);
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private handleData(data: Buffer): void {
    const messages = data.toString().split('\n').filter(msg => msg.trim());
    
    for (const messageStr of messages) {
      if (!messageStr) continue;
      
      try {
        const message: EngineMessage = JSON.parse(messageStr);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse message:', messageStr, error);
      }
    }
  }

  private handleMessage(message: EngineMessage): void {
    if (message.request_id !== undefined) {
      // This is a response to a request
      const pending = this.pendingRequests.get(message.request_id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.request_id);
        
        if (message.success) {
          pending.resolve(message.data);
        } else {
          pending.reject(new Error(message.error || 'Unknown error'));
        }
      }
    } else {
      // This is a streaming message (tick, order update, etc.)
      this.emit('message', message);
    }
  }

  async sendRequest(method: string, params: any = {}): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to engine');
    }

    return new Promise((resolve, reject) => {
      const requestId = ++this.requestId;
      const request: EngineMessage = {
        type: 'request',
        request_id: requestId,
        method,
        params,
      };

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, 10000); // 10 second timeout

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      const messageStr = JSON.stringify(request) + '\n';
      this.socket?.write(messageStr);
    });
  }

  async submitOrder(orderParams: any): Promise<any> {
    return this.sendRequest('submitOrder', orderParams);
  }

  async cancelOrder(orderId: number): Promise<any> {
    return this.sendRequest('cancelOrder', { order_id: orderId });
  }

  async getPortfolio(): Promise<any> {
    return this.sendRequest('getPortfolio');
  }

  async subscribeToTicks(): Promise<any> {
    return this.sendRequest('subscribeTicks');
  }

  async unsubscribeFromTicks(): Promise<any> {
    return this.sendRequest('unsubscribeTicks');
  }

  async getRiskStatus(): Promise<any> {
    return this.sendRequest('getRiskStatus');
  }

  async getStats(): Promise<any> {
    return this.sendRequest('getStats');
  }

  isConnected(): boolean {
    return this.connected;
  }

  close(): void {
    // Clear all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();

    this.socket?.destroy();
    this.connected = false;
  }
}

export const ipcClient = new IpcClient();
