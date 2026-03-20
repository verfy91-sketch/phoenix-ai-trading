#pragma once

#include "types.h"
#include <unordered_map>
#include <vector>
#include <mutex>

namespace phoenix {

// Simple order manager (in-memory, for testing).
// In production, orders would be persisted and sent to exchange.
class OrderManager {
public:
    uint64_t submit_order(const Order& order);
    bool cancel_order(uint64_t order_id);
    Order* get_order(uint64_t order_id);
    const std::vector<Order>& get_all_orders() const;

private:
    std::unordered_map<uint64_t, Order> orders_;
    uint64_t next_order_id_ = 1;
    mutable std::mutex mutex_;
};

} // namespace phoenix
