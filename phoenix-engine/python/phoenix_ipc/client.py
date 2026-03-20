"""
Phoenix AI Trading System - Remote Engine Client

This module provides a RemoteEngine class that mimics the local phoenix_engine.Engine interface
but communicates over ZeroMQ with Cap'n Proto serialization for distributed operation.
"""

import zmq
import threading
import time
from typing import Optional, Callable, Dict, Any
import json

class RemoteEngine:
    """
    Remote engine client that connects to a Phoenix trading engine via ZeroMQ.
    
    This class provides the same interface as the local Engine class but communicates
    over IPC/TCP sockets, allowing strategies to run in separate processes.
    """
    
    def __init__(self, 
                 market_data_url="ipc:///tmp/phoenix_market_data",
                 orders_url="ipc:///tmp/phoenix_orders",
                 control_url="ipc:///tmp/phoenix_control",
                 context: Optional[zmq.Context] = None):
        """
        Initialize remote engine client.
        
        Args:
            market_data_url: ZeroMQ endpoint for market data (SUB socket)
            orders_url: ZeroMQ endpoint for order requests (REQ socket)
            control_url: ZeroMQ endpoint for control commands (REQ socket)
            context: Optional ZeroMQ context (creates new if None)
        """
        self.market_data_url = market_data_url
        self.orders_url = orders_url
        self.control_url = control_url
        
        # Create or use provided context
        self.context = context or zmq.Context()
        
        # Create sockets
        self.sub_socket = self.context.socket(zmq.SUB)
        self.req_socket = self.context.socket(zmq.REQ)
        self.control_socket = self.context.socket(zmq.REQ)
        
        # Thread management
        self.running = False
        self.tick_callbacks = []
        self.tick_thread = None
        
        # Order management
        self.pending_orders = {}
        self.order_counter = 0
        self.order_lock = threading.Lock()
        
        # Statistics
        self.stats = {
            'ticks_received': 0,
            'orders_sent': 0,
            'order_updates': 0,
            'control_requests': 0,
            'connected_at': time.time()
        }

    def connect(self) -> bool:
        """
        Connect to all ZeroMQ endpoints.
        
        Returns:
            True if all connections successful, False otherwise
        """
        try:
            # Connect to market data
            self.sub_socket.connect(self.market_data_url)
            self.sub_socket.setsockopt_string(zmq.SUBSCRIBE, "")
            
            # Connect to orders
            self.req_socket.connect(self.orders_url)
            
            # Connect to control
            self.control_socket.connect(self.control_url)
            
            return True
            
        except zmq.ZMQError as e:
            print(f"Failed to connect: {e}")
            return False

    def disconnect(self):
        """Disconnect from all endpoints and clean up resources."""
        self.stop()
        
        try:
            self.sub_socket.close()
            self.req_socket.close()
            self.control_socket.close()
        except zmq.ZMQError:
            pass

    def subscribe_ticks(self, callback: Callable[[Dict[str, Any]], None]):
        """
        Register a callback to be called on every market data tick.
        
        Args:
            callback: Function that receives tick data as dictionary
        """
        self.tick_callbacks.append(callback)

    def start(self):
        """Start the tick processing thread."""
        if self.running:
            return
            
        self.running = True
        self.tick_thread = threading.Thread(target=self._poll_ticks, daemon=True)
        self.tick_thread.start()

    def stop(self):
        """Stop the tick processing thread."""
        self.running = False
        if self.tick_thread and self.tick_thread.is_alive():
            self.tick_thread.join(timeout=1.0)

    def _poll_ticks(self):
        """Background thread that polls for ticks and calls callbacks."""
        while self.running:
            try:
                # Non-blocking receive
                msg = self.sub_socket.recv(flags=zmq.NOBLOCK)
                tick_data = self._parse_tick_message(msg)
                
                if tick_data:
                    self.stats['ticks_received'] += 1
                    for callback in self.tick_callbacks:
                        try:
                            callback(tick_data)
                        except Exception as e:
                            print(f"Error in tick callback: {e}")
                            
            except zmq.Again:
                # No message available
                time.sleep(0.001)  # Small sleep to prevent busy loop
            except Exception as e:
                print(f"Error in tick polling: {e}")

    def _parse_tick_message(self, msg: bytes) -> Optional[Dict[str, Any]]:
        """
        Parse tick message from binary format.
        
        Args:
            msg: Raw message bytes
            
        Returns:
            Parsed tick data as dictionary or None if parsing failed
        """
        try:
            # For now, parse simple text format
            text = msg.decode('utf-8')
            parts = text.split()
            
            if len(parts) >= 5 and parts[0] == "TICK":
                return {
                    'symbol': parts[1],
                    'price': float(parts[2]),
                    'volume': int(parts[3]),
                    'timestamp_ns': int(parts[4])
                }
                
        except Exception as e:
            print(f"Failed to parse tick message: {e}")
            
        return None

    def submit_order(self, order: Dict[str, Any]) -> Optional[int]:
        """
        Submit an order to the remote engine.
        
        Args:
            order: Order dictionary with keys: symbol, side, type, price, quantity
            
        Returns:
            Order ID if successful, None otherwise
        """
        try:
            with self.order_lock:
                self.order_counter += 1
                order_id = self.order_counter
            
            # Create order request message
            order_req = f"ORDER_REQUEST {order.get('symbol', '')} {order.get('side', 0)} " \
                      f"{order.get('type', 0)} {order.get('price', 0.0)} {order.get('quantity', 0)}"
            
            # Send request
            self.req_socket.send_string(order_req)
            
            # Wait for response
            response = self.req_socket.recv_string()
            
            if response.startswith("ORDER_UPDATE"):
                self.stats['orders_sent'] += 1
                # Parse order ID from response
                parts = response.split()
                if len(parts) >= 2:
                    return int(parts[1])
                    
        except Exception as e:
            print(f"Failed to submit order: {e}")
            
        return None

    def get_portfolio(self) -> Optional[Dict[str, Any]]:
        """
        Get current portfolio snapshot.
        
        Returns:
            Portfolio data as dictionary or None if failed
        """
        return self._send_control_request("GET_PORTFOLIO")

    def get_risk_status(self) -> Optional[Dict[str, Any]]:
        """
        Get current risk management status.
        
        Returns:
            Risk status as dictionary or None if failed
        """
        return self._send_control_request("GET_RISK_STATUS")

    def get_stats(self) -> Dict[str, Any]:
        """
        Get IPC statistics.
        
        Returns:
            Statistics dictionary
        """
        # Update runtime
        self.stats['runtime'] = time.time() - self.stats['connected_at']
        return self.stats.copy()

    def _send_control_request(self, request: str) -> Optional[Dict[str, Any]]:
        """
        Send a control request and parse response.
        
        Args:
            request: Control request string
            
        Returns:
            Parsed response data or None if failed
        """
        try:
            self.control_socket.send_string(request)
            response = self.control_socket.recv_string()
            self.stats['control_requests'] += 1
            
            # Try to parse as JSON first
            try:
                return json.loads(response)
            except json.JSONDecodeError:
                # Return as string if not JSON
                return {'response': response}
                
        except Exception as e:
            print(f"Failed to send control request: {e}")
            return None

    def __enter__(self):
        """Context manager entry."""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.disconnect()

    def __del__(self):
        """Destructor."""
        try:
            self.disconnect()
        except:
            pass  # Ignore errors during cleanup
