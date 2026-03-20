#include "execution/simulated_gateway.h"
#include "utils/logging.h"
#include <chrono>
#include <random>

namespace phoenix {

SimulatedGateway::SimulatedGateway(double fill_probability, double avg_delay_ms)
    : fill_probability_(fill_probability), avg_delay_ms_(avg_delay_ms),
      rng_(std::random_device{}()), running_(false) {}

bool SimulatedGateway::connect(const std::string& endpoint) {
    // Always succeed in simulated mode.
    (void)endpoint;
    return true;
}

bool SimulatedGateway::send_order(const Order& order) {
    pending_orders_.enqueue(order);
    return true;
}

bool SimulatedGateway::cancel_order(uint64_t order_id) {
    // In simulation, cancellation not implemented; we could mark it.
    // For simplicity, just ignore.
    (void)order_id;
    return true;
}

void SimulatedGateway::start() {
    if (running_) return;
    running_ = true;
    thread_ = std::thread(&SimulatedGateway::run, this);
}

void SimulatedGateway::stop() {
    running_ = false;
    if (thread_.joinable()) thread_.join();
}

void SimulatedGateway::run() {
    std::uniform_real_distribution<double> dist(0.0, 1.0);
    std::normal_distribution<double> delay_dist(avg_delay_ms_, avg_delay_ms_ / 2.0);

    while (running_) {
        auto maybe_order = pending_orders_.try_dequeue();
        if (maybe_order) {
            Order order = *maybe_order;
            // Simulate processing delay.
            double delay_ms = delay_dist(rng_);
            if (delay_ms < 0) delay_ms = 0;
            std::this_thread::sleep_for(std::chrono::milliseconds(static_cast<long>(delay_ms)));

            OrderUpdate update;
            update.order_id = order.order_id;
            if (dist(rng_) < fill_probability_) {
                update.status = OrderStatus::FILLED;
                update.filled_qty = order.quantity;
                update.avg_fill_price = order.price;  // For simplicity, fill at order price.
            } else {
                update.status = OrderStatus::REJECTED;
                update.filled_qty = 0;
            }
            update_queue_.enqueue(update);
        } else {
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
        }
    }
}

} // namespace phoenix
