"""
Remote Engine client for Phoenix AI Trading System IPC.

This module provides a TCP client that mimics the local Engine API
but communicates with the C++ engine over TCP using JSON messages.
"""

import socket
import json
import threading
import queue
import time
from typing import Optional, Callable, Dict, Any, List
from .messages import (
    MessageTypes, RequestMethods, make_request, parse_message,
    tick_from_dict, portfolio_from_dict, risk_status_from_dict, stats_from_dict
)


class RemoteEngine:
    """
    Remote Engine client that connects to Phoenix C++ engine via TCP.
    
    This class provides the same interface as the local Engine class
    but communicates over the network using JSON messages.
    """
    
    def __init__(self, host: str = 'localhost', port: int = 5555):
        """
        Initialize RemoteEngine.
        
        Args:
            host: Engine host address (default: localhost)
            port: Engine port number (default: 5555)
        """
        self.host = host
        self.port = port
        self.sock: Optional[socket.socket] = None
        self.request_id = 0
        self.pending: Dict[int, queue.Queue] = {}
        self.tick_callbacks: List[Callable] = []
        self.running = False
        self.recv_thread: Optional[threading.Thread] = None
        self._connect()
    
    def _connect(self) -> None:
        """Connect to the engine server."""
        try:
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.sock.connect((self.host, self.port))
            self.running = True
            self.recv_thread = threading.Thread(target=self._receive_loop, daemon=True)
            self.recv_thread.start()
            print(f"Connected to Phoenix engine at {self.host}:{self.port}")
        except Exception as e:
            raise ConnectionError(f"Failed to connect to engine: {e}")
    
    def _receive_loop(self) -> None:
        """Main receive loop for incoming messages."""
        buffer = ""
        while self.running:
            try:
                data = self.sock.recv(4096).decode('utf-8')
                if not data:
                    break
                buffer += data
                
                # Process complete messages (JSON objects separated by newlines)
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    msg = parse_message(line)
                    if msg:
                        self._handle_message(msg)
            except Exception as e:
                print(f"Receive error: {e}")
                break
        
        self.running = False
    
    def _handle_message(self, msg: Dict[str, Any]) -> None:
        """Handle incoming message."""
        msg_type = msg.get("type")
        
        if msg_type == MessageTypes.TICK:
            # Streaming tick data
            tick_data = msg.get("data", {})
            tick = tick_from_dict(tick_data)
            for callback in self.tick_callbacks:
                callback(tick)
        
        elif msg_type == MessageTypes.RESPONSE:
            # Response to a request
            request_id = msg.get("id")
            if request_id in self.pending:
                self.pending[request_id].put(msg)
        
        elif msg_type == MessageTypes.ORDER_UPDATE:
            # Order update notification
            # Could be handled with callbacks if needed
            pass
    
    def _call(self, method: str, params: Dict[str, Any], timeout: float = 5.0) -> Any:
        """
        Make a synchronous call to the engine.
        
        Args:
            method: RPC method name
            params: Method parameters
            timeout: Request timeout in seconds
            
        Returns:
            Result from the engine
            
        Raises:
            Exception: On timeout or error response
        """
        self.request_id += 1
        request_id = self.request_id
        
        req = make_request(method, params, request_id)
        q = queue.Queue()
        self.pending[request_id] = q
        
        try:
            message = json.dumps(req) + "\n"
            self.sock.sendall(message.encode('utf-8'))
            
            resp = q.get(timeout=timeout)
            if resp.get("error"):
                raise Exception(resp["error"])
            return resp.get("result")
        except queue.Empty:
            raise TimeoutError(f"Request {method} timed out after {timeout}s")
        finally:
            self.pending.pop(request_id, None)
    
    def subscribe_ticks(self, callback: Callable) -> None:
        """
        Subscribe to tick data.
        
        Args:
            callback: Function to call for each tick
        """
        self.tick_callbacks.append(callback)
        # Tell engine we want ticks
        try:
            self._call(RequestMethods.SUBSCRIBE_TICKS, {})
        except Exception as e:
            print(f"Failed to subscribe to ticks: {e}")
    
    def unsubscribe_ticks(self) -> None:
        """Unsubscribe from tick data."""
        try:
            self._call(RequestMethods.UNSUBSCRIBE_TICKS, {})
        except Exception as e:
            print(f"Failed to unsubscribe from ticks: {e}")
    
    def start(self) -> None:
        """Start the engine (no-op for remote engine)."""
        # Engine is already started on server side
        pass
    
    def stop(self) -> None:
        """Stop the remote engine and close connection."""
        self.running = False
        if self.sock:
            self.sock.close()
        if self.recv_thread and self.recv_thread.is_alive():
            self.recv_thread.join(timeout=1.0)
    
    def submit_order(self, order_params: Dict[str, Any]) -> int:
        """
        Submit an order to the engine.
        
        Args:
            order_params: Order parameters (symbol, side, type, price, quantity)
            
        Returns:
            Order ID
            
        Raises:
            Exception: On submission error
        """
        return self._call(RequestMethods.SUBMIT_ORDER, order_params)
    
    def cancel_order(self, order_id: int) -> bool:
        """
        Cancel an order.
        
        Args:
            order_id: Order ID to cancel
            
        Returns:
            True if cancellation successful
            
        Raises:
            Exception: On cancellation error
        """
        return self._call(RequestMethods.CANCEL_ORDER, {"order_id": order_id})
    
    def get_portfolio(self) -> Dict[str, Any]:
        """
        Get current portfolio snapshot.
        
        Returns:
            Portfolio data (balance, positions, PnL, etc.)
            
        Raises:
            Exception: On error
        """
        result = self._call(RequestMethods.GET_PORTFOLIO, {})
        return portfolio_from_dict(result).__dict__ if result else {}
    
    def get_risk_status(self) -> Dict[str, Any]:
        """
        Get current risk management status.
        
        Returns:
            Risk status data (limits, current usage, etc.)
            
        Raises:
            Exception: On error
        """
        result = self._call(RequestMethods.GET_RISK_STATUS, {})
        return risk_status_from_dict(result).__dict__ if result else {}
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get engine statistics.
        
        Returns:
            Engine statistics (uptime, orders processed, etc.)
            
        Raises:
            Exception: On error
        """
        result = self._call(RequestMethods.GET_STATS, {})
        return stats_from_dict(result).__dict__ if result else {}
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.stop()
