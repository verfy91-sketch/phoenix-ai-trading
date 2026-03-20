#pragma once

#include <iostream>
#include <chrono>
#include <ctime>

#define LOG_INFO(msg) \
    do { \
        auto now = std::chrono::system_clock::now(); \
        auto t = std::chrono::system_clock::to_time_t(now); \
        std::cout << "[" << std::put_time(std::localtime(&t), "%Y-%m-%d %H:%M:%S") << "] INFO: " << msg << std::endl; \
    } while (0)

#define LOG_ERROR(msg) \
    do { \
        auto now = std::chrono::system_clock::now(); \
        auto t = std::chrono::system_clock::to_time_t(now); \
        std::cerr << "[" << std::put_time(std::localtime(&t), "%Y-%m-%d %H:%M:%S") << "] ERROR: " << msg << std::endl; \
    } while (0)
