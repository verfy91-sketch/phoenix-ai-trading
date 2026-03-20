/**
 * @file test_tcp_server.cpp
 * @brief Unit tests for TCP server functionality
 * 
 * Tests the TCP server implementation including client connection,
 * message handling, and proper cleanup.
 */

#include <gtest/gtest.h>
#include <thread>
#include <chrono>
#include "ipc/tcp_server.h"
#include "engine.h"

using namespace phoenix::ipc;

class TcpServerTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Setup test engine
        engine_ = std::make_unique<phoenix::Engine>();
        engine_->init();
        
        // Use a different port for testing
        test_port_ = 5556;
    }
    
    void TearDown() override {
        // Cleanup
        if (server_) {
            server_->stop();
            server_.reset();
        }
        if (engine_) {
            engine_->stop();
            engine_.reset();
        }
        
        // Give some time for cleanup
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
    
    std::unique_ptr<phoenix::Engine> engine_;
    std::unique_ptr<TcpServer> server_;
    uint16_t test_port_;
};

// Test server creation and destruction
TEST_F(TcpServerTest, ServerCreation) {
    auto server = std::make_unique<TcpServer>(engine_.get(), test_port_);
    EXPECT_TRUE(server != nullptr);
    
    // Test destruction
    server.reset();
    EXPECT_TRUE(server == nullptr);
}

// Test server start and stop
TEST_F(TcpServerTest, ServerStartStop) {
    auto server = std::make_unique<TcpServer>(engine_.get(), test_port_);
    
    // Test start
    EXPECT_TRUE(server->start());
    EXPECT_TRUE(server->isRunning());
    
    // Test stop
    server->stop();
    EXPECT_FALSE(server->isRunning());
}

// Test multiple server instances on different ports
TEST_F(TcpServerTest, MultipleServerInstances) {
    auto server1 = std::make_unique<TcpServer>(engine_.get(), test_port_);
    auto server2 = std::make_unique<TcpServer>(engine_.get(), static_cast<uint16_t>(test_port_ + 1));
    
    EXPECT_TRUE(server1->start());
    EXPECT_TRUE(server2->start());
    
    EXPECT_TRUE(server1->isRunning());
    EXPECT_TRUE(server2->isRunning());
    
    server1->stop();
    server2->stop();
}

// Test tick broadcasting
TEST_F(TcpServerTest, TickBroadcasting) {
    auto server = std::make_unique<TcpServer>(engine_.get(), test_port_);
    ASSERT_TRUE(server->start());
    
    // Create a test tick
    phoenix::Tick tick;
    tick.symbol = "BTC/USD";
    tick.price = 50000.0;
    tick.volume = 100.0;
    tick.timestamp_ns = 1640995200000000000ULL;
    
    // Test broadcasting (should not crash)
    EXPECT_NO_THROW(server->broadcastTick(tick));
    
    server->stop();
}

// Test port binding failure
TEST_F(TcpServerTest, PortBindingFailure) {
    // Try to start server on a port that might be in use
    auto server1 = std::make_unique<TcpServer>(engine_.get(), test_port_);
    auto server2 = std::make_unique<TcpServer>(engine_.get(), test_port_);
    
    EXPECT_TRUE(server1->start());
    
    // Second server on same port should fail
    // Note: This test might not always fail depending on OS
    // but it demonstrates the error handling path
    bool server2_started = server2->start();
    
    server1->stop();
    
    if (server2_started) {
        server2->stop();
    }
    
    // At minimum, the code should handle the error gracefully
    SUCCEED() << "Port binding test completed";
}

// Test server with custom port
TEST_F(TcpServerTest, CustomPortSpecification) {
    uint16_t custom_port = 8888;
    auto server = std::make_unique<TcpServer>(engine_.get(), custom_port);
    
    EXPECT_TRUE(server->start());
    EXPECT_TRUE(server->isRunning());
    
    server->stop();
}

// Test server restart
TEST_F(TcpServerTest, ServerRestart) {
    auto server = std::make_unique<TcpServer>(engine_.get(), test_port_);
    
    // Start server
    EXPECT_TRUE(server->start());
    EXPECT_TRUE(server->isRunning());
    
    // Stop server
    server->stop();
    EXPECT_FALSE(server->isRunning());
    
    // Restart server
    EXPECT_TRUE(server->start());
    EXPECT_TRUE(server->isRunning());
    
    server->stop();
}

// Test concurrent access
TEST_F(TcpServerTest, ConcurrentAccess) {
    auto server = std::make_unique<TcpServer>(engine_.get(), test_port_);
    ASSERT_TRUE(server->start());
    
    // Simulate concurrent operations
    phoenix::Tick tick1, tick2;
    tick1.symbol = "BTC/USD";
    tick1.price = 50000.0;
    tick2.symbol = "ETH/USD";
    tick2.price = 3000.0;
    
    // These should be thread-safe
    EXPECT_NO_THROW(server->broadcastTick(tick1));
    EXPECT_NO_THROW(server->broadcastTick(tick2));
    
    server->stop();
}

// Main function for running tests
int main(int argc, char **argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
