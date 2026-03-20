# Phoenix AI Trading System – C++ Core Engine

This is the ultra-low-latency trading engine for the Phoenix AI Trading System. It is designed for speed, determinism, and zero-copy data flow.

## Build Instructions

### Prerequisites
- CMake 3.20+
- C++20 compiler (GCC 13+, Clang 16+, MSVC 2022)
- Git (for fetching dependencies)

### Build
```bash
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build .
```

### Run Tests
```bash
cd build
ctest
```

### Run Benchmarks
```bash
./build/phoenix_benchmarks
```

## Directory Structure
- `include/` – public headers
- `src/` – implementation
- `tests/` – unit tests (Google Test)
- `benchmarks/` – performance benchmarks (Google Benchmark)
- `scripts/` – helper scripts (e.g., huge page setup)

## Features
- Structure-of-Arrays (SoA) market data storage
- Lock-free queues for inter-thread communication
- Memory pools for fixed-size objects
- Simulated file-based market data feed
- Simulated exchange gateway (random fills)
- Technical indicators (RSI)
- Thread-safe portfolio and risk manager
- Main Engine class orchestrating threads

## Next Steps
The engine will be extended with:
- Python bindings (Pybind11)
- IPC via ZeroMQ and Cap'n Proto
- gRPC server for backend communication
