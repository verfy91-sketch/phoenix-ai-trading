#include "core/risk_manager.h"

namespace phoenix {

RiskManager::RiskManager(const RiskConfig& config) : config_(config) {}

bool RiskManager::check_order_size(uint32_t qty) const {
    return qty <= config_.max_order_quantity;
}

bool RiskManager::check_position_limit(const std::string& symbol, int64_t delta, double current_pos) const {
    double new_pos = current_pos + delta;
    return new_pos <= config_.max_position_size;
}

bool RiskManager::check_daily_loss(double pnl_today) const {
    return pnl_today >= -config_.daily_loss_limit;
}

bool RiskManager::check_circuit_breaker(int consecutive_losses) const {
    return consecutive_losses < static_cast<int>(config_.max_consecutive_losses);
}

void RiskManager::set_config(const RiskConfig& config) {
    config_ = config;
}

RiskConfig RiskManager::get_config() const {
    return config_;
}

} // namespace phoenix
