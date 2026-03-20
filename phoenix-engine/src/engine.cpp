#include "engine.h"
#include "feeds/simulated_feed.h"
#include "execution/simulated_gateway.h"
#include "utils/logging.h"
#include <chrono>
#include <thread>

namespace phoenix {

Engine::Engine() : running_(false) {}

Engine::~Engine() {
    stop();
}

bool Engine::init(const std::string& config_file) {
    // For now, just create default components if not set.
    if (!feed_) {
        feed_ = std::make_unique<SimulatedFeed>();
        // Initialize with default market data file
        if (!feed_->connect("market_data.csv")) {
            // Create a simple default data file if it doesn't exist
            std::ofstream default_file("market_data.csv");
            default_file << "symbol,price,volume,timestamp_ns\n";
            default_file << "AAPL,150.25,100,1647691200000000000\n";
            default_file << "AAPL,150.30,200,1647691200000001000\n";
            default_file.close();
            
            // Try connecting again
            feed_->connect("market_data.csv");
        }
    }
    if (!gateway_) gateway_ = std::make_unique<SimulatedGateway>();
    if (!risk_) risk_ = std::make_unique<RiskManager>();
    if (!portfolio_) portfolio_ = std::make_unique<Portfolio>();
    if (!order_mgr_) order_mgr_ = std::make_unique<OrderManager>();

    // If config_file provided, could load settings.
    (void)config_file;
    return true;
}

void Engine::start() {
    if (running_) return;
    running_ = true;

    // Start feed and gateway threads.
    feed_->start();
    gateway_->start();

    feed_thread_ = std::thread(&Engine::feed_thread_func, this);
    gateway_thread_ = std::thread(&Engine::gateway_thread_func, this);
    strategy_thread_ = std::thread(&Engine::strategy_thread_func, this);

    LOG_INFO("Engine started.");
}

void Engine::stop() {
    if (!running_) return;
    running_ = false;

    feed_->stop();
    gateway_->stop();

    if (feed_thread_.joinable()) feed_thread_.join();
    if (gateway_thread_.joinable()) gateway_thread_.join();
    if (strategy_thread_.joinable()) strategy_thread_.join();

    LOG_INFO("Engine stopped.");
}

void Engine::set_feed_handler(std::unique_ptr<FeedHandler> handler) {
    feed_ = std::move(handler);
}

void Engine::set_gateway(std::unique_ptr<ExecutionGateway> gateway) {
    gateway_ = std::move(gateway);
}

void Engine::set_risk_manager(std::unique_ptr<RiskManager> risk) {
    risk_ = std::move(risk);
}

void Engine::set_portfolio(std::unique_ptr<Portfolio> portfolio) {
    portfolio_ = std::move(portfolio);
}

void Engine::set_order_manager(std::unique_ptr<OrderManager> order_mgr) {
    order_mgr_ = std::move(order_mgr);
}

void Engine::feed_thread_func() {
    // Pull ticks from feed handler's queue and process them.
    // For now, just forward to tick_queue_ (maybe for strategy).
    auto& feed_queue = feed_->get_queue();
    while (running_) {
        auto tick = feed_queue.try_dequeue();
        if (tick) {
            // Could process tick (e.g., update indicators, portfolio) later.
            tick_queue_.enqueue(*tick);
        } else {
            std::this_thread::sleep_for(std::chrono::microseconds(100));
        }
    }
}

void Engine::gateway_thread_func() {
    auto& update_queue = gateway_->get_update_queue();
    while (running_) {
        auto update = update_queue.try_dequeue();
        if (update) {
            // Process order updates: update portfolio, etc.
            order_update_queue_.enqueue(*update);
        } else {
            std::this_thread::sleep_for(std::chrono::microseconds(100));
        }
    }
}

void Engine::strategy_thread_func() {
    // Process ticks and call Python callback if set
    while (running_) {
        auto tick = tick_queue_.try_dequeue();
        if (tick) {
            // Call Python callback if set
            if (tick_callback_) {
                (*tick_callback_)(*tick);
            }
            
            // Dummy logic: if price > 50000, buy.
            if (tick->symbol == "BTC/USD" && tick->price > 50000.0) {
                Order order;
                order.symbol = tick->symbol;
                order.side = OrderSide::BUY;
                order.type = OrderType::MARKET;
                order.quantity = 1;
                order.price = tick->price;
                order.status = OrderStatus::PENDING;
                order.timestamp_ns = tick->timestamp_ns;
                uint64_t id = order_mgr_->submit_order(order);
                gateway_->send_order(order);
                LOG_INFO("Generated order " + std::to_string(id) + " at price " + std::to_string(tick->price));
            }
        } else {
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
        }
    }
}

void Engine::set_tick_callback(TickCallback cb) {
    tick_callback_ = cb;
}

void Engine::set_order_result_callback(OrderUpdateCallback cb) {
    order_update_callback_ = cb;
}

uint64_t Engine::submit_order_external(const Order& order, const std::string& client_id) {
    // For now, just use the regular order manager
    // In a full implementation, we would track client ID for routing updates
    return order_mgr_->submit_order(order);
}

} // namespace phoenix
