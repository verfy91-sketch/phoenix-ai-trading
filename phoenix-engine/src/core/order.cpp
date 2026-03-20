#include "core/order.h"

namespace phoenix {

uint64_t OrderManager::submit_order(const Order& order) {
    std::lock_guard<std::mutex> lock(mutex_);
    uint64_t id = next_order_id_++;
    Order o = order;
    o.order_id = id;
    orders_[id] = o;
    return id;
}

bool OrderManager::cancel_order(uint64_t order_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = orders_.find(order_id);
    if (it == orders_.end()) return false;
    if (it->second.status != OrderStatus::PENDING && it->second.status != OrderStatus::OPEN)
        return false;
    it->second.status = OrderStatus::CANCELLED;
    return true;
}

Order* OrderManager::get_order(uint64_t order_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = orders_.find(order_id);
    return (it != orders_.end()) ? &it->second : nullptr;
}

const std::vector<Order>& OrderManager::get_all_orders() const {
    std::lock_guard<std::mutex> lock(mutex_);
    static std::vector<Order> all;
    all.clear();
    for (const auto& [_, order] : orders_) all.push_back(order);
    return all;
}

} // namespace phoenix
