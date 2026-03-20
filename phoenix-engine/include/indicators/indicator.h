#pragma once

#include <optional>

namespace phoenix {

class Indicator {
public:
    virtual ~Indicator() = default;
    virtual void update(double price) = 0;
    virtual std::optional<double> value() const = 0;
    virtual void reset() = 0;
};

} // namespace phoenix
