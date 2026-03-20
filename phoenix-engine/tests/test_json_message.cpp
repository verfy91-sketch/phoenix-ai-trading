/**
 * @file test_json_message.cpp
 * @brief Unit tests for JSON message serialization and parsing
 * 
 * Tests the JSON message serialization and parsing utilities
 * used in IPC communication between engine and clients.
 */

#include <gtest/gtest.h>
#include "ipc/json_message.h"
#include "core/order.h"
#include "core/portfolio.h"

using namespace phoenix::ipc;

class JsonMessageTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Setup common test data
        test_tick_ = Tick{
            .symbol = "BTC/USD",
            .price = 50000.0,
            .volume = 100.0,
            .timestamp_ns = 1640995200000000000ULL
        };
        
        test_order_ = Order{
            .symbol = "BTC/USD",
            .side = OrderSide::BUY,
            .type = OrderType::MARKET,
            .price = 50000.0,
            .quantity = 1.0,
            .filled_quantity = 0.0,
            .status = OrderStatus::PENDING,
            .timestamp_ns = 1640995200000000000ULL,
            .client_id = "test_client"
        };
    }
    
    Tick test_tick_;
    Order test_order_;

public:
    // Test tick message serialization
    TEST_F(JsonMessageTest, TickMessageSerialization) {
        auto msg = makeTickMessage(test_tick_);
        
        EXPECT_EQ(msg["type"], "tick");
        EXPECT_TRUE(msg.contains("data"));
        
        auto data = msg["data"];
        EXPECT_EQ(data["symbol"], test_tick_.symbol);
        EXPECT_DOUBLE_EQ(data["price"], test_tick_.price);
        EXPECT_DOUBLE_EQ(data["volume"], test_tick_.volume);
        EXPECT_EQ(data["timestamp_ns"], test_tick_.timestamp_ns);
    }
    
    // Test order update message serialization
    TEST_F(JsonMessageTest, OrderUpdateMessageSerialization) {
        OrderUpdate update;
        update.order_id = 12345;
        update.symbol = "BTC/USD";
        update.side = OrderSide::BUY;
        update.type = OrderType::MARKET;
        update.price = 50000.0;
        update.quantity = 1.0;
        update.filled_quantity = 1.0;
        update.status = OrderStatus::FILLED;
        update.timestamp_ns = 1640995200000000000ULL;
        update.client_id = "test_client";
        
        auto msg = makeOrderUpdateMessage(update);
        
        EXPECT_EQ(msg["type"], "order_update");
        EXPECT_TRUE(msg.contains("data"));
        
        auto data = msg["data"];
        EXPECT_EQ(data["order_id"], update.order_id);
        EXPECT_EQ(data["symbol"], update.symbol);
        EXPECT_EQ(data["side"], static_cast<int>(update.side));
        EXPECT_EQ(data["type"], static_cast<int>(update.type));
        EXPECT_DOUBLE_EQ(data["price"], update.price);
        EXPECT_DOUBLE_EQ(data["quantity"], update.quantity);
        EXPECT_DOUBLE_EQ(data["filled_quantity"], update.filled_quantity);
        EXPECT_EQ(data["status"], static_cast<int>(update.status));
        EXPECT_EQ(data["timestamp_ns"], update.timestamp_ns);
        EXPECT_EQ(data["client_id"], update.client_id);
    }
    
    // Test response message creation
    TEST_F(JsonMessageTest, ResponseMessageCreation) {
        nlohmann::json result = { "test": "value" };
        auto response = makeResponse(123, result);
        
        EXPECT_EQ(response["id"], 123);
        EXPECT_EQ(response["type"], "response");
        EXPECT_EQ(response["result"], result);
        EXPECT_TRUE(response["error"].is_null());
    }
    
    // Test error response message creation
    TEST_F(JsonMessageTest, ErrorResponseMessageCreation) {
        std::string error_msg = "Test error";
        auto response = makeErrorResponse(456, error_msg);
        
        EXPECT_EQ(response["id"], 456);
        EXPECT_EQ(response["type"], "response");
        EXPECT_TRUE(response["result"].is_null());
        EXPECT_EQ(response["error"], error_msg);
    }
    
    // Test message parsing
    TEST_F(JsonMessageTest, MessageParsing) {
        std::string valid_json = R"({"id":123,"method":"test","params":{"key":"value"}})";
        auto parsed = parseMessage(valid_json);
        
        ASSERT_TRUE(parsed.has_value());
        EXPECT_EQ((*parsed)["id"], 123);
        EXPECT_EQ((*parsed)["method"], "test");
        EXPECT_EQ((*parsed)["params"]["key"], "value");
    }
    
    // Test invalid message parsing
    TEST_F(JsonMessageTest, InvalidMessageParsing) {
        std::string invalid_json = R"({"id":123,"method":"test","params":{"key":"value"})";
        auto parsed = parseMessage(invalid_json);
        
        EXPECT_FALSE(parsed.has_value());
    }
    
    // Test order JSON serialization
    TEST_F(JsonMessageTest, OrderJsonSerialization) {
        auto json = orderToJson(test_order_);
        
        EXPECT_EQ(json["symbol"], test_order_.symbol);
        EXPECT_EQ(json["side"], static_cast<int>(test_order_.side));
        EXPECT_EQ(json["type"], static_cast<int>(test_order_.type));
        EXPECT_DOUBLE_EQ(json["price"], test_order_.price);
        EXPECT_DOUBLE_EQ(json["quantity"], test_order_.quantity);
        EXPECT_DOUBLE_EQ(json["filled_quantity"], test_order_.filled_quantity);
        EXPECT_EQ(json["status"], static_cast<int>(test_order_.status));
        EXPECT_EQ(json["timestamp_ns"], test_order_.timestamp_ns);
        EXPECT_EQ(json["client_id"], test_order_.client_id);
    }
    
    // Test order JSON parsing
    TEST_F(JsonMessageTest, OrderJsonParsing) {
        auto json = orderToJson(test_order_);
        auto parsed = orderFromJson(json);
        
        ASSERT_TRUE(parsed.has_value());
        EXPECT_EQ(parsed->symbol, test_order_.symbol);
        EXPECT_EQ(parsed->side, test_order_.side);
        EXPECT_EQ(parsed->type, test_order_.type);
        EXPECT_DOUBLE_EQ(parsed->price, test_order_.price);
        EXPECT_DOUBLE_EQ(parsed->quantity, test_order_.quantity);
        EXPECT_DOUBLE_EQ(parsed->filled_quantity, test_order_.filled_quantity);
        EXPECT_EQ(parsed->status, test_order_.status);
        EXPECT_EQ(parsed->client_id, test_order_.client_id);
    }
    
    // Test invalid order JSON parsing
    TEST_F(JsonMessageTest, InvalidOrderJsonParsing) {
        nlohmann::json incomplete_json = {
            {"side": 0, "type": 0}
            // Missing required "symbol" field
        };
        
        auto parsed = orderFromJson(incomplete_json);
        EXPECT_FALSE(parsed.has_value());
    }
    
    // Test tick JSON serialization
    TEST_F(JsonMessageTest, TickJsonSerialization) {
        auto json = tickToJson(test_tick_);
        
        EXPECT_EQ(json["symbol"], test_tick_.symbol);
        EXPECT_DOUBLE_EQ(json["price"], test_tick_.price);
        EXPECT_DOUBLE_EQ(json["volume"], test_tick_.volume);
        EXPECT_EQ(json["timestamp_ns"], test_tick_.timestamp_ns);
    }
};

// Main function for running tests
int main(int argc, char **argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
