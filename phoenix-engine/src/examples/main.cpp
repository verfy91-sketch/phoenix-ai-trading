#include "engine.h"
#include "feeds/simulated_feed.h"
#include "execution/simulated_gateway.h"
#include "utils/logging.h"
#include <iostream>
#include <thread>
#include <chrono>

using namespace phoenix;

int main() {
    LOG_INFO("Starting Phoenix Engine Example");
    
    // Create sample tick data
    std::ofstream tick_file("sample_ticks.csv");
    for (int i = 0; i < 100; ++i) {
        tick_file << (i * 1000000) << " BTC/USD " << (50000.0 + i * 10.0) << " 1\n";
    }
    tick_file.close();
    
    // Create engine
    Engine engine;
    
    // Set up simulated feed
    auto feed = std::make_unique<SimulatedFeed>(1000.0); // 1000x speed
    if (!feed->connect("sample_ticks.csv")) {
        LOG_ERROR("Failed to connect to feed file");
        return 1;
    }
    engine.set_feed_handler(std::move(feed));
    
    // Set up simulated gateway
    engine.set_gateway(std::make_unique<SimulatedGateway>());
    
    // Initialize and start
    if (!engine.init()) {
        LOG_ERROR("Failed to initialize engine");
        return 1;
    }
    
    engine.start();
    
    // Run for 5 seconds
    std::this_thread::sleep_for(std::chrono::seconds(5));
    
    // Stop
    engine.stop();
    
    // Clean up
    std::remove("sample_ticks.csv");
    
    LOG_INFO("Phoenix Engine Example completed");
    return 0;
}
