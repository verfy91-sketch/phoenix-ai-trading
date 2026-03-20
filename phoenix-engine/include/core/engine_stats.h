#pragma once

#include <cstdint>

namespace phoenix {

struct EngineStats {
    uint64_t uptime_ns = 0;
    uint64_t ticks_processed = 0;
    uint64_t orders_submitted = 0;
    uint64_t orders_filled = 0;
    double total_volume = 0.0;
};

} // namespace phoenix
