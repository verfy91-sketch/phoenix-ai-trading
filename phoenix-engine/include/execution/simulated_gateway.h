#pragma once

#include "gateway.h"
#include <random>

namespace phoenix {

class SimulatedGateway : public ExecutionGateway {
public:
    SimulatedGateway(double fill_probability = 0.7, double avg_delay_ms = 10.0);
    bool connect(const std::string& endpoint) override;
    bool send_order(const Order& order) override;
    bool cancel_order(uint64_t order_id) override;
    void start() override;
    void stop() override;
    ConcurrentQueue<OrderUpdate>& get_update_queue() override { return update_queue_; }

private:
    void run();
    std::thread thread_;
    std::atomic<bool> running_;
    ConcurrentQueue<Order> pending_orders_;
    ConcurrentQueue<OrderUpdate> update_queue_;
    double fill_probability_;
    double avg_delay_ms_;
    std::mt19937 rng_;
};

} // namespace phoenix
