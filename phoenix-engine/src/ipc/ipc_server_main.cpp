/**
 * @file ipc_server_main.cpp
 * @brief Main entry point for Phoenix IPC server
 * 
 * This is a simple main function that starts the Phoenix engine
 * with IPC server enabled for remote client connections.
 */

#include <iostream>
#include <memory>
#include <csignal>
#include "engine.h"
#include "ipc/tcp_server.h"

// Global flag for signal handling
std::atomic<bool> g_running(true);

void signal_handler(int signal) {
    std::cout << "\nReceived signal " << signal << ", shutting down..." << std::endl;
    g_running.store(false);
}

int main(int argc, char* argv[]) {
    std::cout << "Phoenix AI Trading System - IPC Server" << std::endl;
    std::cout << "====================================" << std::endl;
    
    // Setup signal handlers
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    
    try {
        // Create engine
        auto engine = std::make_unique<phoenix::Engine>();
        
        // Initialize engine
        if (!engine->init()) {
            std::cerr << "Failed to initialize engine" << std::endl;
            return 1;
        }
        
        // Create IPC server
        uint16_t port = 5555;
        if (argc > 1) {
            port = static_cast<uint16_t>(std::stoi(argv[1]));
        }
        
        auto ipc_server = std::make_unique<phoenix::ipc::TcpServer>(engine.get(), port);
        
        // Start IPC server
        if (!ipc_server->start()) {
            std::cerr << "Failed to start IPC server on port " << port << std::endl;
            return 1;
        }
        
        std::cout << "IPC server started on port " << port << std::endl;
        std::cout << "Engine with IPC support is running..." << std::endl;
        std::cout << "Press Ctrl+C to stop" << std::endl;
        
        // Start the engine
        engine->start();
        
        // Enable IPC in engine
        engine->set_ipc_enabled(true);
        
        // Main loop
        while (g_running.load()) {
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
        
        // Cleanup
        std::cout << "Shutting down..." << std::endl;
        engine->stop();
        ipc_server->stop();
        
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    
    std::cout << "Phoenix IPC server stopped" << std::endl;
    return 0;
}
