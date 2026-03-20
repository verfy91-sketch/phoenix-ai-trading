#include <gtest/gtest.h>
#include <thread>
#include <chrono>
#include "ipc/zmq_helpers.h"
#include "ipc/message_types.h"

using namespace phoenix::ipc;

class ZmqHelpersTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Initialize context
        context = &ZmqContext::instance();
    }

    void TearDown() override {
        // Cleanup handled by RAII
    }

    ZmqContext* context;
};

TEST_F(ZmqHelpersTest, ContextSingleton) {
    // Test that context is a singleton
    ZmqContext& ctx1 = ZmqContext::instance();
    ZmqContext& ctx2 = ZmqContext::instance();
    
    EXPECT_EQ(&ctx1, &ctx2);
    EXPECT_NO_THROW(ctx1.get());
}

TEST_F(ZmqHelpersTest, SocketCreation) {
    // Test socket creation for different types
    EXPECT_NO_THROW(ZmqSocket pub_socket(ZMQ_PUB));
    EXPECT_NO_THROW(ZmqSocket sub_socket(ZMQ_SUB));
    EXPECT_NO_THROW(ZmqSocket req_socket(ZMQ_REQ));
    EXPECT_NO_THROW(ZmqSocket rep_socket(ZMQ_REP));
    EXPECT_NO_THROW(ZmqSocket router_socket(ZMQ_ROUTER));
}

TEST_F(ZmqHelpersTest, SocketConnection) {
    // Test in-process socket connection
    ZmqSocket pub_socket(ZMQ_PUB);
    ZmqSocket sub_socket(ZMQ_SUB);
    
    // Bind and connect
    EXPECT_TRUE(pub_socket.bind("inproc://test"));
    EXPECT_TRUE(sub_socket.connect("inproc://test"));
    
    // Subscribe to all messages
    EXPECT_TRUE(sub_socket.setsockopt_string(ZMQ_SUBSCRIBE, ""));
}

TEST_F(ZmqHelpersTest, MessageSendReceive) {
    // Test basic message send/receive
    ZmqSocket req_socket(ZMQ_REQ);
    ZmqSocket rep_socket(ZMQ_REP);
    
    // Bind and connect
    EXPECT_TRUE(req_socket.connect("inproc://test_msg"));
    EXPECT_TRUE(rep_socket.bind("inproc://test_msg"));
    
    // Send message
    std::string test_data = "Hello, ZeroMQ!";
    ZmqMessage send_msg(test_data);
    EXPECT_TRUE(req_socket.send(send_msg.get()));
    
    // Receive message
    ZmqMessage recv_msg;
    EXPECT_TRUE(rep_socket.receive(&recv_msg.get()));
    
    // Verify message content
    EXPECT_EQ(recv_msg.size(), test_data.length());
    EXPECT_EQ(std::string(static_cast<const char*>(recv_msg.data()), recv_msg.size()), test_data);
}

TEST_F(ZmqHelpersTest, MessageCreation) {
    // Test different message creation methods
    
    // Empty message
    ZmqMessage empty_msg;
    EXPECT_EQ(empty_msg.size(), 0);
    
    // String message
    std::string test_str = "Test string";
    ZmqMessage str_msg(test_str);
    EXPECT_EQ(str_msg.size(), test_str.length());
    EXPECT_EQ(std::string(static_cast<const char*>(str_msg.data()), str_msg.size()), test_str);
    
    // Data message
    const char* test_data = "Test data";
    size_t data_size = strlen(test_data);
    ZmqMessage data_msg(test_data, data_size);
    EXPECT_EQ(data_msg.size(), data_size);
    EXPECT_EQ(std::string(static_cast<const char*>(data_msg.data()), data_msg.size()), test_data);
}

