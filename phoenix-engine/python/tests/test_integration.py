"""
Integration tests for Phoenix IPC system.

This module provides end-to-end integration tests that verify
the complete IPC functionality including engine startup, client connection,
tick delivery, and order submission.
"""

import pytest
import threading
import time
import json
from unittest.mock import Mock, patch
from phoenix_ipc import RemoteEngine
from strategies.runner_ipc import IpcStrategyRunner
from strategies.rsi_example import RSIStrategy


class TestRemoteEngine:
    """Test the RemoteEngine client functionality."""
    
    def test_connection_success(self):
        """Test successful connection to engine."""
        with patch('socket.socket') as mock_socket:
            mock_conn = Mock()
            mock_socket.return_value = mock_conn
            
            # Mock successful connection
            mock_conn.connect.return_value = None
            mock_conn.recv.return_value = b'{"id":1,"type":"response","result":{},"error":null}\n'
            
            engine = RemoteEngine()
            engine._connect()
            
            assert engine.running == True
            assert engine.sock == mock_conn
            mock_conn.connect.assert_called_once_with(('localhost', 5555))
    
    def test_connection_failure(self):
        """Test connection failure handling."""
        with patch('socket.socket') as mock_socket:
            mock_conn = Mock()
            mock_socket.return_value = mock_conn
            
            # Mock connection failure
            mock_conn.connect.side_effect = ConnectionError("Connection failed")
            
            with pytest.raises(ConnectionError):
                engine = RemoteEngine()
                engine._connect()
    
    def test_message_parsing(self):
        """Test JSON message parsing."""
        from phoenix_ipc.messages import parse_message
        
        # Valid JSON
        valid_msg = '{"method":"test","params":{"key":"value"}}'
        parsed = parse_message(valid_msg)
        assert parsed is not None
        assert parsed["method"] == "test"
        assert parsed["params"]["key"] == "value"
        
        # Invalid JSON
        invalid_msg = '{"method":"test","params":{"key":"value"}}'
        parsed = parse_message(invalid_msg)
        assert parsed is None
    
    def test_request_response_cycle(self):
        """Test request-response cycle."""
        with patch('socket.socket') as mock_socket:
            mock_conn = Mock()
            mock_socket.return_value = mock_conn
            
            # Mock connection and message exchange
            mock_conn.connect.return_value = None
            mock_conn.sendall.return_value = None
            mock_conn.recv.return_value = b'{"id":1,"type":"response","result":{"success":true},"error":null}\n'
            
            engine = RemoteEngine()
            engine._connect()
            
            # Test synchronous call
            result = engine._call("testMethod", {"param": "value"})
            assert result["success"] == True
            assert mock_conn.sendall.called
    
    def test_tick_handling(self):
        """Test tick message handling."""
        with patch('socket.socket') as mock_socket:
            mock_conn = Mock()
            mock_socket.return_value = mock_conn
            
            # Mock tick message
            tick_msg = '{"type":"tick","data":{"symbol":"BTC/USD","price":50000.0,"volume":100,"timestamp_ns":1640995200000000000}}\n'
            mock_conn.recv.return_value = tick_msg.encode()
            
            engine = RemoteEngine()
            engine._connect()
            
            # Add tick callback
            received_ticks = []
            def tick_callback(tick):
                received_ticks.append(tick)
            
            engine.subscribe_ticks(tick_callback)
            
            # Process messages
            engine._handle_message(json.loads(tick_msg.strip()))
            
            assert len(received_ticks) == 1
            assert received_ticks[0]["symbol"] == "BTC/USD"
            assert received_ticks[0]["price"] == 50000.0
    
    def test_order_submission(self):
        """Test order submission."""
        with patch('socket.socket') as mock_socket:
            mock_conn = Mock()
            mock_socket.return_value = mock_conn
            
            # Mock order response
            order_response = '{"id":1,"type":"response","result":{"order_id":12345},"error":null}\n'
            mock_conn.recv.return_value = order_response.encode()
            
            engine = RemoteEngine()
            engine._connect()
            
            order_params = {
                "symbol": "BTC/USD",
                "side": 0,  # BUY
                "type": 0,  # MARKET
                "price": 50000.0,
                "quantity": 1.0
            }
            
            order_id = engine.submit_order(order_params)
            assert order_id == 12345
    
    def test_error_handling(self):
        """Test error response handling."""
        with patch('socket.socket') as mock_socket:
            mock_conn = Mock()
            mock_socket.return_value = mock_conn
            
            # Mock error response
            error_response = '{"id":1,"type":"response","result":null,"error":"Invalid order"}\n'
            mock_conn.recv.return_value = error_response.encode()
            
            engine = RemoteEngine()
            engine._connect()
            
            with pytest.raises(Exception, match="Invalid order"):
                engine.submit_order({"invalid": "order"})


