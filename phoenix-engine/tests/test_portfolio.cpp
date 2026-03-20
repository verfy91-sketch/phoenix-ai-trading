#include <gtest/gtest.h>
#include "core/portfolio.h"

using namespace phoenix;

TEST(PortfolioTest, UpdatePosition) {
    Portfolio pf;
    pf.set_balance(10000.0);
    pf.update_position("AAPL", 10, 150.0);
    EXPECT_EQ(pf.get_position("AAPL"), 10.0);
    pf.update_position("AAPL", -5, 155.0);
    EXPECT_EQ(pf.get_position("AAPL"), 5.0);
    double pnl = pf.get_unrealized_pnl("AAPL", 160.0);
    // Avg price should be (10*150 + (-5)*155)/5 = (1500 -775)/5 = 725/5 =145
    EXPECT_NEAR(pf.get_position("AAPL"), 5.0, 0.001);
    EXPECT_NEAR(pnl, (160.0 - 145.0) * 5, 0.001);
}
