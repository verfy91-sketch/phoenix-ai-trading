"""
Phoenix AI Trading System - Python Strategy Layer

This package provides Python bindings for the ultra-low-latency C++ trading engine,
allowing you to develop and run trading strategies in Python.

## Building

From the `phoenix-engine` directory:

```bash
mkdir build && cd build
cmake .. -DBUILD_PYTHON_BINDINGS=ON
cmake --build .
```

The Python module will be generated in `build/python/`. Add that directory to your 
PYTHONPATH or copy it to your site-packages.

## Usage

```python
import phoenix_engine as pe

# Create engine
engine = pe.Engine()
engine.init()

# Create a strategy
from strategies.rsi_example import RSIStrategy
strat = RSIStrategy("my_rsi", "BTC/USD", quantity=1)

# Run with runner
from strategies.runner import StrategyRunner
runner = StrategyRunner(engine)
runner.add_strategy(strat)
runner.start()

# Engine will run and call your strategy on each tick
# Stop when done
runner.stop()
```

## Testing

```bash
cd python
pip install -r requirements.txt
pytest tests/
```

## Benchmarking

```bash
cd python
python benchmarks/bench_overhead.py
```

## Architecture

The Python layer provides:

- **Strategy Base Class**: Abstract base for implementing trading strategies
- **Strategy Runner**: Manages multiple strategies and dispatches ticks
- **Example Strategies**: Including RSI mean-reversion strategy
- **Full Engine Access**: Complete access to C++ engine components

## Features

- Ultra-low-latency C++ core with Python strategy interface
- Thread-safe operations with proper GIL management
- Complete access to portfolio, risk management, and order management
- Technical indicators (RSI) with minimal overhead
- Comprehensive testing and benchmarking

## Future Development

Phase 3 will add:
- IPC via ZeroMQ/Cap'n Proto for distributed deployment
- gRPC backend for external connectivity
- Advanced strategy composition and backtesting framework
