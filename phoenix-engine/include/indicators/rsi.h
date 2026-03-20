#pragma once

#include "indicator.h"
#include <optional>

namespace phoenix {

class RSI : public Indicator {
public:
    explicit RSI(int period = 14);
    void update(double price) override;
    std::optional<double> value() const override;
    void reset() override;

private:
    int period_;
    double avg_gain_, avg_loss_;
    double last_price_;
    bool has_prev_;
};

} // namespace phoenix
