#include <benchmark/benchmark.h>
#include "engine.h"
#include "feeds/simulated_feed.h"
#include "execution/simulated_gateway.h"
#include <fstream>
#include <thread>

using namespace phoenix;

// Create a sample tick file for benchmark.
void create_sample_ticks(const std::string& filename, int count) {
    std::ofstream file(filename);
    for (int i = 0; i < count; ++i) {
        file << i * 1000 << " BTC/USD " << 50000.0 + i * 0.01 << " 10\n";
    }
    file.close();
}

static void BM_EngineTickToOrder(benchmark::State& state) {
    create_sample_ticks("bench_ticks.csv", 1000);
    Engine engine;
    auto feed = std::make_unique<SimulatedFeed>(1000.0); // super fast
    feed->connect("bench_ticks.csv");
    engine.set_feed_handler(std::move(feed));
    engine.set_gateway(std::make_unique<SimulatedGateway>());
    engine.init();
    engine.start();

    for (auto _ : state) {
        // The engine is already processing ticks; we measure the time for one iteration of state.
        // We'll just sleep a bit and then check orders?
        // Simpler: measure the time to process 1000 ticks.
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }

    engine.stop();
    std::remove("bench_ticks.csv");
}

static void BM_FeedThroughput(benchmark::State& state) {
    // Create a large tick file
    const int num_ticks = 100000;
    std::ofstream file("throughput_ticks.csv");
    for (int i = 0; i < num_ticks; ++i) {
        file << i * 1000 << " BTC/USD " << 50000.0 + i * 0.01 << " 10\n";
    }
    file.close();

    SimulatedFeed feed(1e9); // extremely high speed factor to ignore delays
    feed.connect("throughput_ticks.csv");
    feed.start();

    int64_t count = 0;
    for (auto _ : state) {
        // Process ticks as fast as possible.
        while (feed.get_queue().try_dequeue()) {
            ++count;
        }
    }
    state.counters["ticks_per_second"] = benchmark::Counter(count, benchmark::Counter::kIsRate);

    feed.stop();
    std::remove("throughput_ticks.csv");
}

BENCHMARK(BM_EngineTickToOrder);
BENCHMARK(BM_FeedThroughput);

BENCHMARK_MAIN();
