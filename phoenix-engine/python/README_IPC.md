# Phoenix AI Trading System - IPC Layer

This package provides Inter-Process Communication (IPC) capabilities for the Phoenix AI Trading System, enabling distributed deployment of trading strategies while maintaining ultra-low-latency communication with the C++ engine core.

## Architecture Overview

The IPC layer uses a high-performance messaging architecture:

- **ZeroMQ**: Provides reliable, low-latency messaging between processes
- **Cap'n Proto**: Zero-copy serialization for efficient data transfer
- **Multi-socket Design**: Separate sockets for different message types
- **Thread-safe Operations**: All components are designed for concurrent access

### Message Flow

```
┌─────────────────┐    PUB/SUB    ┌─────────────────┐
│   Engine (C++)  │ ─────────────→ │  Strategies     │
│                 │               │   (Python)      │
│   IPC Manager   │ ←───────────── │                 │
└─────────────────┘    REQ/REP    └─────────────────┘
        │
        ▼
┌─────────────────┐    ROUTER     ┌─────────────────┐
│   Order Mgmt    │ ←────────────→ │  Order Updates  │
└─────────────────┘              └─────────────────┘
```

## Components

### C++ Components

- **IpcManager**: Core IPC manager running in the engine process
- **ZmqHelpers**: RAII wrappers for ZeroMQ operations
- **Message Types**: Type-safe message definitions

### Python Components

- **RemoteEngine**: Client interface mimicking local Engine API
- **IpcStrategyRunner**: Distributed strategy execution manager
- **Integration Tests**: End-to-end testing suite

## Building

### Prerequisites

- CMake 3.16+
- C++17 compiler
- ZeroMQ development libraries
- Cap'n Proto compiler and libraries
- Python 3.8+
- pyzmq and pycapnp Python packages

### Build Steps

1. **Configure with IPC enabled**:
   ```bash
   mkdir build && cd build
   cmake .. -DCMAKE_BUILD_TYPE=Release -DBUILD_IPC=ON
   ```

2. **Build the project**:
   ```bash
   cmake --build . --config Release
   ```

3. **Install Python dependencies**:
   ```bash
   cd python
   pip install -r requirements.txt
   ```

## Usage

### Basic Remote Engine Usage

```python
from phoenix_ipc.client import RemoteEngine

# Create remote engine client
engine = RemoteEngine(
    market_data_url="ipc:///tmp/phoenix_market_data",
    orders_url="ipc:///tmp/phoenix_orders",
    control_url="ipc:///tmp/phoenix_control"
)

# Connect to the engine
if engine.connect():
    print("Connected to remote engine")
    
    # Subscribe to market data
    def on_tick(tick):
        print(f"Received tick: {tick['symbol']} @ {tick['price']}")
    
    engine.subscribe_ticks(on_tick)
    engine.start()
    
    # Submit an order
    order = {
        'symbol': 'BTC/USD',
        'side': 0,  # BUY
        'type': 0,  # MARKET
        'price': 50000.0,
        'quantity': 1
    }
    
    order_id = engine.submit_order(order)
    print(f"Order submitted: {order_id}")
    
    # Get portfolio snapshot
    portfolio = engine.get_portfolio()
    print(f"Balance: {portfolio['balance']}")
    
    # Stop the client
    engine.stop()
    engine.disconnect()
```

### Using the IPC Strategy Runner

```python
from strategies.runner_ipc import IpcStrategyRunner
from strategies.rsi_example import RSIStrategy

# Create IPC strategy runner
runner = IpcStrategyRunner()

# Add strategies
strategy = RSIStrategy("rsi_strategy", "BTC/USD", quantity=1)
runner.add_strategy(strategy)

# Start the runner (connects to remote engine)
if runner.start():
    print("Strategy runner started")
    
    # Let it run for a while
    runner.wait_for_completion(timeout=60)  # 60 seconds
    
    # Stop the runner
    runner.stop()
```

### Context Manager Usage

```python
# Both RemoteEngine and IpcStrategyRunner support context managers

with RemoteEngine() as engine:
    engine.subscribe_ticks(on_tick)
    engine.start()
    # ... do work ...
    # Automatically disconnected on exit

with IpcStrategyRunner() as runner:
    runner.add_strategy(strategy)
    # Automatically started and stopped
```

## Message Formats

### Market Data Tick

```
TICK <symbol> <price> <volume> <timestamp_ns>
```

Example:
```
TICK BTC/USD 50000.0 100 1640995200000000000
```

### Order Request

```
ORDER_REQUEST <symbol> <side> <type> <price> <quantity>
```

Example:
```
ORDER_REQUEST BTC/USD 0 0 50000.0 1
```

### Order Update

```
ORDER_UPDATE <order_id> <symbol> <side> <type> <price> <quantity> <filled_qty> <status> <client_id>
```

Example:
```
ORDER_UPDATE 12345 BTC/USD 0 0 50000.0 1 0 2 client123
```

## Configuration

### IPC Manager Configuration

