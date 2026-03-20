"""
IPC-enabled strategy runner for Phoenix AI Trading System.

This module provides a strategy runner that uses the RemoteEngine to connect
to a separate Phoenix engine process and execute trading strategies.
"""

import sys
import time
import signal
import threading
from typing import List, Optional
from phoenix_ipc import RemoteEngine
from strategies.base import Strategy


class IpcStrategyRunner:
    """
    Strategy runner that manages multiple strategies using a remote engine connection.
    
    This runner connects to a Phoenix engine via TCP and manages strategy execution,
    tick distribution, and order submission across multiple strategies.
    """
    
    def __init__(self, host: str = 'localhost', port: int = 5555):
        """
        Initialize IPC strategy runner.
        
        Args:
            host: Engine host address
            port: Engine port number
        """
        self.engine = RemoteEngine(host, port)
        self.strategies: List[Strategy] = []
        self.running = False
        self.tick_count = 0
        self.start_time = 0
        self._setup_signal_handlers()
    
    def _setup_signal_handlers(self) -> None:
        """Setup signal handlers for graceful shutdown."""
        def signal_handler(signum, frame):
            print(f"\nReceived signal {signum}, shutting down gracefully...")
            self.stop()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    def add_strategy(self, strategy: Strategy) -> None:
        """
        Add a strategy to the runner.
        
        Args:
            strategy: Strategy instance to add
        """
        self.strategies.append(strategy)
        print(f"Added strategy: {strategy.name}")
    
    def start(self) -> bool:
        """
        Start the strategy runner and connect to engine.
        
        Returns:
            True if started successfully, False otherwise
        """
        try:
            print(f"Connecting to Phoenix engine at {self.engine.host}:{self.engine.port}...")
            self.engine.subscribe_ticks(self._on_tick)
            self.engine.start()
            
            # Initialize all strategies
            for strategy in self.strategies:
                strategy.on_start()
                print(f"Initialized strategy: {strategy.name}")
            
            self.running = True
            self.start_time = time.time()
            print(f"Strategy runner started with {len(self.strategies)} strategies")
            return True
            
        except Exception as e:
            print(f"Failed to start strategy runner: {e}")
            return False
    
    def stop(self) -> None:
        """Stop the strategy runner and cleanup."""
        if not self.running:
            return
        
        print("Stopping strategy runner...")
        
        # Stop all strategies
        for strategy in self.strategies:
            try:
                strategy.on_stop()
                print(f"Stopped strategy: {strategy.name}")
            except Exception as e:
                print(f"Error stopping strategy {strategy.name}: {e}")
        
        # Stop engine connection
        self.engine.stop()
        self.running = False
        
        if self.start_time > 0:
            elapsed = time.time() - self.start_time
            print(f"Runner stopped. Runtime: {elapsed:.2f}s, Ticks processed: {self.tick_count}")
    
    def _on_tick(self, tick) -> None:
        """
        Handle incoming tick and distribute to strategies.
        
        Args:
            tick: Market data tick
        """
        self.tick_count += 1
        
        # Distribute tick to all strategies
        for strategy in self.strategies:
            try:
                strategy.on_tick(tick)
            except Exception as e:
                print(f"Error in strategy {strategy.name}: {e}")
    
    def submit_order(self, order_params: dict) -> Optional[int]:
        """
        Submit an order through the remote engine.
        
        Args:
            order_params: Order parameters
            
        Returns:
            Order ID if successful, None otherwise
        """
        try:
            order_id = self.engine.submit_order(order_params)
            print(f"Order submitted: ID={order_id}, Symbol={order_params.get('symbol')}")
            return order_id
        except Exception as e:
            print(f"Failed to submit order: {e}")
            return None
    
    def cancel_order(self, order_id: int) -> bool:
        """
        Cancel an order through the remote engine.
        
        Args:
            order_id: Order ID to cancel
            
        Returns:
            True if cancellation successful
        """
        try:
            success = self.engine.cancel_order(order_id)
            if success:
                print(f"Order cancelled: ID={order_id}")
            else:
                print(f"Failed to cancel order: ID={order_id}")
            return success
        except Exception as e:
            print(f"Error cancelling order {order_id}: {e}")
            return False
    
    def get_portfolio(self) -> dict:
        """
        Get current portfolio from remote engine.
        
        Returns:
            Portfolio data dictionary
        """
        try:
            return self.engine.get_portfolio()
        except Exception as e:
            print(f"Failed to get portfolio: {e}")
            return {}
    
    def get_risk_status(self) -> dict:
        """
        Get current risk status from remote engine.
        
        Returns:
            Risk status dictionary
        """
        try:
            return self.engine.get_risk_status()
        except Exception as e:
            print(f"Failed to get risk status: {e}")
            return {}
    
    def get_stats(self) -> dict:
        """
        Get engine statistics from remote engine.
        
        Returns:
            Engine statistics dictionary
        """
        try:
            return self.engine.get_stats()
        except Exception as e:
            print(f"Failed to get stats: {e}")
            return {}
    
    def wait_for_completion(self, timeout: Optional[float] = None) -> None:
        """
        Wait for runner completion or timeout.
        
        Args:
            timeout: Maximum time to wait in seconds (None for infinite)
        """
        start_time = time.time()
        
        while self.running:
            if timeout and (time.time() - start_time) > timeout:
                print(f"Timeout reached after {timeout}s")
                break
            
            time.sleep(0.1)
    
    def print_status(self) -> None:
        """Print current runner status."""
        if not self.running:
            print("Strategy runner is not running")
            return
        
        elapsed = time.time() - self.start_time if self.start_time > 0 else 0
        print(f"Runner Status:")
        print(f"  Running: {self.running}")
        print(f"  Strategies: {len(self.strategies)}")
        print(f"  Ticks processed: {self.tick_count}")
        print(f"  Runtime: {elapsed:.2f}s")
        print(f"  Ticks/second: {self.tick_count / max(elapsed, 0.001):.1f}")
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.stop()


def main():
    """Example usage of IpcStrategyRunner."""
    from strategies.rsi_example import RSIStrategy
    
    # Create strategy runner
    runner = IpcStrategyRunner()
    
    # Add strategies
    rsi_strategy = RSIStrategy("rsi_strategy", "BTC/USD", quantity=1)
    runner.add_strategy(rsi_strategy)
    
    # Start the runner
    if runner.start():
        try:
            # Run for specified time or until interrupted
            runner.wait_for_completion(timeout=60)  # Run for 60 seconds
        except KeyboardInterrupt:
            pass
        finally:
            runner.stop()


if __name__ == "__main__":
    main()
