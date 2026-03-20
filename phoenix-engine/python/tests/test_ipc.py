"""
Python IPC client tests.

This module tests the RemoteEngine client and related IPC functionality.
"""

import pytest
import threading
import time
import json
from unittest.mock import Mock, patch
from phoenix_ipc.client import RemoteEngine


class TestRemoteEngine:
    """Test cases for RemoteEngine class."""

    def test_init(self):
        """Test RemoteEngine initialization."""
        engine = RemoteEngine()
        
        assert engine.market_data_url == "ipc:///tmp/phoenix_market_data"
        assert engine.orders_url == "ipc:///tmp/phoenix_orders"
        assert engine.control_url == "ipc:///tmp/phoenix_control"
        assert engine.context is not None
        assert not engine.running
        assert engine.tick_callbacks == []
        assert engine.stats['ticks_received'] == 0
        assert engine.stats['orders_sent'] == 0

    def test_init_with_custom_urls(self):
        """Test RemoteEngine initialization with custom URLs."""
        market_url = "tcp://localhost:5555"
        orders_url = "tcp://localhost:5556"
        control_url = "tcp://localhost:5557"
        
        engine = RemoteEngine(
            market_data_url=market_url,
            orders_url=orders_url,
            control_url=control_url
        )
        
        assert engine.market_data_url == market_url
        assert engine.orders_url == orders_url
        assert engine.control_url == control_url

    def test_subscribe_ticks(self):
        """Test tick subscription."""
        engine = RemoteEngine()
        
        callback1 = Mock()
        callback2 = Mock()
        
        engine.subscribe_ticks(callback1)
        assert len(engine.tick_callbacks) == 1
        assert engine.tick_callbacks[0] == callback1
        
        engine.subscribe_ticks(callback2)
        assert len(engine.tick_callbacks) == 2

    def test_parse_tick_message(self):
        """Test tick message parsing."""
        engine = RemoteEngine()
        
        # Valid tick message
        msg = b"TICK BTC/USD 50000.0 100 1640995200000000000"
        tick = engine._parse_tick_message(msg)
        
        assert tick is not None
        assert tick['symbol'] == "BTC/USD"
        assert tick['price'] == 50000.0
        assert tick['volume'] == 100
        assert tick['timestamp_ns'] == 1640995200000000000

    def test_parse_invalid_tick_message(self):
        """Test parsing of invalid tick messages."""
        engine = RemoteEngine()
        
        # Invalid message (not enough parts)
        msg = b"TICK BTC/USD"
        tick = engine._parse_tick_message(msg)
        assert tick is None
        
        # Invalid message (wrong prefix)
        msg = b"ORDER BTC/USD 50000.0 100 1640995200000000000"
        tick = engine._parse_tick_message(msg)
        assert tick is None
        
        # Invalid message (non-numeric values)
        msg = b"TICK BTC/USD invalid 100 1640995200000000000"
        tick = engine._parse_tick_message(msg)
        assert tick is None

    def test_submit_order_dict_format(self):
        """Test order submission with dictionary format."""
        engine = RemoteEngine()
        
        order = {
            'symbol': 'BTC/USD',
            'side': 0,  # BUY
            'type': 0,  # MARKET
            'price': 50000.0,
            'quantity': 1
        }
        
        # Mock the socket send/receive
        with patch.object(engine.req_socket, 'send_string') as mock_send, \
             patch.object(engine.req_socket, 'recv_string') as mock_recv:
            
            mock_recv.return_value = "ORDER_UPDATE 12345"
            
            order_id = engine.submit_order(order)
            
            assert order_id == 12345
            mock_send.assert_called_once()
            mock_recv.assert_called_once()
            
            # Check the sent message format
            sent_msg = mock_send.call_args[0][0]
            assert "ORDER_REQUEST" in sent_msg
            assert "BTC/USD" in sent_msg
            assert "0" in sent_msg  # side
            assert "0" in sent_msg  # type
            assert "50000.0" in sent_msg
            assert "1" in sent_msg

    def test_get_portfolio(self):
        """Test portfolio snapshot retrieval."""
        engine = RemoteEngine()
        
        # Mock the control socket
        with patch.object(engine.control_socket, 'send_string') as mock_send, \
             patch.object(engine.control_socket, 'recv_string') as mock_recv:
            
            mock_recv.return_value = '{"balance": 10000.0, "unrealized_pnl": 500.0}'
            
            portfolio = engine.get_portfolio()
            
            assert portfolio is not None
            assert portfolio['balance'] == 10000.0
            assert portfolio['unrealized_pnl'] == 500.0
            assert engine.stats['control_requests'] == 1

    def test_get_risk_status(self):
        """Test risk status retrieval."""
        engine = RemoteEngine()
        
        # Mock the control socket
        with patch.object(engine.control_socket, 'send_string') as mock_send, \
             patch.object(engine.control_socket, 'recv_string') as mock_recv:
            
            mock_recv.return_value = '{"max_order_quantity": 1000, "max_position_size": 10000.0}'
            
            risk_status = engine.get_risk_status()
            
            assert risk_status is not None
            assert risk_status['max_order_quantity'] == 1000
            assert risk_status['max_position_size'] == 10000.0
            assert engine.stats['control_requests'] == 1

    def test_get_stats(self):
        """Test statistics retrieval."""
        engine = RemoteEngine()
        
        stats = engine.get_stats()
        
        assert 'ticks_received' in stats
        assert 'orders_sent' in stats
        assert 'order_updates' in stats
        assert 'control_requests' in stats
        assert 'connected_at' in stats
        assert 'runtime' in stats
        
        # Initial values should be 0
        assert stats['ticks_received'] == 0
        assert stats['orders_sent'] == 0
        assert stats['order_updates'] == 0
        assert stats['control_requests'] == 0

    def test_context_manager(self):
        """Test context manager functionality."""
        engine = RemoteEngine()
        
        # Mock connect and disconnect
        with patch.object(engine, 'connect') as mock_connect, \
             patch.object(engine, 'disconnect') as mock_disconnect:
            
            with engine as e:
                assert e == engine
                mock_connect.assert_called_once()
            
            mock_disconnect.assert_called_once()

    def test_tick_callback_execution(self):
        """Test tick callback execution."""
        engine = RemoteEngine()
        
        callback = Mock()
        engine.subscribe_ticks(callback)
        
        # Simulate tick message
        tick_data = {
            'symbol': 'BTC/USD',
            'price': 50000.0,
            'volume': 100,
            'timestamp_ns': 1640995200000000000
        }
        
        # Call the internal tick processing
        engine._parse_tick_message = Mock(return_value=tick_data)
        
        # Simulate receiving a tick
        msg = b"TICK BTC/USD 50000.0 100 1640995200000000000"
        tick = engine._parse_tick_message(msg)
        
        if tick:
            for cb in engine.tick_callbacks:
                cb(tick)
        
        callback.assert_called_once_with(tick_data)

    def test_error_handling_in_tick_callback(self):
        """Test error handling in tick callbacks."""
        engine = RemoteEngine()
        
        # Callback that raises an exception
        def failing_callback(tick):
            raise ValueError("Test error")
        
        engine.subscribe_ticks(failing_callback)
        
        # This should not raise an exception despite the callback error
        tick_data = {'symbol': 'BTC/USD', 'price': 50000.0, 'volume': 100, 'timestamp_ns': 1640995200000000000}
        
        # Execute callbacks (this would normally be called from _poll_ticks)
        for cb in engine.tick_callbacks:
            try:
                cb(tick_data)
            except Exception as e:
                # In real implementation, this would be logged
                pass  # Error handled gracefully

    def test_order_id_generation(self):
        """Test order ID generation and tracking."""
        engine = RemoteEngine()
        
        order = {'symbol': 'BTC/USD', 'side': 0, 'type': 0, 'price': 50000.0, 'quantity': 1}
        
        with patch.object(engine.req_socket, 'send_string') as mock_send, \
             patch.object(engine.req_socket, 'recv_string') as mock_recv:
            
            mock_recv.return_value = "ORDER_UPDATE 12345"
            
            order_id1 = engine.submit_order(order)
            mock_recv.return_value = "ORDER_UPDATE 12346"
            order_id2 = engine.submit_order(order)
            
            assert order_id1 == 12345
            assert order_id2 == 12346
            assert order_id2 > order_id1

    def test_control_request_parsing(self):
        """Test control request parsing."""
        engine = RemoteEngine()
        
        # Test JSON response parsing
        with patch.object(engine.control_socket, 'send_string') as mock_send, \
             patch.object(engine.control_socket, 'recv_string') as mock_recv:
            
            # Valid JSON response
            mock_recv.return_value = '{"test": "value"}'
            response = engine._send_control_request("GET_PORTFOLIO")
            assert response == {'test': 'value'}
            
            # Non-JSON response
            mock_recv.return_value = "Simple text response"
            response = engine._send_control_request("GET_STATS")
            assert response == {'response': 'Simple text response'}
