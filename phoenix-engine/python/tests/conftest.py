import pytest
import phoenix_engine as pe

@pytest.fixture
def engine():
    """Create a fresh engine instance for each test."""
    eng = pe.Engine()
    eng.init()
    yield eng
    eng.stop()

@pytest.fixture
def order():
    """Create a sample order for testing."""
    order = pe.Order()
    order.symbol = "BTC/USD"
    order.side = pe.OrderSide.BUY
    order.type = pe.OrderType.MARKET
    order.quantity = 1
    order.price = 50000.0
    return order
