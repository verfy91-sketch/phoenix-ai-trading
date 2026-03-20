#pragma once

#include "../../third_party/json.hpp"
#include <string>
#include <optional>
#include "engine.h"
#include "core/engine_stats.h"

namespace phoenix::ipc {

/**
 * @brief JSON message serialization and parsing utilities
 * 
 * This namespace provides functions for converting between internal
 * data structures and JSON messages for IPC communication.
 * All messages follow a consistent format for request/response
 * and streaming data.
 */

// Message format constants
namespace MessageType {
    constexpr const char* REQUEST = "request";
    constexpr const char* RESPONSE = "response";
    constexpr const char* TICK = "tick";
    constexpr const char* ORDER_UPDATE = "order_update";
    constexpr const char* HEARTBEAT = "heartbeat";
}

// Request method constants
namespace RequestMethod {
    constexpr const char* SUBMIT_ORDER = "submitOrder";
    constexpr const char* CANCEL_ORDER = "cancelOrder";
    constexpr const char* GET_PORTFOLIO = "getPortfolio";
    constexpr const char* GET_RISK_STATUS = "getRiskStatus";
    constexpr const char* GET_STATS = "getStats";
    constexpr const char* SUBSCRIBE_TICKS = "subscribeTicks";
    constexpr const char* UNSUBSCRIBE_TICKS = "unsubscribeTicks";
}

/**
 * @brief Create a tick message for streaming
 * @param tick Market data tick
 * @return JSON message containing tick data
 */
nlohmann::json makeTickMessage(const Tick& tick);

/**
 * @brief Create an order update message
 * @param update Order update data
 * @return JSON message containing order update
 */
nlohmann::json makeOrderUpdateMessage(const OrderUpdate& update);

/**
 * @brief Create a portfolio message
 * @param portfolio Portfolio data
 * @return JSON message containing portfolio
 */
nlohmann::json makePortfolioMessage(const Portfolio* portfolio);

/**
 * @brief Create a risk status message
 * @param risk Risk status data
 * @return JSON message containing risk status
 */
nlohmann::json makeRiskStatusMessage(const RiskManager* risk);

/**
 * @brief Create a stats message
 * @param stats Engine statistics
 * @return JSON message containing stats
 */
nlohmann::json makeStatsMessage(const EngineStats& stats);

/**
 * @brief Parse incoming JSON message
 * @param data Raw JSON string data
 * @return Optional parsed JSON object, empty if parsing failed
 */
std::optional<nlohmann::json> parseMessage(const std::string& data);

/**
 * @brief Create a response message
 * @param requestId Request ID for correlation
 * @param result Response result data
 * @param error Error message (empty if success)
 * @return JSON response message
 */
nlohmann::json makeResponse(uint64_t requestId, const nlohmann::json& result, const std::string& error = "");

/**
 * @brief Create an error response message
 * @param requestId Request ID for correlation
 * @param error Error message
 * @return JSON error response message
 */
nlohmann::json makeErrorResponse(uint64_t requestId, const std::string& error);

/**
 * @brief Serialize order to JSON
 * @param order Order to serialize
 * @return JSON representation of order
 */
nlohmann::json orderToJson(const Order& order);

/**
 * @brief Serialize order update to JSON
 * @param update Order update to serialize
 * @return JSON representation of order update
 */
nlohmann::json orderUpdateToJson(const OrderUpdate& update);

/**
 * @brief Serialize tick to JSON
 * @param tick Tick to serialize
 * @return JSON representation of tick
 */
nlohmann::json tickToJson(const Tick& tick);

/**
 * @brief Serialize portfolio to JSON
 * @param portfolio Portfolio to serialize
 * @return JSON representation of portfolio
 */
nlohmann::json portfolioToJson(const Portfolio* portfolio);

/**
 * @brief Serialize risk status to JSON
 * @param risk Risk status to serialize
 * @return JSON representation of risk status
 */
nlohmann::json riskStatusToJson(const RiskManager* risk);

/**
 * @brief Serialize engine stats to JSON
 * @param stats Stats to serialize
 * @return JSON representation of stats
 */
nlohmann::json statsToJson(const EngineStats& stats);

/**
 * @brief Parse order from JSON
 * @param json JSON object containing order data
 * @return Optional Order object if parsing succeeds
 */
std::optional<Order> orderFromJson(const nlohmann::json& json);

/**
 * @brief Parse JSON message from string
 * @param messageStr JSON message string
 * @return Optional JSON object if parsing succeeds
 */
std::optional<nlohmann::json> parseMessage(const std::string& messageStr);

} // namespace phoenix::ipc
