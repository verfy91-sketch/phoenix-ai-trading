import phoenix_engine as pe
from .base import Strategy

class RSIStrategy(Strategy):
    """
    Simple RSI mean reversion strategy.
    
    This strategy implements a classic mean reversion approach using the Relative Strength Index.
    It buys when RSI falls below the oversold threshold and sells when RSI rises
    above the overbought threshold.
    
    Args:
        name: Strategy name for identification
        symbol: Trading symbol (e.g., "BTC/USD")
        period: RSI calculation period (default: 14)
        oversold: RSI level considered oversold (default: 30)
        overbought: RSI level considered overbought (default: 70)
        quantity: Order quantity for trades (default: 1)
    """
    def __init__(self, name: str, symbol: str, period: int = 14,
                 oversold: int = 30, overbought: int = 70,
                 quantity: int = 1):
        super().__init__(name)
        self.symbol = symbol
        self.rsi = pe.RSI(period)
        self.oversold = oversold
        self.overbought = overbought
        self.quantity = quantity
        self.position = 0  # Current position tracking

    def on_tick(self, tick: pe.Tick) -> None:
        """
        Process incoming market tick and generate trading signals.
        
        Updates RSI indicator and checks for trading opportunities based on
        oversold/overbought conditions.
        """
        if tick.symbol != self.symbol:
            return
            
        # Update RSI with new price
        self.rsi.update(tick.price)
        rsi_val = self.rsi.value()
        
        if rsi_val is None:
            return  # Not enough data yet
            
        # Get current position from portfolio
        self.position = self.engine.get_portfolio().get_position(self.symbol)

        # Generate trading signals
        if rsi_val < self.oversold and self.position <= 0:
            # Buy signal - RSI oversold and we have no long position
            order = pe.Order()
            order.symbol = self.symbol
            order.side = pe.OrderSide.BUY
            order.type = pe.OrderType.MARKET
            order.quantity = self.quantity
            order.price = tick.price
            self.engine.get_order_manager().submit_order(order)
            
        elif rsi_val > self.overbought and self.position >= 0:
            # Sell signal - RSI overbought and we have no short position
            order = pe.Order()
            order.symbol = self.symbol
            order.side = pe.OrderSide.SELL
            order.type = pe.OrderType.MARKET
            order.quantity = self.quantity
            order.price = tick.price
            self.engine.get_order_manager().submit_order(order)

    def on_order_update(self, order: pe.Order) -> None:
        """
        Handle order status updates.
        
        In this implementation, position tracking is handled by the portfolio,
        so we mainly log order updates for monitoring.
        """
        # Could add custom logic here based on order fills, rejections, etc.
        pass

    def on_start(self) -> None:
        """
        Initialize strategy when started.
        """
        print(f"RSI Strategy '{self.name}' started for {self.symbol}")
        print(f"Parameters: Period={self.rsi.value()}, Oversold={self.oversold}, Overbought={self.overbought}")

    def on_stop(self) -> None:
        """
        Clean up when strategy is stopped.
        """
        print(f"RSI Strategy '{self.name}' stopped")
