#include "utils/memory_pool.h"
#include "core/types.h"

namespace phoenix {

template<typename T>
MemoryPool<T>::MemoryPool(size_t capacity) : storage_(capacity), free_indices_(capacity) {
    for (size_t i = 0; i < capacity; ++i) {
        free_indices_[i] = i;
    }
}

template<typename T>
MemoryPool<T>::~MemoryPool() = default;

template<typename T>
T* MemoryPool<T>::acquire() {
    std::lock_guard<std::mutex> lock(mutex_);
    if (free_indices_.empty()) return nullptr;
    size_t index = free_indices_.back();
    free_indices_.pop_back();
    return &storage_[index];
}

template<typename T>
void MemoryPool<T>::release(T* obj) {
    std::lock_guard<std::mutex> lock(mutex_);
    ptrdiff_t index = obj - storage_.data();
    if (index >= 0 && static_cast<size_t>(index) < storage_.size()) {
        free_indices_.push_back(static_cast<size_t>(index));
    }
}

// Explicit template instantiation for common types.
template class MemoryPool<Order>;
template class MemoryPool<Tick>;

} // namespace phoenix
