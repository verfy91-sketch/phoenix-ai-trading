# Find or fetch Pybind11
include(FetchContent)
FetchContent_Declare(
    pybind11
    GIT_REPOSITORY https://github.com/pybind/pybind11.git
    GIT_TAG v2.12.0
)
FetchContent_MakeAvailable(pybind11)

# Find Python (development headers)
find_package(Python COMPONENTS Interpreter Development REQUIRED)

# Create the Python module with a different name to avoid conflicts
pybind11_add_module(phoenix_engine_py
    src/main.cpp
    src/bind_engine.cpp
    src/bind_indicators.cpp
)

# Link C++ engine library
target_link_libraries(phoenix_engine_py PRIVATE phoenix_engine)

# Set output directory for the module
set_target_properties(phoenix_engine_py PROPERTIES
    LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/python
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/python
)

# Set output name to phoenix_engine for Python import
set_target_properties(phoenix_engine_py PROPERTIES
    OUTPUT_NAME phoenix_engine
)

# Install target (optional)
install(TARGETS phoenix_engine_py DESTINATION python)
