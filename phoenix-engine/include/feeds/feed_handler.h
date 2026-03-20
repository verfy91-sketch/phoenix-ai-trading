#pragma once

#include "core/types.h"
#include "utils/concurrent_queue.h"
#include <string>
#include <thread>
#include <atomic>

namespace phoenix {

class FeedHandler {
public:
    virtual ~FeedHandler() = default;
    virtual bool connect(const std::string& uri) = 0;
    virtual void start() = 0;
    virtual void stop() = 0;
    virtual ConcurrentQueue<Tick>& get_queue() = 0;
};

} // namespace phoenix
