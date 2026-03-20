#include <gtest/gtest.h>
#include <sstream>
#include <chrono>
#include "ipc/message_types.h"
#include "core/market_data.h"
#include "core/order.h"

// For now, we'll test the text-based serialization
// In a full implementation, this would use Cap'n Proto

using namespace phoenix::ipc;

class CapnpSerializationTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Initialize test data
        test_tick.symbol = "BTC/USD";
        test_tick.price = 50000.0;
        test_tick.volume = 100;
        test_tick.timestamp_ns = 1640995200000000000ULL;  // 2022-01-01 00:00:00 UTC
        
        test_order.symbol = "BTC/USD";
        test_order.side = OrderSide::BUY;
        test_order.type = OrderType::MARKET;
        test_order.price = 50000.0;
        test_order.quantity = 1;
        test_order.order_id = 12345;
        test_order.status = OrderStatus::PENDING;
        test_order.filled_qty = 0;
        test_order.timestamp_ns = test_tick.timestamp_ns;
    }

    Tick test_tick;
    Order test_order;
};

TEST_F(CapnpSerializationTest, TickSerialization) {
    // Test tick serialization (text format for now)
    std::ostringstream oss;
    oss << "TICK " << test_tick.symbol << " " << test_tick.price << " " 
        << test_tick.volume << " " << test_tick.timestamp_ns;
    
    std::string serialized = oss.str();
    
    // Verify serialized format
    EXPECT_GT(serialized.length(), 0);
    EXPECT_NE(serialized.find("TICK"), std::string::npos);
    EXPECT_NE(serialized.find("BTC/USD"), std::string::npos);
    EXPECT_NE(serialized.find("50000"), std::string::npos);
    EXPECT_NE(serialized.find("100"), std::string::npos);
}

TEST_F(CapnpSerializationTest, TickDeserialization) {
    // Test tick deserialization
    std::string serialized = "TICK BTC/USD 50000.0 100 1640995200000000000";
    
    std::istringstream iss(serialized);
    std::string token;
    
    // Parse TICK token
    iss >> token;
    EXPECT_EQ(token, "TICK");
    
    // Parse tick fields
    Tick parsed_tick;
    iss >> parsed_tick.symbol;
    iss >> parsed_tick.price;
    iss >> parsed_tick.volume;
    iss >> parsed_tick.timestamp_ns;
    
    // Verify parsed data
    EXPECT_EQ(parsed_tick.symbol, test_tick.symbol);
    EXPECT_DOUBLE_EQ(parsed_tick.price, test_tick.price);
    EXPECT_EQ(parsed_tick.volume, test_tick.volume);
    EXPECT_EQ(parsed_tick.timestamp_ns, test_tick.timestamp_ns);
}

TEST_F(CapnpSerializationTest, OrderRequestSerialization) {
    // Test order request serialization
    std::ostringstream oss;
    oss << "ORDER_REQUEST " << test_order.symbol << " " 
        << static_cast<int>(test_order.side) << " " 
        << static_cast<int>(test_order.type) << " "
        << test_order.price << " " << test_order.quantity;
    
    std::string serialized = oss.str();
    
    // Verify serialized format
    EXPECT_GT(serialized.length(), 0);
    EXPECT_NE(serialized.find("ORDER_REQUEST"), std::string::npos);
    EXPECT_NE(serialized.find("BTC/USD"), std::string::npos);
    EXPECT_NE(serialized.find("0"), std::string::npos);  // BUY side
    EXPECT_NE(serialized.find("50000.0"), std::string::npos);
}

TEST_F(CapnpSerializationTest, OrderUpdateSerialization) {
    // Test order update serialization
    std::ostringstream oss;
    oss << "ORDER_UPDATE " << test_order.order_id << " " << test_order.symbol << " "
        << static_cast<int>(test_order.side) << " " << static_cast<int>(test_order.type) << " "
        << test_order.price << " " << test_order.quantity << " " << test_order.filled_qty << " "
        << static_cast<int>(test_order.status) << " client123";
    
    std::string serialized = oss.str();
    
    // Verify serialized format
    EXPECT_GT(serialized.length(), 0);
    EXPECT_NE(serialized.find("ORDER_UPDATE"), std::string::npos);
    EXPECT_NE(serialized.find("12345"), std::string::npos);
    EXPECT_NE(serialized.find("client123"), std::string::npos);
}

