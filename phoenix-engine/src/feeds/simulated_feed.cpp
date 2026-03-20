#include "feeds/simulated_feed.h"
#include "utils/logging.h"
#include <fstream>
#include <sstream>
#include <chrono>
#include <thread>
#include <cstdlib>

namespace phoenix {

SimulatedFeed::SimulatedFeed(double speed_factor)
    : speed_factor_(speed_factor), running_(false) {}

bool SimulatedFeed::connect(const std::string& file_path) {
    // Check for environment variable first
    const char* env_path = std::getenv("PHOENIX_DATA_FILE");
    if (env_path != nullptr) {
        file_path_ = std::string(env_path);
        LOG_INFO("Using data file from environment: " + file_path_);
    } else {
        file_path_ = file_path.empty() ? "data/market_data.csv" : file_path;
        LOG_INFO("Using data file: " + file_path_);
    }
    
    // Check if file exists
    std::ifstream f(file_path_);
    return f.good();
}

void SimulatedFeed::start() {
    if (running_) return;
    running_ = true;
    thread_ = std::thread(&SimulatedFeed::run, this);
}

void SimulatedFeed::stop() {
    running_ = false;
    if (thread_.joinable()) thread_.join();
}

void SimulatedFeed::run() {
    LOG_INFO("Starting simulated feed with continuous looping");
    
    while (running_) {
        std::ifstream file(file_path_);
        if (!file.is_open()) {
            LOG_ERROR("Failed to open file: " + file_path_);
            std::this_thread::sleep_for(std::chrono::seconds(1));
            continue; // Retry after 1 second
        }

        std::string line;
        Timestamp last_timestamp = 0;
        int line_count = 0;
        
        while (running_ && std::getline(file, line)) {
            if (line.empty() || line[0] == '#') continue;

            std::istringstream ss(line);
            Tick tick;
            std::string symbol;
            uint64_t ts;
            double price;
            uint32_t vol;
            if (!(ss >> ts >> symbol >> price >> vol)) {
                LOG_ERROR("Invalid line format: " + line);
                continue;
            }
            tick.timestamp_ns = ts;
            tick.symbol = symbol;
            tick.price = price;
            tick.volume = vol;

            // Simulate real-time by sleeping according to timestamps.
            if (last_timestamp != 0) {
                auto delta = ts - last_timestamp;
                if (delta > 0) {
                    auto sleep_us = static_cast<long>(delta / 1000 / speed_factor_);
                    if (sleep_us > 0) {
                        std::this_thread::sleep_for(std::chrono::microseconds(sleep_us));
                    }
                }
            }
            last_timestamp = ts;

            queue_.enqueue(tick);
            line_count++;
        }
        
        file.close();
        
        if (running_) {
            LOG_INFO("Completed one cycle of data (" + std::to_string(line_count) + " ticks). Restarting from beginning...");
            // Small delay before restarting to prevent tight loop
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
    }
    
    LOG_INFO("Simulated feed stopped.");
}

} // namespace phoenix
