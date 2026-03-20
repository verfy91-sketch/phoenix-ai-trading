#pragma once

#include "core/portfolio.h"
#include "core/risk_manager.h"
#include "core/order.h"
#include "feeds/feed_handler.h"
#include "execution/gateway.h"
#include "utils/concurrent_queue.h"
#include <memory>
#include <thread>
#include <atomic>
#include <functional>
#include <optional>

namespace phoenix {

class Engine {
public:
    Engine();
    ~Engine();

    bool init(const std::string& config_file = "");
    void start();
    void stop();

    // Setters for components (for dependency injection)
    void set_feed_handler(std::unique_ptr<FeedHandler> handler);
    void set_gateway(std::unique_ptr<ExecutionGateway> gateway);
    void set_risk_manager(std::unique_ptr<RiskManager> risk);
    void set_portfolio(std::unique_ptr<Portfolio> portfolio);
    void set_order_manager(std::unique_ptr<OrderManager> order_mgr);

    // Accessors for other layers
    Portfolio* get_portfolio() const { return portfolio_.get(); }
    RiskManager* get_risk_manager() const { return risk_.get(); }
    OrderManager* get_order_manager() const { return order_mgr_.get(); }

    // Python callback support
    using TickCallback = std::function<void(const Tick&)>;
    using OrderUpdateCallback = std::function<void(uint64_t, const Order&)>;
    void set_tick_callback(TickCallback cb);
    void set_order_result_callback(OrderUpdateCallback cb);

    // IPC support
    void set_ipc_enabled(bool enabled) { ipc_enabled_ = enabled; }
    bool is_ipc_enabled() const { return ipc_enabled_; }
    
    // Allow external access to tick queue for IPC
    ConcurrentQueue<Tick>& get_tick_queue() { return tick_queue_; }
    
    // Submit order from external source (with client ID for routing)
    uint64_t submit_order_external(const Order& order, const std::string& client_id = "");

private:
    void feed_thread_func();
    void gateway_thread_func();
    void strategy_thread_func();   // Placeholder for now; will be replaced by Python later.

    std::unique_ptr<FeedHandler> feed_;
    std::unique_ptr<ExecutionGateway> gateway_;
    std::unique_ptr<RiskManager> risk_;
    std::unique_ptr<Portfolio> portfolio_;
    std::unique_ptr<OrderManager> order_mgr_;

    ConcurrentQueue<Tick> tick_queue_;
    ConcurrentQueue<OrderUpdate> order_update_queue_;

    std::thread feed_thread_;
    std::thread gateway_thread_;
    std::thread strategy_thread_;
    std::atomic<bool> running_;
    
    // Python callback support
    std::optional<TickCallback> tick_callback_;
    std::optional<OrderUpdateCallback> order_update_callback_;
    
    // IPC support
    bool ipc_enabled_ = false;
};

} // namespace phoenix
