"""
Unit tests for RemoteEngine client.

This module tests the RemoteEngine client functionality with mocked
socket connections to verify proper behavior without requiring a running engine.
"""

import pytest
import json
import threading
import queue
import time
import socket
from unittest.mock import Mock, patch, MagicMock
from phoenix_ipc import RemoteEngine
from phoenix_ipc.messages import parse_message


class TestRemoteEngineUnit:
    """Unit tests for RemoteEngine client."""
    
    def test_initialization(self):
        """Test RemoteEngine initialization."""
        engine = RemoteEngine()
        
        assert engine.host == 'localhost'
        assert engine.port == 5555
        assert engine.sock is None
        assert engine.request_id == 0
        assert len(engine.pending) == 0
        assert len(engine.tick_callbacks) == 0
        assert engine.running == False
    
    def test_custom_host_port(self):
        """Test RemoteEngine with custom host and port."""
        engine = RemoteEngine(host='192.168.1.100', port=8888)
        
        assert engine.host == '192.168.1.100'
        assert engine.port == 8888
    
    @patch('socket.socket')
    def test_connection_success(self, mock_socket):
        """Test successful socket connection."""
        mock_conn = Mock()
        mock_socket.return_value = mock_conn
        
        engine = RemoteEngine()
        engine._connect()
        
        mock_socket.assert_called_once_with(socket.AF_INET, socket.SOCK_STREAM)
        mock_conn.connect.assert_called_once_with(('localhost', 5555))
        assert engine.sock == mock_conn
        assert engine.running == True
        assert engine.recv_thread is not None
    
    @patch('socket.socket')
    def test_connection_failure(self, mock_socket):
        """Test connection failure handling."""
        mock_conn = Mock()
        mock_socket.return_value = mock_conn
        mock_conn.connect.side_effect = ConnectionError("Connection refused")
        
        engine = RemoteEngine()
        
        with pytest.raises(ConnectionError, match="Connection refused"):
            engine._connect()
        
        assert engine.running == False
    
    def test_message_parsing_valid(self):
        """Test parsing valid JSON messages."""
        valid_msg = '{"id":123,"method":"test","params":{"key":"value"}}'
        parsed = parse_message(valid_msg)
        
        assert parsed is not None
        assert parsed["id"] == 123
        assert parsed["method"] == "test"
        assert parsed["params"]["key"] == "value"
    
    def test_message_parsing_invalid(self):
        """Test parsing invalid JSON messages."""
        invalid_msg = '{"id":123,"method":"test","params":{"key":"value"}}'
        parsed = parse_message(invalid_msg)
        
        assert parsed is None
    
    def test_message_parsing_empty(self):
        """Test parsing empty messages."""
        parsed = parse_message("")
        assert parsed is None
    
    def test_message_parsing_non_json(self):
        """Test parsing non-JSON messages."""
        non_json_msg = "This is not JSON"
        parsed = parse_message(non_json_msg)
        assert parsed is None
    
    @patch('socket.socket')
    def test_receive_loop_tick_message(self, mock_socket):
        """Test receiving tick messages."""
        mock_conn = Mock()
        mock_socket.return_value = mock_conn
        
        engine = RemoteEngine()
        engine._connect()
        
        # Mock receiving a tick message
        tick_data = '{"type":"tick","symbol":"BTC/USD","price":50000.0,"volume":100,"timestamp_ns":1640995200000000000}\n'
        mock_conn.recv.return_value = tick_data.encode()
        
        # Add a mock callback
        callback_called = []
        def tick_callback(tick):
            callback_called.append(tick)
        
        engine.subscribe_ticks(tick_callback)
        
        # Simulate one receive call
        engine._receive_once()
        
        assert len(callback_called) == 1
        assert callback_called[0]['symbol'] == 'BTC/USD'
        assert callback_called[0]['price'] == 50000.0

    def test_order_submission(self):
        """Test order submission functionality."""
        mock_conn = Mock()
        mock_socket.return_value = mock_conn
        
        engine = RemoteEngine()
        engine._connect()
        
        # Mock successful response
        response_data = '{"id":1,"result":{"order_id":123},"error":null}\n'
        mock_conn.recv.return_value = response_data.encode()
        
        result = engine.submit_order({
            'symbol': 'BTC/USD',
            'side': 'BUY',
            'quantity': 1.0,
            'type': 'MARKET'
        })
        
        assert result['success'] == True
        assert result['order_id'] == 123

    @pytest.mark.integration
    def test_end_to_end_simulation(self):
        """End-to-end simulation test (requires real engine)."""
        # This test would require a real engine process to be running
        # For now, we'll skip it unless explicitly requested
        pytest.skip("Requires real engine process - implement in Phase 4")