TEST_F(ZmqHelpersTest, Polling) {
    // Test socket polling
    ZmqSocket pub_socket(ZMQ_PUB);
    ZmqSocket sub_socket(ZMQ_SUB);
    
    // Bind and connect
    EXPECT_TRUE(pub_socket.bind("inproc://test_poll"));
    EXPECT_TRUE(sub_socket.connect("inproc://test_poll"));
    EXPECT_TRUE(sub_socket.setsockopt_string(ZMQ_SUBSCRIBE, ""));
    
    // Setup polling
    zmq::pollitem_t items[1];
    items[0] = zmq_utils::make_pollitem(sub_socket, ZMQ_POLLIN);
    
    // Poll with timeout (should timeout since no message)
    int rc = zmq_utils::poll(items, 1, 100);  // 100ms timeout
    EXPECT_EQ(rc, 0);  // No messages available
    
    // Send message and poll
    ZmqMessage msg("test message");
    pub_socket.send(msg.get());
    
    // Poll again (should receive message)
    rc = zmq_utils::poll(items, 1, 1000);  // 1s timeout
    EXPECT_EQ(rc, 1);  // Message available
    EXPECT_TRUE(items[0].revents & ZMQ_POLLIN);
}

TEST_F(ZmqHelpersTest, TimestampFunctions) {
    // Test timestamp utility functions
    uint64_t ts1 = zmq_utils::get_timestamp_us();
    uint64_t ts2 = zmq_utils::get_timestamp_ns();
    
    // Timestamps should be non-zero
    EXPECT_GT(ts1, 0);
    EXPECT_GT(ts2, 0);
    
    // Nanosecond timestamp should be larger than microsecond timestamp
    EXPECT_GT(ts2, ts1);
    
    // Wait a bit and check that timestamps increase
    std::this_thread::sleep_for(std::chrono::milliseconds(1));
    
    uint64_t ts3 = zmq_utils::get_timestamp_us();
    EXPECT_GT(ts3, ts1);
}

TEST_F(ZmqHelpersTest, MessageEnums) {
    // Test message type enums
    EXPECT_EQ(static_cast<int>(MessageType::TICK_DATA), 0);
    EXPECT_EQ(static_cast<int>(MessageType::ORDER_REQUEST), 1);
    EXPECT_EQ(static_cast<int>(MessageType::ORDER_UPDATE), 2);
    
    EXPECT_EQ(static_cast<int>(OrderSide::BUY), 0);
    EXPECT_EQ(static_cast<int>(OrderSide::SELL), 1);
    
    EXPECT_EQ(static_cast<int>(OrderType::MARKET), 0);
    EXPECT_EQ(static_cast<int>(OrderType::LIMIT), 1);
    
    EXPECT_EQ(static_cast<int>(OrderStatus::PENDING), 0);
    EXPECT_EQ(static_cast<int>(OrderStatus::OPEN), 1);
    EXPECT_EQ(static_cast<int>(OrderStatus::FILLED), 2);
    EXPECT_EQ(static_cast<int>(OrderStatus::CANCELLED), 3);
    EXPECT_EQ(static_cast<int>(OrderStatus::REJECTED), 4);
}

TEST_F(ZmqHelpersTest, MessageEnumStrings) {
    // Test enum to string conversions
    EXPECT_STREQ(order_side_to_string(OrderSide::BUY), "BUY");
    EXPECT_STREQ(order_side_to_string(OrderSide::SELL), "SELL");
    
    EXPECT_STREQ(order_type_to_string(OrderType::MARKET), "MARKET");
    EXPECT_STREQ(order_type_to_string(OrderType::LIMIT), "LIMIT");
    
    EXPECT_STREQ(order_status_to_string(OrderStatus::PENDING), "PENDING");
    EXPECT_STREQ(order_status_to_string(OrderStatus::FILLED), "FILLED");
    EXPECT_STREQ(order_status_to_string(OrderStatus::CANCELLED), "CANCELLED");
    EXPECT_STREQ(order_status_to_string(OrderStatus::REJECTED), "REJECTED");
    
    EXPECT_STREQ(message_type_to_string(MessageType::TICK_DATA), "TICK_DATA");
    EXPECT_STREQ(message_type_to_string(MessageType::ORDER_REQUEST), "ORDER_REQUEST");
    EXPECT_STREQ(message_type_to_string(MessageType::ORDER_UPDATE), "ORDER_UPDATE");
}
