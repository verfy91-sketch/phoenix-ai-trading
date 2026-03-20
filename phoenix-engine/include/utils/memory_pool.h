#pragma once

#include <vector>
#include <cstddef>
#include <mutex>

namespace phoenix {

template<typename T>
class MemoryPool {
public:
    explicit MemoryPool(size_t capacity);
    ~MemoryPool();

    T* acquire();
    void release(T* obj);

    size_t capacity() const { return storage_.size(); }
    size_t available() const { return free_indices_.size(); }

private:
    std::vector<T> storage_;
    std::vector<size_t> free_indices_;
    std::mutex mutex_;
};

} // namespace phoenix
