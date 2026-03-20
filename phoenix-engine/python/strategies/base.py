from abc import ABC, abstractmethod
from typing import Optional
import phoenix_engine as pe

class Strategy(ABC):
    """
    Base class for all trading strategies.
    
    This abstract base class provides the interface that all trading strategies must implement.
    Strategies receive market data ticks and can submit orders through the engine.
    """
    def __init__(self, name: str):
        self.name = name
        self.engine: Optional[pe.Engine] = None
        self.running = False

    @abstractmethod
    def on_tick(self, tick: pe.Tick) -> None:
        """
        Called on every market tick.
        
        Args:
            tick: The market tick data containing symbol, price, volume, and timestamp.
        """
        pass

    @abstractmethod
    def on_order_update(self, order: pe.Order) -> None:
        """
        Called when an order's status changes.
        
        Args:
            order: The order with updated status information.
        """
        pass

    def on_start(self) -> None:
        """
        Called when the strategy is started.
        
        Override this method to perform strategy initialization.
        """
        pass

    def on_stop(self) -> None:
        """
        Called when the strategy is stopped.
        
        Override this method to perform cleanup operations.
        """
        pass

    def set_engine(self, engine: pe.Engine) -> None:
        """
        Set the engine reference for this strategy.
        
        Args:
            engine: The trading engine instance.
        """
        self.engine = engine

    def start(self) -> None:
        """
        Start the strategy.
        
        This method should not be called directly; use StrategyRunner instead.
        """
        if not self.running:
            self.running = True
            self.on_start()

    def stop(self) -> None:
        """
        Stop the strategy.
        
        This method should not be called directly; use StrategyRunner instead.
        """
        if self.running:
            self.running = False
            self.on_stop()
