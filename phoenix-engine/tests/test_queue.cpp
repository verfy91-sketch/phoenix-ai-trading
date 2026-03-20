#include <gtest/gtest.h>
#include "utils/concurrent_queue.h"
#include <thread>
#include <vector>

using namespace phoenix;

TEST(ConcurrentQueueTest, SingleProducerConsumer) {
    ConcurrentQueue<int> q;
    q.enqueue(42);
    auto val = q.try_dequeue();
    ASSERT_TRUE(val.has_value());
    EXPECT_EQ(*val, 42);
    EXPECT_FALSE(q.try_dequeue().has_value());
}

TEST(ConcurrentQueueTest, MultiThreaded) {
    ConcurrentQueue<int> q;
    const int num_items = 10000;
    std::thread producer([&] {
        for (int i = 0; i < num_items; ++i) {
            q.enqueue(i);
        }
    });
    std::thread consumer([&] {
        int count = 0;
        while (count < num_items) {
            auto val = q.try_dequeue();
            if (val) ++count;
        }
    });
    producer.join();
    consumer.join();
    EXPECT_EQ(q.size(), 0);
}
