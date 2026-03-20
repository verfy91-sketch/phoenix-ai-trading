#pragma once

#include <cstdint>
#include <string>

namespace phoenix {

using Price = double;
using Quantity = uint32_t;
using Timestamp = uint64_t;  // nanoseconds since epoch

enum class OrderSide { BUY, SELL };
enum class OrderType { MARKET, LIMIT };
enum class OrderStatus { PENDING, OPEN, FILLED, CANCELLED, REJECTED };

struct Order {
    uint64_t order_id;
    std::string symbol;
    OrderSide side;
    OrderType type;
    Price price;        // 0 for market orders
    Quantity quantity;
    Quantity filled_qty;
    OrderStatus status;
    Timestamp timestamp_ns;
};

struct Tick {
    std::string symbol;
    Price price;
    Quantity volume;
    Timestamp timestamp_ns;
};

struct Position {
    std::string symbol;
    int64_t net_quantity;   // positive for long, negative for short
    Price avg_price;
};

} // namespace phoenix