```cpp
#include "ipc/ipc_manager.h"

phoenix::ipc::IpcManager::Config config;
config.market_data_endpoint = "ipc:///tmp/phoenix_market_data";
config.orders_endpoint = "ipc:///tmp/phoenix_orders";
config.control_endpoint = "ipc:///tmp/phoenix_control";
config.io_threads = 1;
config.high_water_mark = 1000;

IpcManager ipc_manager(engine, config);
ipc_manager.start();
```

### Network Endpoints

The IPC layer supports multiple transport protocols:

- **IPC (Inter-Process Communication)**: `ipc:///tmp/phoenix_market_data`
- **TCP**: `tcp://localhost:5555`
- **In-Process**: `inproc://test`

For production deployments, TCP is recommended for network communication.

## Performance

### Benchmarks

Run the IPC benchmarks to measure performance:

```bash
cd python/benchmarks
python bench_ipc.py
```

### Expected Performance

- **Serialization**: < 5 μs average
- **Deserialization**: < 5 μs average
- **Order Submission**: < 100 μs average
- **Control Requests**: < 100 μs average
- **Tick Processing**: < 50 μs average per strategy

### Optimization Tips

1. **Use TCP for network communication** when running on different machines
2. **Adjust high-water mark** based on your message volume
3. **Batch operations** when possible to reduce overhead
4. **Use context managers** for proper resource cleanup

## Testing

### C++ Tests

```bash
cd build
ctest --output-on-failure -R "test_ipc"
```

### Python Tests

```bash
cd python
pytest tests/test_ipc.py -v
pytest tests/test_remote_engine.py -v
```

### Integration Tests

```bash
# Start engine with IPC enabled
./phoenix_engine --enable-ipc

# Run integration tests
python tests/test_remote_engine.py::TestRemoteEngineIntegration::test_end_to_end_simulation
```

## Troubleshooting

### Common Issues

1. **Connection refused**: Ensure the engine is running with IPC enabled
2. **Permission denied**: Check IPC endpoint permissions
3. **Message loss**: Increase high-water mark or check network capacity
4. **High latency**: Use TCP instead of IPC for network communication

### Debug Mode

Enable debug logging:

```cpp
// In C++
spdlog::set_level(spdlog::level::debug);
```

```python
# In Python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Security Considerations

### Network Security

- Use **TLS/SSL** for TCP connections in production
- Implement **authentication** for remote clients
- Use **firewalls** to restrict access to IPC endpoints
- **Validate** all incoming messages

### Data Protection

- **Encrypt** sensitive order data
- **Sanitize** input messages to prevent injection attacks
- **Rate limit** client requests to prevent DoS attacks
- **Audit** all IPC communications

## Future Development

### Phase 4 Enhancements

- **gRPC backend** for external connectivity
- **Message encryption** using libsodium
- **Load balancing** for multiple engine instances
- **Fault tolerance** and automatic reconnection
- **Performance monitoring** and metrics collection

### Extending the IPC Layer

1. **Add new message types** in `capnp_schema.capnp`
2. **Implement serialization** in `ipc_manager.cpp`
3. **Add client methods** in `client.py`
4. **Write tests** for new functionality
5. **Update documentation**

## API Reference

### RemoteEngine Class

```python
class RemoteEngine:
    def __init__(self, market_data_url="ipc:///tmp/phoenix_market_data",
                 orders_url="ipc:///tmp/phoenix_orders",
                 control_url="ipc:///tmp/phoenix_control",
                 context=None)
    
    def connect(self) -> bool
    def disconnect(self)
    def subscribe_ticks(self, callback: Callable)
    def start(self)
    def stop(self)
    def submit_order(self, order: Dict[str, Any]) -> Optional[int]
    def get_portfolio(self) -> Optional[Dict[str, Any]]
    def get_risk_status(self) -> Optional[Dict[str, Any]]
    def get_stats(self) -> Dict[str, Any]
```

### IpcStrategyRunner Class

```python
class IpcStrategyRunner:
    def __init__(self, market_data_url="ipc:///tmp/phoenix_market_data",
                 orders_url="ipc:///tmp/phoenix_orders",
                 control_url="ipc:///tmp/phoenix_control")
    
    def add_strategy(self, strategy: Strategy)
    def start(self) -> bool
    def stop(self)
    def submit_order(self, order: Dict[str, Any]) -> Optional[int]
    def get_portfolio(self) -> Optional[Dict[str, Any]]
    def get_risk_status(self) -> Optional[Dict[str, Any]]
    def get_stats(self) -> Dict[str, Any]
    def wait_for_completion(self, timeout: Optional[float] = None)
```

## Contributing

When contributing to the IPC layer:

1. **Follow the existing code style**
2. **Add tests for new functionality**
3. **Update documentation**
4. **Run benchmarks** to ensure no performance regression
5. **Test on multiple platforms** (Linux, Windows)

## License

This IPC layer is part of the Phoenix AI Trading System and follows the same licensing terms.
