"""
IPC performance benchmarks for Phoenix AI Trading System.

This module provides comprehensive performance benchmarks for the IPC layer,
measuring latency, throughput, and resource usage under various conditions.
"""

import time
import statistics
import threading
import socket
import json
import psutil
import os
from typing import List, Dict, Any, Optional
from phoenix_ipc import RemoteEngine
from phoenix_ipc.messages import make_request


class IpcBenchmark:
    """
    IPC performance benchmark suite.
    
    Measures various performance metrics including:
    - Round-trip latency for different request types
    - Throughput for sustained operations
    - Memory usage during operation
    - CPU utilization during operation
    """
    
    def __init__(self, host: str = 'localhost', port: int = 5555):
        self.host = host
        self.port = port
        self.results = {}
        
    def run_all_benchmarks(self) -> Dict[str, Any]:
        """
        Run all IPC benchmarks and return results.
        
        Returns:
            Dictionary containing all benchmark results
        """
        print("Starting IPC Performance Benchmarks")
        print("=" * 40)
        
        # Mock server for benchmarks
        with self._mock_server():
            engine = RemoteEngine(self.host, self.port)
            
            try:
                engine._connect()
                
                # Run individual benchmarks
                self.results['order_submission'] = self._benchmark_order_submission(engine)
                self.results['portfolio_queries'] = self._benchmark_portfolio_queries(engine)
                self.results['risk_queries'] = self._benchmark_risk_queries(engine)
                self.results['stats_queries'] = self._benchmark_stats_queries(engine)
                self.results['throughput'] = self._benchmark_throughput(engine)
                self.results['concurrent_clients'] = self._benchmark_concurrent_clients()
                
                # Generate summary
                self._print_summary()
                
                return self.results
                
            finally:
                engine.stop()
    
    def _mock_server(self):
        """Create a mock server for testing."""
        class MockServer:
            def __init__(self, port):
                self.port = port
                self.running = False
                self.socket = None
                self.thread = None
                
            def start(self):
                self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                self.socket.bind(('localhost', self.port))
                self.socket.listen(5)
                self.running = True
                self.thread = threading.Thread(target=self._serve, daemon=True)
                self.thread.start()
                
            def _serve(self):
                while self.running:
                    try:
                        client, addr = self.socket.accept()
                        threading.Thread(target=self._handle_client, args=(client,), daemon=True).start()
                    except:
                        break
                        
            def _handle_client(self, client):
                try:
                    while self.running:
                        data = client.recv(4096)
                        if not data:
                            break
                            
                        # Parse request and send immediate response
                        try:
                            req = json.loads(data.decode().strip())
                            if 'method' in req:
                                response = {
                                    'id': req.get('id', 0),
                                    'type': 'response',
                                    'result': self._get_mock_result(req['method']),
                                    'error': None
                                }
                                client.send((json.dumps(response) + '\n').encode())
                        except:
                            pass
                except:
                    pass
                finally:
                    client.close()
                    
            def _get_mock_result(self, method):
                """Generate mock results for different methods."""
                if method == 'submitOrder':
                    return {'order_id': 12345}
                elif method == 'getPortfolio':
                    return {
                        'balance': 10000.0,
                        'unrealized_pnl': 500.0,
                        'realized_pnl': 200.0,
                        'total_value': 10700.0,
                        'positions': []
                    }
                elif method == 'getRiskStatus':
                    return {
                        'max_position_size': 100.0,
                        'max_order_size': 10.0,
                        'max_daily_loss': 1000.0,
                        'current_daily_loss': 0.0,
                        'risk_level': 0,
                        'blocked': False
                    }
                elif method == 'getStats':
                    return {
                        'uptime_ns': 3600000000000,
                        'ticks_processed': 10000,
                        'orders_submitted': 100,
                        'orders_filled': 95,
                        'total_volume': 1000.0,
                        'total_turnover': 50000000.0,
                        'avg_fill_rate': 0.95
                    }
                return {}
                
            def stop(self):
                self.running = False
                if self.socket:
                    self.socket.close()
                if self.thread:
                    self.thread.join(timeout=1)
        
        import contextlib
        
        @contextlib.contextmanager
        def mock_server_context():
            server = MockServer(self.port)
            server.start()
            time.sleep(0.1)  # Give server time to start
            try:
                yield server
            finally:
                server.stop()
        
        return mock_server_context()
    
    def _benchmark_order_submission(self, engine: RemoteEngine) -> Dict[str, Any]:
        """Benchmark order submission latency."""
        print("\nBenchmarking Order Submission...")
        
        latencies = []
        iterations = 1000
        
        for i in range(iterations):
            start_time = time.perf_counter()
            
            try:
                order_id = engine.submit_order({
                    'symbol': 'BTC/USD',
                    'side': 0,  # BUY
                    'type': 0,   # MARKET
                    'price': 50000.0 + (i % 1000),
                    'quantity': 1.0
                })
                end_time = time.perf_counter()
                latencies.append((end_time - start_time) * 1000)  # Convert to ms
            except:
                pass
            
            if i % 100 == 0:
                print(f"  Progress: {i}/{iterations}")
        
        return {
            'iterations': iterations,
            'avg_latency_ms': statistics.mean(latencies),
            'median_latency_ms': statistics.median(latencies),
            'p95_latency_ms': statistics.quantiles(latencies, n=10)[8],  # 95th percentile
            'p99_latency_ms': statistics.quantiles(latencies, n=10)[9],  # 99th percentile
            'min_latency_ms': min(latencies),
            'max_latency_ms': max(latencies)
        }
    
    def _benchmark_portfolio_queries(self, engine: RemoteEngine) -> Dict[str, Any]:
        """Benchmark portfolio query latency."""
        print("\nBenchmarking Portfolio Queries...")
        
        latencies = []
        iterations = 500
        
        for i in range(iterations):
            start_time = time.perf_counter()
            
            try:
                portfolio = engine.get_portfolio()
                end_time = time.perf_counter()
                latencies.append((end_time - start_time) * 1000)
            except:
                pass
            
            if i % 50 == 0:
                print(f"  Progress: {i}/{iterations}")
        
        return {
            'iterations': iterations,
            'avg_latency_ms': statistics.mean(latencies),
            'median_latency_ms': statistics.median(latencies),
            'p95_latency_ms': statistics.quantiles(latencies, n=10)[8],
            'p99_latency_ms': statistics.quantiles(latencies, n=10)[9]
        }
    
    def _benchmark_risk_queries(self, engine: RemoteEngine) -> Dict[str, Any]:
        """Benchmark risk status query latency."""
        print("\nBenchmarking Risk Status Queries...")
        
        latencies = []
        iterations = 500
        
        for i in range(iterations):
            start_time = time.perf_counter()
            
            try:
                risk = engine.get_risk_status()
                end_time = time.perf_counter()
                latencies.append((end_time - start_time) * 1000)
            except:
                pass
            
            if i % 50 == 0:
                print(f"  Progress: {i}/{iterations}")
        
        return {
            'iterations': iterations,
            'avg_latency_ms': statistics.mean(latencies),
            'median_latency_ms': statistics.median(latencies),
            'p95_latency_ms': statistics.quantiles(latencies, n=10)[8],
            'p99_latency_ms': statistics.quantiles(latencies, n=10)[9]
        }
    
    def _benchmark_stats_queries(self, engine: RemoteEngine) -> Dict[str, Any]:
        """Benchmark stats query latency."""
        print("\nBenchmarking Stats Queries...")
        
        latencies = []
        iterations = 500
        
        for i in range(iterations):
            start_time = time.perf_counter()
            
            try:
                stats = engine.get_stats()
                end_time = time.perf_counter()
                latencies.append((end_time - start_time) * 1000)
            except:
                pass
            
            if i % 50 == 0:
                print(f"  Progress: {i}/{iterations}")
        
        return {
            'iterations': iterations,
            'avg_latency_ms': statistics.mean(latencies),
            'median_latency_ms': statistics.median(latencies),
            'p95_latency_ms': statistics.quantiles(latencies, n=10)[8],
            'p99_latency_ms': statistics.quantiles(latencies, n=10)[9]
        }
    
    def _benchmark_throughput(self, engine: RemoteEngine) -> Dict[str, Any]:
        """Benchmark sustained throughput."""
        print("\nBenchmarking Throughput...")
        
        duration = 10.0  # 10 seconds
        start_time = time.perf_counter()
        end_time = start_time + duration
        request_count = 0
        
        while time.perf_counter() < end_time:
            try:
                engine.submit_order({
                    'symbol': 'BTC/USD',
                    'side': 0,
                    'type': 0,
                    'price': 50000.0,
                    'quantity': 1.0
                })
                request_count += 1
            except:
                pass
            
            # Small delay to prevent overwhelming
            time.sleep(0.001)
        
        actual_duration = time.perf_counter() - start_time
        throughput = request_count / actual_duration
        
        return {
            'duration_s': actual_duration,
            'total_requests': request_count,
            'requests_per_second': throughput,
            'requests_per_minute': throughput * 60
        }
    
    def _benchmark_concurrent_clients(self) -> Dict[str, Any]:
        """Benchmark concurrent client performance."""
        print("\nBenchmarking Concurrent Clients...")
        
        num_clients = 10
        requests_per_client = 100
        results = []
        
        def client_worker(client_id):
            """Worker function for each client."""
            try:
                with RemoteEngine(self.host, self.port) as engine:
                    latencies = []
                    
                    for i in range(requests_per_client):
                        start_time = time.perf_counter()
                        
                        try:
                            engine.submit_order({
                                'symbol': 'BTC/USD',
                                'side': 0,
                                'type': 0,
                                'price': 50000.0 + (client_id * 100) + i,
                                'quantity': 1.0
                            })
                            end_time = time.perf_counter()
                            latencies.append((end_time - start_time) * 1000)
                        except:
                            pass
                    
                    if latencies:
                        results.append({
                            'client_id': client_id,
                            'avg_latency_ms': statistics.mean(latencies),
                            'requests_completed': len(latencies)
                        })
            except:
                results.append({
                    'client_id': client_id,
                    'avg_latency_ms': float('inf'),
                    'requests_completed': 0
                })
        
        # Start all client workers
        threads = []
        start_time = time.perf_counter()
        
        for i in range(num_clients):
            thread = threading.Thread(target=client_worker, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        end_time = time.perf_counter()
        total_duration = end_time - start_time
        
        # Calculate aggregate statistics
        all_latencies = [r['avg_latency_ms'] for r in results if r['avg_latency_ms'] != float('inf')]
        total_requests = sum(r['requests_completed'] for r in results)
        
        return {
            'num_clients': num_clients,
            'total_duration_s': total_duration,
            'total_requests': total_requests,
            'avg_client_latency_ms': statistics.mean(all_latencies) if all_latencies else float('inf'),
            'requests_per_second': total_requests / total_duration,
            'successful_clients': len([r for r in results if r['requests_completed'] > 0])
        }
    
    def _measure_system_resources(self) -> Dict[str, Any]:
        """Measure current system resource usage."""
        process = psutil.Process(os.getpid())
        
        return {
            'cpu_percent': process.cpu_percent(),
            'memory_mb': process.memory_info().rss / 1024 / 1024,
            'memory_percent': process.memory_percent(),
            'num_threads': process.num_threads(),
            'open_files': process.num_fds()
        }
    
    def _print_summary(self):
        """Print benchmark results summary."""
        print("\n" + "=" * 40)
        print("IPC PERFORMANCE BENCHMARK RESULTS")
        print("=" * 40)
        
        # Order submission results
        if 'order_submission' in self.results:
            order = self.results['order_submission']
            print(f"\nOrder Submission ({order['iterations']} iterations):")
            print(f"  Average Latency: {order['avg_latency_ms']:.3f} ms")
            print(f"  Median Latency:  {order['median_latency_ms']:.3f} ms")
            print(f"  95th Percentile: {order['p95_latency_ms']:.3f} ms")
            print(f"  99th Percentile: {order['p99_latency_ms']:.3f} ms")
            print(f"  Min/Max: {order['min_latency_ms']:.3f}/{order['max_latency_ms']:.3f} ms")
        
        # Query results
        for query_type in ['portfolio_queries', 'risk_queries', 'stats_queries']:
            if query_type in self.results:
                query = self.results[query_type]
                name = query_type.replace('_', ' ').title()
                print(f"\n{name} ({query['iterations']} iterations):")
                print(f"  Average Latency: {query['avg_latency_ms']:.3f} ms")
                print(f"  Median Latency:  {query['median_latency_ms']:.3f} ms")
                print(f"  95th Percentile: {query['p95_latency_ms']:.3f} ms")
                print(f"  99th Percentile: {query['p99_latency_ms']:.3f} ms")
        
        # Throughput results
        if 'throughput' in self.results:
            throughput = self.results['throughput']
            print(f"\nThroughput ({throughput['duration_s']:.1f}s duration):")
            print(f"  Total Requests: {throughput['total_requests']}")
            print(f"  Requests/Second: {throughput['requests_per_second']:.1f}")
            print(f"  Requests/Minute: {throughput['requests_per_minute']:.1f}")
        
        # Concurrent client results
        if 'concurrent_clients' in self.results:
            concurrent = self.results['concurrent_clients']
            print(f"\nConcurrent Clients ({concurrent['num_clients']} clients):")
            print(f"  Total Duration: {concurrent['total_duration_s']:.1f}s")
            print(f"  Total Requests: {concurrent['total_requests']}")
            print(f"  Requests/Second: {concurrent['requests_per_second']:.1f}")
            print(f"  Successful Clients: {concurrent['successful_clients']}/{concurrent['num_clients']}")
            if concurrent['avg_client_latency_ms'] != float('inf'):
                print(f"  Avg Client Latency: {concurrent['avg_client_latency_ms']:.3f} ms")
        
        # System resources
        resources = self._measure_system_resources()
        print(f"\nSystem Resources:")
        print(f"  CPU Usage: {resources['cpu_percent']:.1f}%")
        print(f"  Memory Usage: {resources['memory_mb']:.1f} MB ({resources['memory_percent']:.1f}%)")
        print(f"  Threads: {resources['num_threads']}")
        print(f"  Open Files: {resources['open_files']}")
        
        # Performance targets
        print(f"\nPerformance Targets:")
        print(f"  Order Submission Latency: < 100 μs (0.1 ms)")
        print(f"  Query Latency: < 50 μs (0.05 ms)")
        print(f"  Throughput: > 1000 requests/second")
        
        # Assessment
        self._assess_performance()
    
    def _assess_performance(self):
        """Assess performance against targets."""
        print(f"\nPerformance Assessment:")
        
        if 'order_submission' in self.results:
            avg_latency = self.results['order_submission']['avg_latency_ms']
            if avg_latency < 0.1:
                print("  Order submission latency meets target")
            else:
                print(f"  Order submission latency exceeds target ({avg_latency:.3f} ms > 0.1 ms)")
        
        if 'throughput' in self.results:
            throughput = self.results['throughput']['requests_per_second']
            if throughput > 1000:
                print("  Throughput meets target")
            else:
                print(f"  Throughput below target ({throughput:.1f} < 1000 req/s)")


def main():
    """Run IPC benchmarks."""
    benchmark = IpcBenchmark()
    results = benchmark.run_all_benchmarks()
    
    # Save results to file
    import json
    with open('ipc_benchmark_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nResults saved to ipc_benchmark_results.json")


if __name__ == "__main__":
    main()
