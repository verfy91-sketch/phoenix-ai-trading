#include <gtest/gtest.h>
#include "core/market_data.h"

using namespace phoenix;

TEST(MarketDataTest, AddAndRetrieve) {
    MarketDataManager mdm;
    Tick t1{"AAPL", 150.0, 100, 1000};
    Tick t2{"AAPL", 151.0, 200, 2000};
    mdm.add_tick(t1);
    mdm.add_tick(t2);

    auto* buf = mdm.get_buffer("AAPL");
    ASSERT_NE(buf, nullptr);
    EXPECT_EQ(buf->size(), 2);
    EXPECT_DOUBLE_EQ(buf->prices()[0], 150.0);
    EXPECT_DOUBLE_EQ(buf->prices()[1], 151.0);
    EXPECT_EQ(mdm.latest_price("AAPL"), 151.0);
}
