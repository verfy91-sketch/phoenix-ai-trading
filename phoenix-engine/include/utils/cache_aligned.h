#pragma once

#include <cstddef>

#ifdef _WIN32
    #define CACHE_LINE_SIZE 64
    #define ALIGNAS_CACHE_LINE alignas(CACHE_LINE_SIZE)
#else
    #define CACHE_LINE_SIZE 64
    #define ALIGNAS_CACHE_LINE alignas(CACHE_LINE_SIZE)
#endif