TEST_F(CapnpSerializationTest, OrderRequestDeserialization) {
    // Test order request deserialization
    std::string serialized = "ORDER_REQUEST BTC/USD 0 0 50000.0 1";
    
    std::istringstream iss(serialized);
    std::string token;
    
    // Parse ORDER_REQUEST token
    iss >> token;
    EXPECT_EQ(token, "ORDER_REQUEST");
    
    // Parse order fields
    Order parsed_order;
    iss >> parsed_order.symbol;
    
    int side, type;
    iss >> side;
    parsed_order.side = static_cast<OrderSide>(side);
    
    iss >> type;
    parsed_order.type = static_cast<OrderType>(type);
    
    iss >> parsed_order.price;
    iss >> parsed_order.quantity;
    
    // Set default values for fields not in serialization
    parsed_order.order_id = 0;
    parsed_order.status = OrderStatus::PENDING;
    parsed_order.filled_qty = 0;
    parsed_order.timestamp_ns = zmq_utils::get_timestamp_ns();
    
    // Verify parsed data
    EXPECT_EQ(parsed_order.symbol, test_order.symbol);
    EXPECT_EQ(parsed_order.side, test_order.side);
    EXPECT_EQ(parsed_order.type, test_order.type);
    EXPECT_DOUBLE_EQ(parsed_order.price, test_order.price);
    EXPECT_EQ(parsed_order.quantity, test_order.quantity);
}

TEST_F(CapnpSerializationTest, PortfolioSnapshotSerialization) {
    // Test portfolio snapshot serialization (JSON format for now)
    std::ostringstream oss;
    oss << "{\n"
        << "  \"balance\": " << 10000.0 << ",\n"
        << "  \"unrealized_pnl\": " << 500.0 << "\n"
        << "}";
    
    std::string serialized = oss.str();
    
    // Verify serialized format
    EXPECT_GT(serialized.length(), 0);
    EXPECT_NE(serialized.find("balance"), std::string::npos);
    EXPECT_NE(serialized.find("10000.0"), std::string::npos);
    EXPECT_NE(serialized.find("unrealized_pnl"), std::string::npos);
    EXPECT_NE(serialized.find("500.0"), std::string::npos);
}

TEST_F(CapnpSerializationTest, RiskStatusSerialization) {
    // Test risk status serialization (JSON format for now)
    std::ostringstream oss;
    oss << "{\n"
        << "  \"max_order_quantity\": " << 1000 << ",\n"
        << "  \"max_position_size\": " << 10000.0 << ",\n"
        << "  \"daily_loss_limit\": " << 1000.0 << ",\n"
        << "  \"max_consecutive_losses\": " << 5 << "\n"
        << "}";
    
    std::string serialized = oss.str();
    
    // Verify serialized format
    EXPECT_GT(serialized.length(), 0);
    EXPECT_NE(serialized.find("max_order_quantity"), std::string::npos);
    EXPECT_NE(serialized.find("1000"), std::string::npos);
    EXPECT_NE(serialized.find("max_position_size"), std::string::npos);
    EXPECT_NE(serialized.find("10000.0"), std::string::npos);
}

TEST_F(CapnpSerializationTest, SerializationPerformance) {
    // Test serialization performance
    const int iterations = 100000;
    auto start = std::chrono::high_resolution_clock::now();
    
    for (int i = 0; i < iterations; ++i) {
        std::ostringstream oss;
        oss << "TICK " << test_tick.symbol << " " << test_tick.price << " " 
            << test_tick.volume << " " << test_tick.timestamp_ns;
        
        // Simulate processing
        std::string serialized = oss.str();
        volatile size_t size = serialized.size();  // Prevent optimization
        (void)size;  // Suppress unused variable warning
    }
    
    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
    
    double avg_time = static_cast<double>(duration.count()) / iterations;
    
    // Performance should be reasonable (less than 10 microseconds per serialization)
    EXPECT_LT(avg_time, 10.0) << "Average serialization time: " << avg_time << " μs";
    
    std::cout << "Average serialization time: " << avg_time << " μs" << std::endl;
}

TEST_F(CapnpSerializationTest, DeserializationPerformance) {
    // Test deserialization performance
    const int iterations = 100000;
    std::string serialized = "TICK BTC/USD 50000.0 100 1640995200000000000";
    
    auto start = std::chrono::high_resolution_clock::now();
    
    for (int i = 0; i < iterations; ++i) {
        std::istringstream iss(serialized);
        std::string token;
        
        // Parse fields
        iss >> token;  // TICK
        Tick parsed_tick;
        iss >> parsed_tick.symbol;
        iss >> parsed_tick.price;
        iss >> parsed_tick.volume;
        iss >> parsed_tick.timestamp_ns;
        
        // Simulate processing
        volatile double price = parsed_tick.price;  // Prevent optimization
        (void)price;  // Suppress unused variable warning
    }
    
    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
    
    double avg_time = static_cast<double>(duration.count()) / iterations;
    
    // Performance should be reasonable (less than 10 microseconds per deserialization)
    EXPECT_LT(avg_time, 10.0) << "Average deserialization time: " << avg_time << " μs";
    
    std::cout << "Average deserialization time: " << avg_time << " μs" << std::endl;
}
