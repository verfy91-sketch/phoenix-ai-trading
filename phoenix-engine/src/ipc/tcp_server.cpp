#include "ipc/tcp_server.h"
#include "ipc/client_session.h"
#include <iostream>
#include <algorithm>

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "ws2_32.lib")

// Initialize Winsock
struct WinsockInitializer {
    WinsockInitializer() {
        WSADATA wsaData;
        WSAStartup(MAKEWORD(2, 2), &wsaData);
    }
    ~WinsockInitializer() {
        WSACleanup();
    }
    static WinsockInitializer instance;
};
WinsockInitializer WinsockInitializer::instance;

#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/select.h>
#define closesocket close
#endif

namespace phoenix::ipc {

TcpServer::TcpServer(Engine* engine, uint16_t port)
    : engine_(engine)
    , port_(port)
    , running_(false)
#ifdef _WIN32
    , listenSocket_(INVALID_SOCKET)
#else
    , listenSocket_(-1)
#endif
{
}

TcpServer::~TcpServer() {
    stop();
}

bool TcpServer::start() {
    // Create listening socket
#ifdef _WIN32
    listenSocket_ = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (listenSocket_ == INVALID_SOCKET) {
        std::cerr << "Failed to create socket: " << WSAGetLastError() << std::endl;
        return false;
    }
#else
    listenSocket_ = socket(AF_INET, SOCK_STREAM, 0);
    if (listenSocket_ < 0) {
        perror("Failed to create socket");
        return false;
    }
#endif

    // Set socket options
    int opt = 1;
    setsockopt(listenSocket_, SOL_SOCKET, SO_REUSEADDR, reinterpret_cast<const char*>(&opt), sizeof(opt));

    // Bind to port
    sockaddr_in serverAddr;
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_addr.s_addr = INADDR_ANY;
    serverAddr.sin_port = htons(port_);

    if (bind(listenSocket_, reinterpret_cast<sockaddr*>(&serverAddr), sizeof(serverAddr)) < 0) {
        std::cerr << "Failed to bind to port " << port_ << std::endl;
        closesocket(listenSocket_);
        return false;
    }

    // Start listening
    if (listen(listenSocket_, SOMAXCONN) < 0) {
        std::cerr << "Failed to listen on socket" << std::endl;
        closesocket(listenSocket_);
        return false;
    }

    std::cout << "IPC Server listening on port " << port_ << std::endl;
    
    // Start accept loop
    running_.store(true);
    acceptThread_ = std::thread(&TcpServer::acceptLoop, this);
    
    return true;
}

void TcpServer::stop() {
    running_.store(false);
    
    // Close listening socket
    if (listenSocket_ != -1) {
        closesocket(listenSocket_);
#ifdef _WIN32
        listenSocket_ = INVALID_SOCKET;
#else
        listenSocket_ = -1;
#endif
    }
    
    // Stop all client sessions
    {
        std::lock_guard<std::mutex> lock(clientsMutex_);
        for (auto& client : clients_) {
            client->stop();
        }
        clients_.clear();
    }
    
    // Wait for accept thread to finish
    if (acceptThread_.joinable()) {
        acceptThread_.join();
    }
}

void TcpServer::acceptLoop() {
    while (running_.load()) {
        // Accept new connection
        sockaddr_in clientAddr;
#ifdef _WIN32
        int clientAddrSize = sizeof(clientAddr);
        uintptr_t clientSocket = accept(listenSocket_, reinterpret_cast<sockaddr*>(&clientAddr), &clientAddrSize);
#else
        socklen_t clientAddrSize = sizeof(clientAddr);
        int clientSocket = accept(listenSocket_, reinterpret_cast<sockaddr*>(&clientAddr), &clientAddrSize);
#endif

        if (!running_.load()) {
            break;
        }

#ifdef _WIN32
        if (clientSocket == INVALID_SOCKET) {
#else
        if (clientSocket < 0) {
#endif
            // Accept failed, continue
            continue;
        }

        // Create new client session
        auto session = std::make_unique<ClientSession>(static_cast<int>(clientSocket), engine_, this);
        
        // Add to clients list
        {
            std::lock_guard<std::mutex> lock(clientsMutex_);
            clients_.push_back(std::move(session));
        }
        
        // Start the session
        clients_.back()->start();
        
        std::cout << "New client connected: " << clients_.back()->getClientId() << std::endl;
    }
}

void TcpServer::removeClient(ClientSession* session) {
    std::lock_guard<std::mutex> lock(clientsMutex_);
    clients_.erase(
        std::remove_if(clients_.begin(), clients_.end(),
            [session](const std::unique_ptr<ClientSession>& ptr) {
                return ptr.get() == session;
            }),
        clients_.end()
    );
    std::cout << "Client disconnected: " << session->getClientId() << std::endl;
}

void TcpServer::broadcastTick(const Tick& tick) {
    std::lock_guard<std::mutex> lock(clientsMutex_);
    for (auto& client : clients_) {
        if (client->isActive()) {
            client->sendTick(tick);
        }
    }
}

void TcpServer::sendOrderUpdate(const std::string& clientId, uint64_t orderId, const OrderUpdate& update) {
    std::lock_guard<std::mutex> lock(clientsMutex_);
    for (auto& client : clients_) {
        if (client->isActive() && client->getClientId() == clientId) {
            client->sendOrderUpdate(update);
            break;
        }
    }
}

} // namespace phoenix::ipc
