#pragma once

#include "ipc/zmq_helpers.h"
#include "ipc/message_types.h"
#include "engine.h"
#include <thread>
#include <atomic>
#include <unordered_map>
#include <mutex>
#include <functional>

namespace phoenix::ipc {

/**
 * @brief Manages IPC communication between engine and external processes
 * 
 * The IpcManager runs in its own thread and manages ZeroMQ sockets for:
 * - Publishing market data ticks (PUB socket)
 * - Receiving order requests and sending updates (ROUTER socket)
 * - Handling control commands (REP socket)
 * 
 * Uses Cap'n Proto for message serialization/deserialization.
 */
class IpcManager {
public:
    /**
     * @brief Configuration for IPC endpoints
     */
    struct Config {
        std::string market_data_endpoint = "ipc:///tmp/phoenix_market_data";
        std::string orders_endpoint = "ipc:///tmp/phoenix_orders";
        std::string control_endpoint = "ipc:///tmp/phoenix_control";
        int io_threads = 1;
        int high_water_mark = 1000;
    };

    /**
     * @brief Construct IpcManager
     * @param engine Pointer to the trading engine
     * @param config IPC configuration
     */
    explicit IpcManager(Engine* engine, const Config& config = Config{});

    /**
     * @brief Destructor - stops IPC manager
     */
    ~IpcManager();

    /**
     * @brief Start IPC communication
     * @return true if successful, false on error
     */
    bool start();

    /**
     * @brief Stop IPC communication
     */
    void stop();

    /**
     * @brief Check if IPC manager is running
     * @return true if running, false otherwise
     */
    bool is_running() const { return running_.load(); }

    /**
     * @brief Publish a market data tick
     * @param tick Market data tick to publish
     * @return true if successful, false on error
     */
    bool publish_tick(const Tick& tick);

    /**
     * @brief Send order update to specific client
     * @param update Order update information
     * @param client_id Client identifier
     * @return true if successful, false on error
     */
    bool send_order_update(const Order& update, const std::string& client_id);

    /**
     * @brief Set tick callback for custom processing
     * @param callback Function to call on each tick
     */
    void set_tick_callback(std::function<void(const Tick&)> callback) {
        std::lock_guard<std::mutex> lock(callback_mutex_);
        tick_callback_ = callback;
    }

    /**
     * @brief Get IPC configuration
     * @return Current configuration
     */
    const Config& get_config() const { return config_; }

private:
    /**
     * @brief Main IPC thread function
     */
    void run();

    /**
     * @brief Process incoming order request
     * @param msg Received message
     * @param client_id Client identifier
     */
    void process_order_request(const zmq::message_t& msg, const std::string& client_id);

    /**
     * @brief Process control request
     * @param msg Received message
     */
    void process_control_request(const zmq::message_t& msg);

    /**
     * @brief Handle portfolio snapshot request
     * @param client_id Client identifier
     * @return Serialized portfolio snapshot
     */
    std::string handle_portfolio_request(const std::string& client_id);

    /**
     * @brief Handle risk status request
     * @param client_id Client identifier
     * @return Serialized risk status
     */
    std::string handle_risk_status_request(const std::string& client_id);

    /**
     * @brief Send heartbeat to all connected clients
     */
    void send_heartbeat();

    /**
     * @brief Serialize tick to Cap'n Proto message
     * @param tick Tick to serialize
     * @return Serialized message
     */
    std::string serialize_tick(const Tick& tick);

    /**
     * @brief Serialize order update to Cap'n Proto message
     * @param order Order to serialize
     * @param client_id Client identifier
     * @return Serialized message
     */
    std::string serialize_order_update(const Order& order, const std::string& client_id);

    /**
     * @brief Deserialize order request from message
     * @param msg Message to deserialize
     * @param client_id Client identifier
     * @return Order request object
     */
    Order deserialize_order_request(const zmq::message_t& msg, const std::string& client_id);

    Engine* engine_;
    Config config_;
    
    // Sockets
    std::unique_ptr<ZmqSocket> pub_socket_;      // publishes ticks
    std::unique_ptr<ZmqSocket> router_socket_;   // receives order requests, sends updates
    std::unique_ptr<ZmqSocket> rep_socket_;      // control commands

    // Threading
    std::thread thread_;
    std::atomic<bool> running_;

    // Client management
    std::unordered_map<std::string, uint64_t> client_last_seen_;
    std::mutex client_mutex_;

    // Callbacks
    std::function<void(const Tick&)> tick_callback_;
    std::mutex callback_mutex_;

    // Statistics
    std::atomic<uint64_t> ticks_published_{0};
    std::atomic<uint64_t> orders_received_{0};
    std::atomic<uint64_t> orders_processed_{0};
    std::atomic<uint64_t> control_requests_{0};
};

} // namespace phoenix::ipc
