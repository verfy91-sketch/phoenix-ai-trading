#include "ipc/client_session.h"
#include "ipc/tcp_server.h"
#include <iostream>
#include <sstream>
#include <chrono>

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "ws2_32.lib")
#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <fcntl.h>
#define closesocket close
#endif

namespace phoenix::ipc {

ClientSession::ClientSession(int clientFd, Engine* engine, TcpServer* server)
    : clientFd_(clientFd)
    , engine_(engine)
    , server_(server)
    , running_(false)
    , clientId_(generateClientId()) {
}

ClientSession::~ClientSession() {
    stop();
    if (clientFd_ != -1) {
        closesocket(clientFd_);
    }
}

void ClientSession::start() {
    running_.store(true);
    readThread_ = std::thread(&ClientSession::readLoop, this);
}

void ClientSession::stop() {
    running_.store(false);
    if (readThread_.joinable()) {
        readThread_.join();
    }
}

bool ClientSession::sendMessage(const nlohmann::json& msg) {
    std::lock_guard<std::mutex> lock(queueMutex_);
    messageQueue_.push(msg);
    return true;
}

void ClientSession::readLoop() {
    char buffer[4096];
    std::string messageBuffer;
    
    while (running_.load()) {
        int bytesReceived = recv(clientFd_, buffer, sizeof(buffer) - 1, 0);
        
        if (bytesReceived <= 0) {
            // Connection closed or error
            break;
        }
        
        buffer[bytesReceived] = '\0';
        messageBuffer += buffer;
        
        // Process complete messages (JSON objects separated by newlines)
        size_t pos = 0;
        while ((pos = messageBuffer.find('\n')) != std::string::npos) {
            std::string message = messageBuffer.substr(0, pos);
            messageBuffer.erase(0, pos + 1);
            
            auto parsed = parseMessage(message);
            if (parsed) {
                handleRequest(*parsed);
            }
        }
    }
    
    // Notify server of disconnection
    if (server_) {
        server_->removeClient(this);
    }
}

void ClientSession::handleRequest(const nlohmann::json& req) {
    try {
        if (!req.contains("method") || !req.contains("id")) {
            sendResponse(0, nlohmann::json{}, "Invalid request format");
            return;
        }
        
        uint64_t requestId = req["id"].get<uint64_t>();
        std::string method = req["method"].get<std::string>();
        nlohmann::json params = req.contains("params") ? req["params"] : nlohmann::json::object();
        
        nlohmann::json result;
        std::string error;
        
        if (method == RequestMethod::SUBMIT_ORDER) {
            auto order = orderFromJson(params);
            if (order) {
                // Validate order before submission
                if (order->symbol.empty()) {
                    error = "Invalid symbol: symbol cannot be empty";
                } else if (order->quantity <= 0) {
                    error = "Invalid quantity: quantity must be positive";
                } else if (order->price <= 0 && order->type != OrderType::MARKET) {
                    error = "Invalid price: price must be positive for limit orders";
                } else {
                    uint64_t orderId = engine_->submit_order_external(*order, clientId_);
                    if (orderId == 0) {
                        error = "Order submission failed: engine rejected order (possibly insufficient balance or invalid symbol)";
                    } else {
                        result["order_id"] = orderId;
                        result["status"] = "submitted";
                    }
                }
            } else {
                error = "Invalid order parameters: required fields missing or malformed";
            }
        }
        else if (method == RequestMethod::CANCEL_ORDER) {
            if (params.contains("order_id")) {
                uint64_t orderId = params["order_id"].get<uint64_t>();
                if (orderId == 0) {
                    error = "Invalid order_id: order_id must be greater than 0";
                } else {
                    // For now, just return success - actual cancellation would need order manager access
                    result["success"] = true;
                    result["message"] = "Order cancellation not yet implemented";
                    result["order_id"] = orderId;
                }
            } else {
                error = "Missing order_id parameter: required for order cancellation";
            }
        }
        else if (method == RequestMethod::GET_PORTFOLIO) {
            auto portfolio = engine_->get_portfolio();
            if (portfolio) {
                result = portfolioToJson(portfolio);
            } else {
                error = "Portfolio not available";
            }
        }
        else if (method == RequestMethod::GET_RISK_STATUS) {
            auto risk = engine_->get_risk_manager();
            if (risk) {
                result = riskStatusToJson(risk);
            } else {
                error = "Risk manager not available";
            }
        }
        else if (method == RequestMethod::GET_STATS) {
            // Create basic stats for now
            EngineStats stats;
            result = statsToJson(stats);
        }
        else if (method == RequestMethod::SUBSCRIBE_TICKS) {
            // Tick subscription is handled by broadcasting from server
            result["subscribed"] = true;
        }
        else if (method == RequestMethod::UNSUBSCRIBE_TICKS) {
            // Tick unsubscription is handled by server
            result["unsubscribed"] = true;
        }
        else {
            error = "Unknown method: " + method;
        }
        
        sendResponse(requestId, result, error);
        
    } catch (const std::exception& e) {
        uint64_t requestId = req.contains("id") ? req["id"].get<uint64_t>() : 0;
        sendResponse(requestId, nlohmann::json{}, std::string("Internal error: ") + e.what());
    }
}

void ClientSession::sendResponse(uint64_t requestId, const nlohmann::json& result, const std::string& error) {
    nlohmann::json response = makeResponse(requestId, result, error);
    
    std::lock_guard<std::mutex> lock(writeMutex_);
    std::string responseStr = response.dump() + "\n";
    
    if (send(clientFd_, responseStr.c_str(), static_cast<int>(responseStr.length()), 0) < 0) {
        // Send failed, connection likely broken
        running_.store(false);
    }
}

void ClientSession::sendTick(const Tick& tick) {
    nlohmann::json msg = makeTickMessage(tick);
    sendMessage(msg);
}

void ClientSession::sendOrderUpdate(const OrderUpdate& update) {
    nlohmann::json msg = makeOrderUpdateMessage(update);
    sendMessage(msg);
}

std::string ClientSession::generateClientId() {
    auto now = std::chrono::system_clock::now();
    auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();
    
    std::stringstream ss;
    ss << "client_" << timestamp << "_" << clientFd_;
    return ss.str();
}

} // namespace phoenix::ipc
