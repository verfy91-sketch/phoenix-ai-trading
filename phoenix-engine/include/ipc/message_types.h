#pragma once

#include <cstdint>

namespace phoenix::ipc {

/**
 * @brief Message type identifiers for IPC communication
 */
enum class MessageType : uint8_t {
    TICK_DATA = 0,
    ORDER_REQUEST = 1,
    ORDER_UPDATE = 2,
    PORTFOLIO_SNAPSHOT = 3,
    CONTROL_REQUEST = 4,
    CONTROL_RESPONSE = 5,
    HEARTBEAT = 6,
    DISCONNECT = 7
};

/**
 * @brief Order side enumeration
 */
enum class OrderSide : uint8_t {
    BUY = 0,
    SELL = 1
};

/**
 * @brief Order type enumeration
 */
enum class OrderType : uint8_t {
    MARKET = 0,
    LIMIT = 1
};

/**
 * @brief Order status enumeration
 */
enum class OrderStatus : uint8_t {
    PENDING = 0,
    OPEN = 1,
    FILLED = 2,
    CANCELLED = 3,
    REJECTED = 4
};

/**
 * @brief Control request type enumeration
 */
enum class ControlType : uint8_t {
    GET_PORTFOLIO = 0,
    GET_RISK_STATUS = 1,
    SET_CONFIG = 2,
    GET_POSITIONS = 3,
    GET_BALANCE = 4
};

/**
 * @brief Convert order side to string
 * @param side Order side
 * @return String representation
 */
inline const char* order_side_to_string(OrderSide side) {
    switch (side) {
        case OrderSide::BUY: return "BUY";
        case OrderSide::SELL: return "SELL";
        default: return "UNKNOWN";
    }
}

/**
 * @brief Convert order type to string
 * @param type Order type
 * @return String representation
 */
inline const char* order_type_to_string(OrderType type) {
    switch (type) {
        case OrderType::MARKET: return "MARKET";
        case OrderType::LIMIT: return "LIMIT";
        default: return "UNKNOWN";
    }
}

/**
 * @brief Convert order status to string
 * @param status Order status
 * @return String representation
 */
inline const char* order_status_to_string(OrderStatus status) {
    switch (status) {
        case OrderStatus::PENDING: return "PENDING";
        case OrderStatus::OPEN: return "OPEN";
        case OrderStatus::FILLED: return "FILLED";
        case OrderStatus::CANCELLED: return "CANCELLED";
        case OrderStatus::REJECTED: return "REJECTED";
        default: return "UNKNOWN";
    }
}

/**
 * @brief Convert message type to string
 * @param type Message type
 * @return String representation
 */
inline const char* message_type_to_string(MessageType type) {
    switch (type) {
        case MessageType::TICK_DATA: return "TICK_DATA";
        case MessageType::ORDER_REQUEST: return "ORDER_REQUEST";
        case MessageType::ORDER_UPDATE: return "ORDER_UPDATE";
        case MessageType::PORTFOLIO_SNAPSHOT: return "PORTFOLIO_SNAPSHOT";
        case MessageType::CONTROL_REQUEST: return "CONTROL_REQUEST";
        case MessageType::CONTROL_RESPONSE: return "CONTROL_RESPONSE";
        case MessageType::HEARTBEAT: return "HEARTBEAT";
        case MessageType::DISCONNECT: return "DISCONNECT";
        default: return "UNKNOWN";
    }
}

} // namespace phoenix::ipc
