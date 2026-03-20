cmake_minimum_required(VERSION 3.20)
project(PhoenixEngine VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Options
option(BUILD_TESTS "Build unit tests" ON)
option(BUILD_BENCHMARKS "Build benchmarks" ON)
option(USE_VENDORED_DEPS "Use vendored dependencies instead of fetching" OFF)
option(BUILD_IPC "Build IPC TCP server" OFF)

# Release optimizations
if(CMAKE_BUILD_TYPE STREQUAL "Release")
    if(MSVC)
        add_compile_options(/O2 /DNDEBUG)
        add_compile_definitions(_CRT_SECURE_NO_WARNINGS)
    else()
        add_compile_options(-O3 -march=native -flto -DNDEBUG)
        add_link_options(-flto)
    endif()
elseif(CMAKE_BUILD_TYPE STREQUAL "Debug")
    if(MSVC)
        add_compile_options(/Od /Zi)
        add_compile_definitions(_CRT_SECURE_NO_WARNINGS)
    else()
        add_compile_options(-O0 -g -fsanitize=address,undefined)
        add_link_options(-fsanitize=address,undefined)
    endif()
endif()

# Include directories
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/third_party)

# Fetch dependencies
include(FetchContent)

# moodycamel::ConcurrentQueue (header only)
FetchContent_Declare(
    concurrentqueue
    GIT_REPOSITORY https://github.com/cameron314/concurrentqueue.git
    GIT_TAG v1.0.4
)
FetchContent_MakeAvailable(concurrentqueue)

# Google Test
if(BUILD_TESTS)
    FetchContent_Declare(
        googletest
        GIT_REPOSITORY https://github.com/google/googletest.git
        GIT_TAG v1.14.0
    )
    FetchContent_MakeAvailable(googletest)
endif()

# Google Benchmark
if(BUILD_BENCHMARKS)
    FetchContent_Declare(
        benchmark
        GIT_REPOSITORY https://github.com/google/benchmark.git
        GIT_TAG v1.8.3
    )
    FetchContent_MakeAvailable(benchmark)
endif()

# Cap'n Proto (for future use) - disabled for Phase 1
# option(ENABLE_CAPNP "Enable Cap'n Proto support" OFF)
# if(ENABLE_CAPNP)
#     FetchContent_Declare(
#         capnproto
#         GIT_REPOSITORY https://github.com/capnproto/capnproto.git
#         GIT_TAG v0.10.3
#     )
#     FetchContent_MakeAvailable(capnproto)
# endif()

# Python bindings (Phase 2)
option(BUILD_PYTHON_BINDINGS "Build Python bindings" OFF)

if(BUILD_PYTHON_BINDINGS)
    add_subdirectory(python)
endif()

# IPC layer (Phase 3)
option(BUILD_IPC "Build IPC layer" OFF)

if(BUILD_IPC)
    add_subdirectory(src/ipc)
endif()

# Engine library
file(GLOB_RECURSE ENGINE_SOURCES "src/*.cpp")
list(REMOVE_ITEM ENGINE_SOURCES
    "${CMAKE_CURRENT_SOURCE_DIR}/src/examples/main.cpp"
    # Exclude old ZMQ-related IPC files
    "${CMAKE_CURRENT_SOURCE_DIR}/src/ipc/zmq_helpers.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/ipc/zmq_helpers_simple.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/ipc/test_ipc.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/ipc/test_ipc_simple.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/ipc/test_ipc_minimal.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/ipc/ipc_minimal.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/ipc/ipc_manager.cpp"
)

add_library(phoenix_engine STATIC ${ENGINE_SOURCES})
target_include_directories(phoenix_engine PUBLIC include)
target_link_libraries(phoenix_engine PUBLIC concurrentqueue)

# Unit tests
if(BUILD_TESTS)
    file(GLOB TEST_SOURCES "tests/*.cpp")
    foreach(test_source ${TEST_SOURCES})
        get_filename_component(test_name ${test_source} NAME_WE)
        add_executable(${test_name} ${test_source})
        target_link_libraries(${test_name} phoenix_engine gtest_main)
        add_test(NAME ${test_name} COMMAND ${test_name})
    endforeach()
endif()

# Benchmarks
if(BUILD_BENCHMARKS)
    file(GLOB BENCH_SOURCES "benchmarks/*.cpp")
    add_executable(phoenix_benchmarks ${BENCH_SOURCES})
    target_link_libraries(phoenix_benchmarks phoenix_engine benchmark::benchmark)
endif()

# Example executable (optional)
add_executable(example src/examples/main.cpp)
target_link_libraries(example phoenix_engine)
