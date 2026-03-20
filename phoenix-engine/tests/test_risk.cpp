#include <gtest/gtest.h>
#include "core/risk_manager.h"

using namespace phoenix;

TEST(RiskManagerTest, OrderSizeCheck) {
    RiskConfig cfg;
    cfg.max_order_quantity = 10;
    RiskManager rm(cfg);
    EXPECT_TRUE(rm.check_order_size(5));
    EXPECT_FALSE(rm.check_order_size(15));
}

TEST(RiskManagerTest, PositionLimit) {
    RiskManager rm;
    EXPECT_TRUE(rm.check_position_limit("BTC", 1, 5000));
    // Assuming max_position_size default is 10000.
    EXPECT_FALSE(rm.check_position_limit("BTC", 1, 10001));
}
