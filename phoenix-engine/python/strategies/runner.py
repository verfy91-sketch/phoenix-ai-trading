import threading
from typing import List
import phoenix_engine as pe
from .base import Strategy

class StrategyRunner:
    """
    Manages multiple strategies attached to a single engine.
    
    This class coordinates the execution of multiple trading strategies by setting up
    a Python callback that dispatches market ticks to all active strategies.
    It handles the lifecycle of strategies and ensures proper thread safety.
    """
    def __init__(self, engine: pe.Engine):
        self.engine = engine
        self.strategies: List[Strategy] = []
        self.running = False

        # Define the callback that will be called from C++ on each tick
        def tick_callback(tick: pe.Tick):
            if not self.running:
                return
            # Dispatch tick to all running strategies
            for strategy in self.strategies:
                if strategy.running:
                    strategy.on_tick(tick)

        # Register the callback with the engine
        self.engine.set_tick_callback(tick_callback)

    def add_strategy(self, strategy: Strategy) -> None:
        """
        Add a strategy to the runner.
        
        Args:
            strategy: The strategy instance to add.
        """
        strategy.set_engine(self.engine)
        self.strategies.append(strategy)

    def start(self) -> None:
        """
        Start the runner and all registered strategies.
        
        This method starts the engine and all strategies, beginning the
        market data processing and trading logic execution.
        """
        if self.running:
            return
            
        self.running = True
        
        # Start all strategies
        for strategy in self.strategies:
            strategy.start()
            
        # Start the engine (this will begin processing ticks)
        self.engine.start()

    def stop(self) -> None:
        """
        Stop the runner and all registered strategies.
        
        This method stops the engine and all strategies, performing
        any necessary cleanup.
        """
        if not self.running:
            return
            
        self.running = False
        
        # Stop all strategies
        for strategy in self.strategies:
            strategy.stop()
            
        # Stop the engine
        self.engine.stop()