class TestIpcStrategyRunner:
    """Test the IPC strategy runner functionality."""
    
    def test_runner_initialization(self):
        """Test strategy runner initialization."""
        runner = IpcStrategyRunner()
        
        assert runner.engine is not None
        assert runner.engine.host == 'localhost'
        assert runner.engine.port == 5555
        assert len(runner.strategies) == 0
        assert runner.running == False
    
    def test_strategy_addition(self):
        """Test adding strategies to runner."""
        runner = IpcStrategyRunner()
        
        strategy = RSIStrategy("test_strategy", "BTC/USD")
        runner.add_strategy(strategy)
        
        assert len(runner.strategies) == 1
        assert runner.strategies[0] == strategy
    
    def test_start_stop(self):
        """Test runner start and stop functionality."""
        with patch('phoenix_ipc.RemoteEngine._connect') as mock_connect:
            with patch('phoenix_ipc.RemoteEngine.stop') as mock_stop:
                runner = IpcStrategyRunner()
                strategy = RSIStrategy("test_strategy", "BTC/USD")
                runner.add_strategy(strategy)
                
                # Test start
                success = runner.start()
                assert success == True
                assert runner.running == True
                mock_connect.assert_called_once()
                
                # Test stop
                runner.stop()
                assert runner.running == False
                mock_stop.assert_called_once()
    
    def test_order_submission_through_runner(self):
        """Test order submission via strategy runner."""
        with patch('phoenix_ipc.RemoteEngine.submit_order') as mock_submit:
            mock_submit.return_value = 12345
            
            runner = IpcStrategyRunner()
            
            order_params = {
                "symbol": "BTC/USD",
                "side": 0,
                "type": 0,
                "price": 50000.0,
                "quantity": 1.0
            }
            
            order_id = runner.submit_order(order_params)
            assert order_id == 12345
            mock_submit.assert_called_once_with(order_params)
    
    def test_portfolio_retrieval(self):
        """Test portfolio data retrieval."""
        with patch('phoenix_ipc.RemoteEngine.get_portfolio') as mock_portfolio:
            mock_portfolio.return_value = {
                "balance": 10000.0,
                "unrealized_pnl": 500.0,
                "positions": []
            }
            
            runner = IpcStrategyRunner()
            portfolio = runner.get_portfolio()
            
            assert portfolio["balance"] == 10000.0
            assert portfolio["unrealized_pnl"] == 500.0
            mock_portfolio.assert_called_once()
    
    def test_context_manager(self):
        """Test runner as context manager."""
        with patch('phoenix_ipc.RemoteEngine._connect') as mock_connect:
            with patch('phoenix_ipc.RemoteEngine.stop') as mock_stop:
                with IpcStrategyRunner() as runner:
                    assert runner.engine is not None
                    
                # Context should auto-stop on exit
                mock_stop.assert_called_once()


class TestEndToEndIntegration:
    """End-to-end integration tests."""
    
    @pytest.mark.integration
    def test_mock_engine_integration(self):
        """Test integration with mock engine."""
        with patch('socket.socket') as mock_socket:
            mock_conn = Mock()
            mock_socket.return_value = mock_conn
            
            # Mock engine responses
            responses = [
                b'{"id":1,"type":"response","result":{"subscribed":true},"error":null}\n',
                b'{"type":"tick","data":{"symbol":"BTC/USD","price":50000.0,"volume":100,"timestamp_ns":1640995200000000000}}\n',
                b'{"id":2,"type":"response","result":{"order_id":12345},"error":null}\n'
            ]
            mock_conn.recv.side_effect = responses
            
            # Test complete workflow
            with RemoteEngine() as engine:
                # Connect and subscribe to ticks
                engine._connect()
                engine.subscribe_ticks(lambda tick: None)
                
                # Submit order
                order_id = engine.submit_order({
                    "symbol": "BTC/USD",
                    "side": 0,
                    "type": 0,
                    "price": 50000.0,
                    "quantity": 1.0
                })
                
                assert order_id == 12345
    
    @pytest.mark.integration
    def test_strategy_runner_integration(self):
        """Test strategy runner with mock engine."""
        with patch('phoenix_ipc.RemoteEngine') as mock_engine_class:
            mock_engine = Mock()
            mock_engine_class.return_value = mock_engine
            
            # Mock engine methods
            mock_engine.subscribe_ticks.return_value = None
            mock_engine.start.return_value = None
            mock_engine.stop.return_value = None
            
            runner = IpcStrategyRunner()
            strategy = RSIStrategy("test_strategy", "BTC/USD")
            runner.add_strategy(strategy)
            
            # Test start
            success = runner.start()
            assert success == True
            
            # Test stop
            runner.stop()
            
            # Verify method calls
            mock_engine.subscribe_ticks.assert_called_once()
            mock_engine.start.assert_called_once()
            mock_engine.stop.assert_called_once()
    
    @pytest.mark.integration
    def test_error_recovery(self):
        """Test error handling and recovery."""
        with patch('socket.socket') as mock_socket:
            mock_conn = Mock()
            mock_socket.return_value = mock_conn
            
            # Mock connection failure then success
            mock_conn.connect.side_effect = [ConnectionError("Failed"), None]
            mock_conn.recv.return_value = b'{"id":1,"type":"response","result":{},"error":null}\n'
            
            engine = RemoteEngine()
            
            # First connection attempt should fail
            with pytest.raises(ConnectionError):
                engine._connect()
            
            # Second attempt should succeed
            engine._connect()
            assert engine.running == True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
