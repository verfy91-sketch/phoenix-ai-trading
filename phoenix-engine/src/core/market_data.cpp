#include "core/market_data.h"

namespace phoenix {

void TickBuffer::add_tick(const Tick& tick) {
    prices_.push_back(tick.price);
    volumes_.push_back(tick.volume);
    timestamps_.push_back(tick.timestamp_ns);
}

size_t TickBuffer::size() const {
    return prices_.size();
}

void MarketDataManager::add_tick(const Tick& tick) {
    std::lock_guard<std::mutex> lock(mutex_);
    buffers_[tick.symbol].add_tick(tick);
}

const TickBuffer* MarketDataManager::get_buffer(const std::string& symbol) const {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = buffers_.find(symbol);
    return (it != buffers_.end()) ? &it->second : nullptr;
}

Price MarketDataManager::latest_price(const std::string& symbol) const {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = buffers_.find(symbol);
    if (it == buffers_.end() || it->second.size() == 0) return 0.0;
    return it->second.prices().back();
}

} // namespace phoenix
