#pragma once

#include <cstdint>
#include <string>

namespace phoenix {

struct RiskConfig {
    uint32_t max_order_quantity = 1000;
    double max_position_size = 10000.0;
    double daily_loss_limit = 1000.0;   // maximum loss per day
    uint32_t max_consecutive_losses = 5;
};

class RiskManager {
public:
    explicit RiskManager(const RiskConfig& config = RiskConfig{});

    bool check_order_size(uint32_t qty) const;
    bool check_position_limit(const std::string& symbol, int64_t delta, double current_pos) const;
    bool check_daily_loss(double pnl_today) const;
    bool check_circuit_breaker(int consecutive_losses) const;
    void set_config(const RiskConfig& config);
    RiskConfig get_config() const;

private:
    RiskConfig config_;
};

} // namespace phoenix
