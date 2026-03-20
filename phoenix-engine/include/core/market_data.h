#pragma once

#include "types.h"
#include <vector>
#include <unordered_map>
#include <mutex>

namespace phoenix {

// Structure-of-Arrays container for ticks (cache-efficient)
class TickBuffer {
public:
    void add_tick(const Tick& tick);
    size_t size() const;
    const std::vector<Price>& prices() const { return prices_; }
    const std::vector<Quantity>& volumes() const { return volumes_; }
    const std::vector<Timestamp>& timestamps() const { return timestamps_; }

private:
    std::vector<Price> prices_;
    std::vector<Quantity> volumes_;
    std::vector<Timestamp> timestamps_;
};

// Thread-safe market data manager that stores ticks per symbol.
class MarketDataManager {
public:
    void add_tick(const Tick& tick);
    const TickBuffer* get_buffer(const std::string& symbol) const;
    Price latest_price(const std::string& symbol) const;

private:
    mutable std::mutex mutex_;
    std::unordered_map<std::string, TickBuffer> buffers_;
};

} // namespace phoenix
