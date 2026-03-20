"""
Performance benchmarks for Python strategy layer.

This script measures the overhead of calling C++ functions from Python
and the end-to-end latency of strategy execution.
"""
import time
import statistics
import phoenix_engine as pe
from strategies.rsi_example import RSIStrategy
from strategies.runner import StrategyRunner

def benchmark_rsi_overhead(iterations: int = 100000) -> float:
    """
    Benchmark the overhead of updating RSI indicator from Python.
    
    Args:
        iterations: Number of RSI updates to perform
        
    Returns:
        Average time per RSI update in microseconds
    """
    rsi = pe.RSI(14)
    
    # Warm up
    for _ in range(1000):
        rsi.update(50000.0 + _ * 0.01)
    
    # Benchmark
    times = []
    for i in range(iterations):
        start = time.perf_counter()
        rsi.update(50000.0 + i * 0.01)
        end = time.perf_counter()
        times.append((end - start) * 1e6)  # Convert to microseconds
    
    avg_time = statistics.mean(times)
    print(f"RSI Update Overhead: {avg_time:.3f} μs per call")
    print(f"Min: {min(times):.3f} μs, Max: {max(times):.3f} μs")
    return avg_time

def benchmark_order_submission_overhead(iterations: int = 10000) -> float:
    """
    Benchmark the overhead of submitting orders from Python.
    
    Args:
        iterations: Number of order submissions to perform
        
    Returns:
        Average time per order submission in microseconds
    """
    engine = pe.Engine()
    engine.init()
    order_mgr = engine.get_order_manager()
    
    # Warm up
    for _ in range(100):
        order = pe.Order()
        order.symbol = "BTC/USD"
        order.side = pe.OrderSide.BUY
        order.type = pe.OrderType.MARKET
        order.quantity = 1
        order.price = 50000.0
        order_mgr.submit_order(order)
    
    # Benchmark
    times = []
    for i in range(iterations):
        order = pe.Order()
        order.symbol = "BTC/USD"
        order.side = pe.OrderSide.BUY
        order.type = pe.OrderType.MARKET
        order.quantity = 1
        order.price = 50000.0 + i * 0.01
        
        start = time.perf_counter()
        order_mgr.submit_order(order)
        end = time.perf_counter()
        times.append((end - start) * 1e6)  # Convert to microseconds
    
    avg_time = statistics.mean(times)
    print(f"Order Submission Overhead: {avg_time:.3f} μs per call")
    print(f"Min: {min(times):.3f} μs, Max: {max(times):.3f} μs")
    
    engine.stop()
    return avg_time

def benchmark_strategy_latency(tick_count: int = 1000) -> float:
    """
    Benchmark end-to-end strategy execution latency.
    
    This measures the time from tick reception to strategy decision.
    
    Args:
        tick_count: Number of ticks to process
        
    Returns:
        Average latency per tick in microseconds
    """
    engine = pe.Engine()
    engine.init()
    
    # Create strategy
    strategy = RSIStrategy("bench_strategy", "BTC/USD", quantity=1)
    runner = StrategyRunner(engine)
    runner.add_strategy(strategy)
    
    # Track tick processing times
    tick_times = []
    
    def track_tick_callback(tick):
        start = time.perf_counter()
        strategy.on_tick(tick)  # Direct call to measure strategy logic only
        end = time.perf_counter()
        tick_times.append((end - start) * 1e6)  # Convert to microseconds
    
    # Replace callback temporarily for benchmarking
    original_callback = engine.set_tick_callback(track_tick_callback)
    
    # Generate test ticks and measure
    for i in range(tick_count):
        tick = pe.Tick()
        tick.symbol = "BTC/USD"
        tick.price = 50000.0 + i * 0.1
        tick.volume = 1
        tick.timestamp_ns = i * 1000000  # 1ms intervals
        
        track_tick_callback(tick)
    
    avg_latency = statistics.mean(tick_times)
    print(f"Strategy Processing Latency: {avg_latency:.3f} μs per tick")
    print(f"Min: {min(tick_times):.3f} μs, Max: {max(tick_times):.3f} μs")
    
    engine.stop()
    return avg_latency

def benchmark_portfolio_access(iterations: int = 100000) -> float:
    """
    Benchmark portfolio access operations.
    
    Args:
        iterations: Number of portfolio operations to perform
        
    Returns:
        Average time per operation in microseconds
    """
    engine = pe.Engine()
    engine.init()
    portfolio = engine.get_portfolio()
    
    # Set up initial state
    portfolio.set_balance(10000.0)
    portfolio.update_position("BTC/USD", 10, 50000.0)
    
    # Benchmark position queries
    times = []
    for _ in range(iterations):
        start = time.perf_counter()
        pos = portfolio.get_position("BTC/USD")
        balance = portfolio.get_balance()
        pnl = portfolio.get_unrealized_pnl("BTC/USD")
        end = time.perf_counter()
        times.append((end - start) * 1e6)  # Convert to microseconds
    
    avg_time = statistics.mean(times)
    print(f"Portfolio Access Overhead: {avg_time:.3f} μs per call")
    print(f"Min: {min(times):.3f} μs, Max: {max(times):.3f} μs")
    
    engine.stop()
    return avg_time

def run_all_benchmarks():
    """
    Run all performance benchmarks and generate a summary report.
    """
    print("=" * 60)
    print("Phoenix AI Trading System - Python Performance Benchmarks")
    print("=" * 60)
    print()
    
    print("1. RSI Indicator Update Overhead")
    print("-" * 40)
    rsi_time = benchmark_rsi_overhead()
    print()
    
    print("2. Order Submission Overhead")
    print("-" * 40)
    order_time = benchmark_order_submission_overhead()
    print()
    
    print("3. Strategy Processing Latency")
    print("-" * 40)
    strategy_time = benchmark_strategy_latency()
    print()
    
    print("4. Portfolio Access Overhead")
    print("-" * 40)
    portfolio_time = benchmark_portfolio_access()
    print()
    
    # Summary
    print("=" * 60)
    print("BENCHMARK SUMMARY")
    print("=" * 60)
    print(f"RSI Update:           {rsi_time:.3f} μs")
    print(f"Order Submission:      {order_time:.3f} μs")
    print(f"Strategy Processing:   {strategy_time:.3f} μs")
    print(f"Portfolio Access:      {portfolio_time:.3f} μs")
    print()
    
    # Performance assessment
    print("PERFORMANCE ASSESSMENT")
    print("-" * 40)
    if rsi_time < 10.0:
        print("✓ RSI updates: Excellent (< 10 μs)")
    elif rsi_time < 50.0:
        print("✓ RSI updates: Good (< 50 μs)")
    else:
        print("⚠ RSI updates: Needs optimization (> 50 μs)")
    
    if order_time < 20.0:
        print("✓ Order submission: Excellent (< 20 μs)")
    elif order_time < 100.0:
        print("✓ Order submission: Good (< 100 μs)")
    else:
        print("⚠ Order submission: Needs optimization (> 100 μs)")
    
    if strategy_time < 100.0:
        print("✓ Strategy processing: Excellent (< 100 μs)")
    elif strategy_time < 500.0:
        print("✓ Strategy processing: Good (< 500 μs)")
    else:
        print("⚠ Strategy processing: Needs optimization (> 500 μs)")

if __name__ == "__main__":
    run_all_benchmarks()
