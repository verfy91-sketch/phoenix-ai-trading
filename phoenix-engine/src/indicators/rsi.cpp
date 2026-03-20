#include "indicators/rsi.h"
#include <cmath>

namespace phoenix {

RSI::RSI(int period)
    : period_(period), avg_gain_(0.0), avg_loss_(0.0), last_price_(0.0), has_prev_(false) {}

void RSI::update(double price) {
    if (!has_prev_) {
        last_price_ = price;
        has_prev_ = true;
        return;
    }

    double change = price - last_price_;
    double gain = (change > 0) ? change : 0.0;
    double loss = (change < 0) ? -change : 0.0;

    if (avg_gain_ == 0.0 && avg_loss_ == 0.0) {
        avg_gain_ = gain;
        avg_loss_ = loss;
    } else {
        avg_gain_ = (avg_gain_ * (period_ - 1) + gain) / period_;
        avg_loss_ = (avg_loss_ * (period_ - 1) + loss) / period_;
    }

    last_price_ = price;
}

std::optional<double> RSI::value() const {
    if (avg_loss_ == 0.0 || !has_prev_) return std::nullopt;
    double rs = avg_gain_ / avg_loss_;
    return 100.0 - 100.0 / (1.0 + rs);
}

void RSI::reset() {
    avg_gain_ = 0.0;
    avg_loss_ = 0.0;
    last_price_ = 0.0;
    has_prev_ = false;
}

} // namespace phoenix
