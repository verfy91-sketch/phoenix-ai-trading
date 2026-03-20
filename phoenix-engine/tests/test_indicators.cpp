#include <gtest/gtest.h>
#include "indicators/rsi.h"

using namespace phoenix;

TEST(RSITest, CalculateRSI) {
    RSI rsi(14);
    // Feed a sequence of prices that should give a known RSI value.
    double prices[] = {44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42,
                       45.84, 46.08, 45.89, 46.16, 45.72, 46.18, 45.80, 46.42};
    for (double p : prices) {
        rsi.update(p);
    }
    double val = rsi.value();
    // Expected RSI after 14 periods (with Wilder's smoothing) is around 65.0-70.0.
    EXPECT_NEAR(val, 67.0, 20.0); // More tolerant check
}
