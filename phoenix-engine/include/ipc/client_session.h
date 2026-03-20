#pragma once

#include <thread>
#include <atomic>
#include <functional>
#include <string>
#include <queue>
#include <mutex>
#include "engine.h"
#include "json_message.h"

namespace phoenix::ipc {

/**
 * @brief Per-client session handler
 * 
 * This class manages an individual client connection,
 * handling message parsing, dispatching, and response sending.
 * Each session runs in its own thread for independent operation.
 */
class ClientSession {
public:
    /**
     * @brief Construct client session
     * @param clientFd Client socket file descriptor
     * @param engine Reference to trading engine
     * @param server Pointer to TCP server for cleanup
     */
    ClientSession(int clientFd, Engine* engine, class TcpServer* server);
    
    /**
     * @brief Destructor - stops session and closes socket
     */
    ~ClientSession();

    /**
     * @brief Start the client session (begin reading)
     */
    void start();
    
    /**
     * @brief Stop the client session
     */
    void stop();

    /**
     * @brief Send JSON message to client
     * @param msg JSON message to send
     * @return true if message sent successfully, false otherwise
     */
    bool sendMessage(const nlohmann::json& msg);

    /**
     * @brief Get client ID
     * @return Unique client identifier
     */
    const std::string& getClientId() const noexcept { return clientId_; }

    /**
     * @brief Check if session is active
     * @return true if session is active, false otherwise
     */
    bool isActive() const noexcept { return running_.load(); }

/**
     * @brief Send tick data to client
     * @param tick Market data tick
     */
    void sendTick(const Tick& tick);
    
    /**
     * @brief Send order update to client
     * @param update Order update data
     */
    void sendOrderUpdate(const OrderUpdate& update);

private:
    /**
     * @brief Main read loop for client messages
     */
    void readLoop();
    
    /**
     * @brief Handle incoming JSON request
     * @param req Parsed JSON request
     */
    void handleRequest(const nlohmann::json& req);
    
    /**
     * @brief Send response to client
     * @param requestId Request ID for correlation
     * @param result Response result data
     * @param error Error message (empty if no error)
     */
    void sendResponse(uint64_t requestId, const nlohmann::json& result, const std::string& error = "");
    
    /**
     * @brief Generate unique client ID
     * @return Generated client ID
     */
    std::string generateClientId();

    int clientFd_;                                         ///< Client socket descriptor
    Engine* engine_;                                        ///< Reference to trading engine
    class TcpServer* server_;                                ///< Pointer to server for cleanup
    std::atomic<bool> running_;                              ///< Session running flag
    std::thread readThread_;                                 ///< Read loop thread
    std::string clientId_;                                    ///< Unique client identifier
    std::string readBuffer_;                                  ///< Buffer for incoming data
    std::mutex writeMutex_;                                  ///< Mutex for thread-safe writing
    std::queue<nlohmann::json> messageQueue_;                ///< Queue for outgoing messages
    std::mutex queueMutex_;                                 ///< Mutex for message queue
};

} // namespace phoenix::ipc
