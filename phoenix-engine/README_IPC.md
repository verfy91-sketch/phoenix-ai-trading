# Phoenix AI Trading System - IPC Layer

This document describes the Inter-Process Communication (IPC) layer for the Phoenix AI Trading System, which enables Python strategies to run in separate processes and communicate with the C++ engine via TCP/IP using JSON messages.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Message Protocol](#message-protocol)
5. [Building](#building)
6. [Usage](#usage)
7. [Configuration](#configuration)
8. [Performance](#performance)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)
11. [Security Considerations](#security-considerations)
12. [Future Development](#future-development)

## Overview

The IPC layer provides a robust, high-performance communication channel between the Phoenix C++ engine and Python strategy processes. It uses:

- **Transport**: TCP/IP sockets for reliable, ordered delivery
- **Serialization**: JSON for human-readable, language-agnostic messaging
- **Architecture**: Client-server model with support for multiple concurrent clients

### Key Features

- **Multiple Client Support**: Multiple Python strategy processes can connect simultaneously
- **Thread-Safe Operations**: Concurrent access from multiple threads and processes
- **Error Handling**: Comprehensive error detection and recovery
- **Performance Monitoring**: Built-in latency and throughput tracking
- **Cross-Platform**: Windows and Linux compatibility

### Benefits

- **Process Isolation**: Strategies run in separate processes for stability
- **Scalability**: Multiple engines and clients can be distributed
- **Debugging**: Easier debugging with separate processes
- **Flexibility**: Language-agnostic client implementations

## Architecture

```
┌─────────────────┐    TCP/IP    ┌─────────────────┐
│   C++ Engine   │◄────────────►│  Python Client  │
│                │               │                │
│ • TCP Server   │               │ • RemoteEngine │
│ • JSON Handler │               │ • Strategy     │
│ • Client Mgmt  │               │ • Runner       │
└─────────────────┘               └─────────────────┘
```

### Components

#### C++ Engine Side

- **TcpServer**: Main server handling client connections
- **ClientSession**: Per-client connection handler
- **JsonMessage**: JSON serialization/deserialization utilities
- **Engine Integration**: Callbacks for tick broadcasting and order updates

#### Python Client Side

- **RemoteEngine**: TCP client with engine-like API
- **Messages**: Message type definitions and utilities
- **IpcStrategyRunner**: Strategy execution manager

## Components

### TcpServer

The main server class that manages client connections and message routing.

```cpp
class TcpServer {
public:
    explicit TcpServer(Engine* engine, uint16_t port = 5555);
    bool start();
    void stop();
    void broadcastTick(const Tick& tick);
    void sendOrderUpdate(const std::string& clientId, uint64_t orderId, const OrderUpdate& update);
};
```

#### Key Methods

- `start()`: Start listening for client connections
- `stop()`: Gracefully shutdown server and all connections
- `broadcastTick()`: Send tick data to all connected clients
- `sendOrderUpdate()`: Send order update to specific client

### ClientSession

Handles individual client connections with thread-safe operations.

```cpp
class ClientSession {
public:
    ClientSession(int clientFd, Engine* engine, TcpServer* server);
    void start();
    void stop();
    bool sendMessage(const nlohmann::json& msg);
};
```

#### Features

- **Thread-Safe**: Each session runs in its own thread
- **Message Parsing**: Robust JSON parsing with error handling
- **Request Dispatch**: Routes requests to appropriate engine methods
- **Response Handling**: Formats and sends responses back to clients

### JsonMessage

Provides serialization utilities for all data types.

```cpp
// Message creation
nlohmann::json makeTickMessage(const Tick& tick);
nlohmann::json makeOrderUpdateMessage(const OrderUpdate& update);

// Data conversion
nlohmann::json orderToJson(const Order& order);
nlohmann::json portfolioToJson(const PortfolioSnapshot& portfolio);

// Parsing
std::optional<nlohmann::json> parseMessage(const std::string& data);
```

### RemoteEngine (Python)

Python client that mimics the local Engine API.

```python
class RemoteEngine:
    def __init__(self, host='localhost', port=5555):
    def submit_order(self, order_params):
    def get_portfolio(self):
    def get_risk_status(self):
    def subscribe_ticks(self, callback):
```

#### Features

- **Automatic Reconnection**: Handles connection failures gracefully
- **Timeout Management**: Configurable request timeouts
- **Context Manager**: Automatic resource cleanup
- **Thread-Safe**: Safe concurrent access

### IpcStrategyRunner (Python)

Manages multiple strategies using RemoteEngine.

```python
class IpcStrategyRunner:
    def __init__(self, host='localhost', port=5555):
    def add_strategy(self, strategy):
    def start(self):
    def stop(self):
    def wait_for_completion(self, timeout=None):
```

## Message Protocol

### Message Format

All messages follow a consistent JSON format:

#### Request Message
```json
{
    "id": 123,
    "type": "request",
    "method": "submitOrder",
    "params": {
        "symbol": "BTC/USD",
        "side": 0,
        "type": 0,
        "price": 50000.0,
        "quantity": 1.0
    }
}
```

#### Response Message
```json
{
    "id": 123,
    "type": "response",
    "result": {
        "order_id": 12345
    },
    "error": null
}
```

#### Streaming Message
```json
{
    "type": "tick",
    "data": {
        "symbol": "BTC/USD",
        "price": 50000.0,
        "volume": 100.0,
        "timestamp_ns": 1640995200000000000
    }
}
```

### Request Methods

| Method | Description | Parameters | Response |
|---------|-------------|------------|----------|
| `submitOrder` | Submit new order | `{ "order_id": 12345 }` |
| `cancelOrder` | Cancel existing order | `{ "success": true }` |
| `getPortfolio` | Get portfolio snapshot | Portfolio data |
| `getRiskStatus` | Get risk management status | Risk status data |
| `getStats` | Get engine statistics | Engine statistics |
| `subscribeTicks` | Subscribe to tick data | `{ "subscribed": true }` |
| `unsubscribeTicks` | Unsubscribe from ticks | `{ "unsubscribed": true }` |

### Message Types

| Type | Description | Data |
|------|-------------|------|
| `request` | Client request | Method and parameters |
| `response` | Server response | Result or error |
| `tick` | Market data tick | Tick data |
| `order_update` | Order status update | Order update data |
| `heartbeat` | Keep-alive message | Timestamp |

## Building

### Prerequisites

- **C++ Compiler**: C++20 compliant (GCC 10+, Clang 12+, MSVC 2019+)
- **CMake**: Version 3.20 or higher
- **nlohmann/json**: Automatic via FetchContent
- **Python**: 3.8 or higher
- **pytest**: For running tests

### Build Steps

#### C++ Components

```bash
# Configure build
cmake -B build -S . -DBUILD_IPC=ON

# Build IPC components
cmake --build build --config Release

# Build IPC server executable
cmake --build build --config Release -DBUILD_IPC_SERVER=ON
```

#### Python Components

```bash
# Install dependencies
pip install -r python/requirements.txt

# Run tests
pytest python/tests/
```

### CMake Options

| Option | Default | Description |
|---------|----------|-------------|
| `BUILD_IPC` | OFF | Build IPC components |
| `BUILD_IPC_SERVER` | OFF | Build IPC server executable |
| `BUILD_TESTS` | ON | Build unit tests |
| `BUILD_BENCHMARKS` | ON | Build benchmarks |

## Usage

### Starting the Engine

#### Method 1: Using IPC Server Executable

```bash
# Build and run IPC server
./build/phoenix_ipc_server [port]

# Example
./build/phoenix_ipc_server 5555
```

#### Method 2: Integrating into Application

```cpp
#include "ipc/tcp_server.h"

int main() {
    auto engine = std::make_unique<phoenix::Engine>();
    engine->init();
    
    auto ipc_server = std::make_unique<phoenix::ipc::TcpServer>(engine.get(), 5555);
    ipc_server->start();
    
    engine->start();
    
    // Main loop
    while (running) {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
    
    return 0;
}
```

### Python Strategy Client

#### Basic Usage

```python
from phoenix_ipc import RemoteEngine

# Connect to engine
engine = RemoteEngine(host='localhost', port=5555)

# Submit order
order_id = engine.submit_order({
    'symbol': 'BTC/USD',
    'side': 0,  # BUY
    'type': 0,   # MARKET
    'price': 50000.0,
    'quantity': 1.0
})

print(f"Order submitted: {order_id}")

# Get portfolio
portfolio = engine.get_portfolio()
print(f"Portfolio balance: {portfolio['balance']}")

# Subscribe to ticks
def on_tick(tick):
    print(f"Received tick: {tick['symbol']} @ {tick['price']}")

engine.subscribe_ticks(on_tick)

# Automatic cleanup with context manager
with RemoteEngine() as engine:
    # Use engine
    pass
# Automatically disconnected
```

#### Strategy Runner

```python
from strategies.runner_ipc import IpcStrategyRunner
from strategies.rsi_example import RSIStrategy

# Create runner
runner = IpcStrategyRunner()

# Add strategies
rsi_strategy = RSIStrategy("rsi_strategy", "BTC/USD", quantity=1)
runner.add_strategy(rsi_strategy)

# Start runner
if runner.start():
    try:
        # Run for 60 seconds
        runner.wait_for_completion(timeout=60)
    finally:
        runner.stop()
```

## Configuration

### Server Configuration

#### Default Settings

- **Port**: 5555
- **Host**: 0.0.0.0 (all interfaces)
- **Max Clients**: No limit (system dependent)
- **Timeout**: 5 seconds for requests
- **Buffer Size**: 4096 bytes for receive buffer

#### Environment Variables

```bash
# Server port
export PHOENIX_IPC_PORT=5555

# Server host
export PHOENIX_IPC_HOST=0.0.0.0

# Request timeout (seconds)
export PHOENIX_IPC_TIMEOUT=5
```

### Client Configuration

#### Connection Settings

```python
engine = RemoteEngine(
    host='192.168.1.100',  # Server IP
    port=5555,                # Server port
    timeout=10.0               # Request timeout
)
```

#### Performance Tuning

```python
# Enable TCP_NODELAY for lower latency
import socket
engine.sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)

# Adjust send buffer size
engine.sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 65536)
```

## Performance

### Benchmarks

The IPC layer includes comprehensive performance benchmarks:

```bash
# Run benchmarks
python python/benchmarks/bench_ipc.py

# Results saved to ipc_benchmark_results.json
```

#### Performance Metrics

| Metric | Target | Measurement |
|---------|--------|------------|
| Order Submission Latency | < 100 μs | Round-trip time |
| Query Latency | < 50 μs | Portfolio/risk/stats queries |
| Throughput | > 1000 req/s | Sustained request rate |
| Concurrent Clients | 10+ clients | Multiple client performance |
| Memory Usage | < 100 MB | Process memory consumption |
| CPU Usage | < 10% | Process CPU utilization |

#### Optimization Tips

1. **Use TCP_NODELAY**: Disable Nagle's algorithm for low latency
2. **Buffer Sizes**: Optimize send/receive buffer sizes
3. **Connection Pooling**: Reuse connections when possible
4. **Batch Operations**: Group multiple operations when possible
5. **Async Processing**: Use non-blocking I/O for high throughput

## Testing

### Unit Tests

#### C++ Tests

```bash
# Run all IPC tests
./build/test_json_message
./build/test_tcp_server

# Run with CTest
ctest --output-on-failure -R ipc
```

#### Python Tests

```bash
# Run unit tests
pytest python/tests/test_remote_engine.py -v

# Run integration tests
pytest python/tests/test_integration.py -v -m integration

# Run with coverage
pytest python/tests/ --cov=phoenix_ipc --cov-report=html
```

### Integration Tests

Integration tests verify end-to-end functionality:

1. **Connection Test**: Client connects to server
2. **Message Exchange**: Request/response cycle works
3. **Tick Streaming**: Real-time data delivery
4. **Error Handling**: Proper error propagation
5. **Concurrent Access**: Multiple clients simultaneously

### Mock Testing

For testing without a full engine:

```python
# Use mock server in benchmarks
from benchmarks.bench_ipc import IpcBenchmark

benchmark = IpcBenchmark()
results = benchmark.run_all_benchmarks()
```

## Troubleshooting

### Common Issues

#### Connection Problems

**Issue**: "Connection refused" error

**Solutions**:
1. Check if server is running: `netstat -an | grep 5555`
2. Verify firewall settings
3. Check network connectivity: `telnet localhost 5555`
4. Ensure correct host/port configuration

**Debug Code**:
```python
try:
    engine = RemoteEngine()
except ConnectionError as e:
    print(f"Connection failed: {e}")
    # Implement retry logic
```

#### Message Parsing Errors

**Issue**: JSON parsing failures

**Solutions**:
1. Verify message format: valid JSON with newline terminator
2. Check encoding: UTF-8 required
3. Validate message size: < 4KB recommended
4. Enable debug logging

**Debug Code**:
```python
from phoenix_ipc.messages import parse_message

result = parse_message(data)
if result is None:
    print(f"Invalid JSON: {data}")
    # Handle error
```

#### Performance Issues

**Issue**: High latency or low throughput

**Solutions**:
1. Check network latency: `ping localhost`
2. Monitor system resources: CPU, memory, network
3. Verify TCP settings: TCP_NODELAY, buffer sizes
4. Profile with benchmarks: `python bench_ipc.py`

**Debug Code**:
```python
import time

start = time.perf_counter()
# Make request
end = time.perf_counter()
print(f"Latency: {(end - start) * 1000:.3f} ms")
```

### Debug Logging

Enable debug logging:

```cpp
// C++ side
#define PHOENIX_IPC_DEBUG 1

// Python side
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Security Considerations

### Network Security

#### Authentication

Currently, the IPC layer does not implement authentication. For production use:

1. **API Keys**: Implement client authentication
2. **TLS/SSL**: Encrypt communication channel
3. **IP Whitelisting**: Restrict client IP addresses
4. **Rate Limiting**: Prevent abuse

#### Input Validation

The server validates all inputs:

```cpp
// Order validation
if (order.price <= 0 || order.quantity <= 0) {
    throw std::invalid_argument("Invalid price or quantity");
}

// JSON parsing
auto parsed = parseMessage(data);
if (!parsed) {
    // Log error and close connection
    return;
}
```

### Resource Limits

#### Connection Limits

- **Max Connections**: System-dependent (typically 1000+)
- **Message Size**: 4KB limit per message
- **Request Rate**: No built-in limit (implement as needed)
- **Timeout**: 5 seconds default (configurable)

#### Memory Management

- **RAII**: Automatic resource cleanup in C++
- **Smart Pointers**: Memory management with unique_ptr
- **Exception Safety**: Strong exception guarantees
- **Python GC**: Automatic cleanup with context managers

## Future Development

### Phase 4 Enhancements

Planned improvements for the next phase:

#### External Connectivity

1. **REST API**: HTTP/REST interface for web clients
2. **WebSocket**: Real-time web client support
3. **gRPC**: High-performance binary protocol
4. **Message Queues**: Redis/RabbitMQ integration

#### Performance Improvements

1. **ZeroMQ Integration**: Replace TCP sockets for better performance
2. **Cap'n Proto**: Binary serialization for efficiency
3. **Connection Pooling**: Reuse connections
4. **Async I/O**: Non-blocking operations

#### Security Enhancements

1. **TLS Support**: Encrypted communication
2. **Authentication**: Client authentication system
3. **Authorization**: Role-based access control
4. **Audit Logging**: Comprehensive logging

#### Monitoring & Observability

1. **Metrics**: Prometheus metrics export
2. **Health Checks**: Service health monitoring
3. **Tracing**: Distributed tracing support
4. **Profiling**: Performance profiling tools

### Migration Path

The current JSON/TCP implementation provides a solid foundation for future enhancements:

1. **Backward Compatibility**: Future versions will support current clients
2. **Protocol Negotiation**: Clients can request enhanced features
3. **Gradual Migration**: Mix old and new protocols during transition
4. **Feature Flags**: Enable/disable new functionality

## API Reference

### C++ Classes

#### TcpServer

```cpp
namespace phoenix::ipc {
class TcpServer {
public:
    explicit TcpServer(Engine* engine, uint16_t port = 5555);
    ~TcpServer();
    
    bool start();
    void stop();
    bool isRunning() const noexcept;
    
    void broadcastTick(const Tick& tick);
    void sendOrderUpdate(const std::string& clientId, uint64_t orderId, const OrderUpdate& update);
};
}
```

#### ClientSession

```cpp
namespace phoenix::ipc {
class ClientSession {
public:
    ClientSession(int clientFd, Engine* engine, TcpServer* server);
    ~ClientSession();
    
    void start();
    void stop();
    bool isActive() const noexcept;
    const std::string& getClientId() const noexcept;
    
    bool sendMessage(const nlohmann::json& msg);
};
}
```

#### JsonMessage Functions

```cpp
namespace phoenix::ipc {
// Message creation
nlohmann::json makeTickMessage(const Tick& tick);
nlohmann::json makeOrderUpdateMessage(const OrderUpdate& update);
nlohmann::json makeResponse(uint64_t requestId, const nlohmann::json& result, const std::string& error = "");

// Data conversion
nlohmann::json orderToJson(const Order& order);
nlohmann::json portfolioToJson(const PortfolioSnapshot& portfolio);
std::optional<Order> orderFromJson(const nlohmann::json& json);

// Parsing
std::optional<nlohmann::json> parseMessage(const std::string& data);
}
```

### Python Classes

#### RemoteEngine

```python
class RemoteEngine:
    def __init__(self, host='localhost', port=5555):
    def submit_order(self, order_params: dict) -> int:
    def cancel_order(self, order_id: int) -> bool:
    def get_portfolio(self) -> dict:
    def get_risk_status(self) -> dict:
    def get_stats(self) -> dict:
    def subscribe_ticks(self, callback: Callable):
    def unsubscribe_ticks(self):
    def start(self):
    def stop(self):
    
    def __enter__(self):
    def __exit__(self, exc_type, exc_val, exc_tb):
```

#### IpcStrategyRunner

```python
class IpcStrategyRunner:
    def __init__(self, host='localhost', port=5555):
    def add_strategy(self, strategy):
    def start(self) -> bool:
    def stop(self):
    def submit_order(self, order_params: dict) -> Optional[int]:
    def cancel_order(self, order_id: int) -> bool:
    def get_portfolio(self) -> dict:
    def get_risk_status(self) -> dict:
    def get_stats(self) -> dict:
    def wait_for_completion(self, timeout: Optional[float] = None):
    def print_status(self):
    
    def __enter__(self):
    def __exit__(self, exc_type, exc_val, exc_tb):
```

## Contributing

### Development Setup

1. **Clone Repository**: `git clone <repository-url>`
2. **Install Dependencies**: See Building section
3. **Run Tests**: Verify all tests pass
4. **Code Style**: Follow existing conventions
5. **Documentation**: Update this document for changes

### Submitting Changes

1. **Create Branch**: `git checkout -b feature/your-feature`
2. **Make Changes**: Implement and test
3. **Run Tests**: Ensure all pass
4. **Commit**: `git commit -m "Description of changes"`
5. **Push**: `git push origin feature/your-feature`
6. **Pull Request**: Create PR with description

---

For more information, see the Phoenix AI Trading System documentation or contact the development team.
