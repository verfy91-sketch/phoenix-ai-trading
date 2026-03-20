#pragma once

#include <thread>
#include <atomic>
#include <memory>
#include <vector>
#include <cstdint>
#include <mutex>
#include "engine.h"

namespace phoenix::ipc {

class ClientSession;

/**
 * @brief TCP server for IPC communication
 * 
 * This class manages TCP connections from multiple clients,
 * handling message routing and session management.
 * Uses platform-specific socket implementations for Windows and POSIX.
 */
class TcpServer {
public:
    /**
     * @brief Construct TCP server
     * @param engine Reference to the trading engine
     * @param port Port number to listen on (default: 5555)
     */
    explicit TcpServer(Engine* engine, uint16_t port = 5555);
    
    /**
     * @brief Destructor - stops server and cleans up resources
     */
    ~TcpServer();

    /**
     * @brief Start the TCP server
     * @return true if server started successfully, false otherwise
     */
    bool start();
    
    /**
     * @brief Stop the TCP server
     */
    void stop();

    /**
     * @brief Check if server is running
     * @return true if server is running, false otherwise
     */
    bool isRunning() const noexcept { return running_.load(); }

    /**
     * @brief Broadcast tick to all connected clients
     * @param tick Market data tick to broadcast
     */
    void broadcastTick(const Tick& tick);

    /**
     * @brief Send order update to specific client
     * @param clientId Client ID to send update to
     * @param orderId Order ID for the update
     * @param update Order update data
     */
    void sendOrderUpdate(const std::string& clientId, uint64_t orderId, const OrderUpdate& update);

    /**
     * @brief Remove disconnected client
     * @param session Pointer to client session to remove
     */
    void removeClient(ClientSession* session);

private:
    /**
     * @brief Main accept loop for new connections
     */
    void acceptLoop();

    Engine* engine_;                                    ///< Reference to trading engine
    uint16_t port_;                                     ///< Server port
    std::atomic<bool> running_;                           ///< Server running flag
    std::thread acceptThread_;                             ///< Accept loop thread
    std::vector<std::unique_ptr<ClientSession>> clients_;     ///< Connected clients
    std::mutex clientsMutex_;                              ///< Mutex for clients vector
    
    // Platform-specific socket descriptor
#ifdef _WIN32
    uintptr_t listenSocket_;                              ///< Windows socket handle
#else
    int listenSocket_;                                     ///< POSIX socket descriptor
#endif
};

} // namespace phoenix::ipc
