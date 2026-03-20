#pragma once

#include "types.h"
#include <unordered_map>
#include <mutex>

namespace phoenix {

class Portfolio {
public:
    void update_position(const std::string& symbol, int64_t delta, Price fill_price);
    double get_position(const std::string& symbol) const;
    double get_balance() const;
    double get_unrealized_pnl(const std::string& symbol, Price current_price) const;
    void set_balance(double balance);

private:
    mutable std::mutex mutex_;
    double balance_ = 0.0;
    std::unordered_map<std::string, Position> positions_;
};

} // namespace phoenix
