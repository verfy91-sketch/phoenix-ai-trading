#pragma once

#include "feed_handler.h"
#include <fstream>
#include <chrono>
#include <thread>

namespace phoenix {

class SimulatedFeed : public FeedHandler {
public:
    SimulatedFeed(double speed_factor = 1.0);
    bool connect(const std::string& file_path) override;
    void start() override;
    void stop() override;
    ConcurrentQueue<Tick>& get_queue() override { return queue_; }

private:
    void run();
    std::string file_path_;
    double speed_factor_;
    std::thread thread_;
    std::atomic<bool> running_;
    ConcurrentQueue<Tick> queue_;
};

} // namespace phoenix
