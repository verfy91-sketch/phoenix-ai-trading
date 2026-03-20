#pragma once

#include "core/types.h"
#include "utils/concurrent_queue.h"
#include <string>
#include <thread>
#include <atomic>

namespace phoenix {

struct OrderUpdate {
    uint64_t order_id;
    OrderStatus status;
    Quantity filled_qty;
    Price avg_fill_price;
};

class ExecutionGateway {
public:
    virtual ~ExecutionGateway() = default;
    virtual bool connect(const std::string& endpoint) = 0;
    virtual bool send_order(const Order& order) = 0;
    virtual bool cancel_order(uint64_t order_id) = 0;
    virtual void start() = 0;
    virtual void stop() = 0;
    virtual ConcurrentQueue<OrderUpdate>& get_update_queue() = 0;
};

} // namespace phoenix
