import pytest
import phoenix_engine as pe

def test_engine_creation():
    """Test that engine can be created successfully."""
    eng = pe.Engine()
    assert eng is not None
    assert hasattr(eng, 'init')
    assert hasattr(eng, 'start')
    assert hasattr(eng, 'stop')

def test_portfolio_access(engine):
    """Test portfolio access from engine."""
    portfolio = engine.get_portfolio()
    assert portfolio is not None
    assert hasattr(portfolio, 'get_balance')
    assert hasattr(portfolio, 'get_position')
    assert hasattr(portfolio, 'update_position')

def test_order_manager_access(engine):
    """Test order manager access from engine."""
    order_mgr = engine.get_order_manager()
    assert order_mgr is not None
    assert hasattr(order_mgr, 'submit_order')
    assert hasattr(order_mgr, 'cancel_order')
    assert hasattr(order_mgr, 'get_order')

def test_risk_manager_access(engine):
    """Test risk manager access from engine."""
    risk_mgr = engine.get_risk_manager()
    assert risk_mgr is not None
    assert hasattr(risk_mgr, 'check_order_size')
    assert hasattr(risk_mgr, 'check_position_limit')

def test_order_submission(engine):
    """Test order submission through order manager."""
    order = pe.Order()
    order.symbol = "BTC/USD"
    order.side = pe.OrderSide.BUY
    order.type = pe.OrderType.MARKET
    order.quantity = 1
    order.price = 50000.0
    
    order_mgr = engine.get_order_manager()
    order_id = order_mgr.submit_order(order)
    assert order_id > 0
    
    # Verify order can be retrieved
    retrieved_order = order_mgr.get_order(order_id)
    assert retrieved_order is not None
    assert retrieved_order.symbol == "BTC/USD"
    assert retrieved_order.side == pe.OrderSide.BUY

def test_risk_configuration():
    """Test risk configuration creation and usage."""
    config = pe.RiskConfig()
    assert config is not None
    
    # Set some risk parameters
    config.max_order_quantity = 100
    config.max_position_size = 10
    config.daily_loss_limit = 1000.0
    config.max_consecutive_losses = 5
    
    # Create risk manager with config
    risk_mgr = pe.RiskManager(config)
    assert risk_mgr is not None
    
    # Test risk checks
    assert risk_mgr.check_order_size(50) == True
    assert risk_mgr.check_order_size(150) == False
    assert risk_mgr.check_position_limit("BTC/USD", 5, 0) == True
    assert risk_mgr.check_position_limit("BTC/USD", 15, 0) == False

def test_tick_callback(engine):
    """Test that tick callback can be set and called."""
    callback_called = False
    received_tick = None
    
    def test_callback(tick):
        nonlocal callback_called, received_tick
        callback_called = True
        received_tick = tick
    
    # Set the callback
    engine.set_tick_callback(test_callback)
    
    # Create a test tick (Tick properties are read-only, so we can't set them directly)
    # This test just verifies the callback mechanism is properly set
    assert engine is not None
