#include "core/portfolio.h"

namespace phoenix {

void Portfolio::update_position(const std::string& symbol, int64_t delta, Price fill_price) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto& pos = positions_[symbol];
    int64_t old_qty = pos.net_quantity;
    int64_t new_qty = old_qty + delta;

    // Update average price using weighted average.
    if (old_qty != 0) {
        double total_cost = old_qty * pos.avg_price;
        double fill_cost = delta * fill_price;
        double new_avg = (total_cost + fill_cost) / new_qty;
        pos.avg_price = new_avg;
    } else {
        pos.avg_price = fill_price;
    }
    pos.net_quantity = new_qty;
    pos.symbol = symbol;
}

double Portfolio::get_position(const std::string& symbol) const {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = positions_.find(symbol);
    return (it != positions_.end()) ? it->second.net_quantity : 0.0;
}

double Portfolio::get_balance() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return balance_;
}

double Portfolio::get_unrealized_pnl(const std::string& symbol, Price current_price) const {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = positions_.find(symbol);
    if (it == positions_.end() || it->second.net_quantity == 0) return 0.0;
    int64_t qty = it->second.net_quantity;
    return (current_price - it->second.avg_price) * qty;
}

void Portfolio::set_balance(double balance) {
    std::lock_guard<std::mutex> lock(mutex_);
    balance_ = balance;
}

} // namespace phoenix
