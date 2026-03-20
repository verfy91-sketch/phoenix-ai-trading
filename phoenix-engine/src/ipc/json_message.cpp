#include "ipc/json_message.h"
#include "../../third_party/json.hpp"
#include <iomanip>
#include <chrono>

namespace phoenix::ipc {

nlohmann::json makeTickMessage(const Tick& tick) {
    nlohmann::json msg;
    msg["type"] = MessageType::TICK;
    msg["data"] = tickToJson(tick);
    return msg;
}

nlohmann::json makeOrderUpdateMessage(const OrderUpdate& update) {
    nlohmann::json msg;
    msg["type"] = MessageType::ORDER_UPDATE;
    msg["data"] = orderUpdateToJson(update);
    return msg;
}

nlohmann::json makePortfolioMessage(const Portfolio* portfolio) {
    nlohmann::json msg;
    msg["type"] = MessageType::RESPONSE;
    msg["data"] = portfolioToJson(portfolio);
    return msg;
}

nlohmann::json makeRiskStatusMessage(const RiskManager* risk) {
    nlohmann::json msg;
    msg["type"] = MessageType::RESPONSE;
    msg["data"] = riskStatusToJson(risk);
    return msg;
}

nlohmann::json makeStatsMessage(const EngineStats& stats) {
    nlohmann::json msg;
    msg["type"] = MessageType::RESPONSE;
    msg["data"] = statsToJson(stats);
    return msg;
}

nlohmann::json makeResponse(uint64_t requestId, const nlohmann::json& result, const std::string& error) {
    nlohmann::json response;
    response["request_id"] = requestId;
    response["success"] = error.empty();
    if (!error.empty()) {
        response["error"] = error;
    } else {
        response["data"] = result;
    }
    return response;
}

nlohmann::json makeErrorResponse(uint64_t requestId, const std::string& error) {
    return makeResponse(requestId, nlohmann::json{}, error);
}

nlohmann::json orderToJson(const Order& order) {
    nlohmann::json json;
    json["order_id"] = order.order_id;
    json["symbol"] = order.symbol;
    json["side"] = static_cast<int>(order.side);
    json["type"] = static_cast<int>(order.type);
    json["price"] = static_cast<double>(order.price);
    json["quantity"] = static_cast<double>(order.quantity);
    json["filled_qty"] = static_cast<double>(order.filled_qty);
    json["status"] = static_cast<int>(order.status);
    json["timestamp_ns"] = order.timestamp_ns;
    return json;
}

nlohmann::json orderUpdateToJson(const OrderUpdate& update) {
    nlohmann::json json;
    json["order_id"] = update.order_id;
    json["status"] = static_cast<int>(update.status);
    json["filled_qty"] = static_cast<double>(update.filled_qty);
    json["avg_fill_price"] = static_cast<double>(update.avg_fill_price);
    return json;
}

nlohmann::json tickToJson(const Tick& tick) {
    nlohmann::json json;
    json["symbol"] = tick.symbol;
    json["price"] = static_cast<double>(tick.price);
    json["volume"] = static_cast<double>(tick.volume);
    json["timestamp_ns"] = tick.timestamp_ns;
    return json;
}

nlohmann::json portfolioToJson(const Portfolio* portfolio) {
    nlohmann::json json;
    if (!portfolio) {
        return json;
    }
    
    json["balance"] = portfolio->get_balance();
    // For now, just return basic portfolio info
    // Can be extended to include positions if needed
    return json;
}

nlohmann::json riskStatusToJson(const RiskManager* risk) {
    nlohmann::json json;
    if (!risk) {
        return json;
    }
    
    // For now, just return basic risk info
    json["active"] = true;
    return json;
}

nlohmann::json statsToJson(const EngineStats& stats) {
    nlohmann::json json;
    json["uptime_ns"] = stats.uptime_ns;
    json["ticks_processed"] = stats.ticks_processed;
    json["orders_submitted"] = stats.orders_submitted;
    json["orders_filled"] = stats.orders_filled;
    json["total_volume"] = stats.total_volume;
    return json;
}

std::optional<Order> orderFromJson(const nlohmann::json& json) {
    try {
        Order order;
        
        if (json.contains("symbol")) {
            order.symbol = json["symbol"].get<std::string>();
        } else {
            return std::nullopt;
        }
        
        if (json.contains("side")) {
            order.side = static_cast<OrderSide>(json["side"].get<int>());
        } else {
            return std::nullopt;
        }
        
        if (json.contains("type")) {
            order.type = static_cast<OrderType>(json["type"].get<int>());
        } else {
            return std::nullopt;
        }
        
        order.price = json.contains("price") ? json["price"].get<double>() : 0.0;
        order.quantity = json.contains("quantity") ? json["quantity"].get<double>() : 0.0;
        order.filled_qty = json.contains("filled_qty") ? json["filled_qty"].get<double>() : 0.0;
        order.status = json.contains("status") ? static_cast<OrderStatus>(json["status"].get<int>()) : OrderStatus::PENDING;
        order.timestamp_ns = json.contains("timestamp_ns") ? json["timestamp_ns"].get<uint64_t>() : 
            static_cast<uint64_t>(std::chrono::duration_cast<std::chrono::nanoseconds>(
                std::chrono::system_clock::now().time_since_epoch()
            ).count());
        
        return order;
    } catch (const std::exception& e) {
        return std::nullopt;
    }
}

std::optional<nlohmann::json> parseMessage(const std::string& messageStr) {
    try {
        auto json = nlohmann::json::parse(messageStr);
        return json;
    } catch (const std::exception& e) {
        return std::nullopt;
    }
}

} // namespace phoenix::ipc
