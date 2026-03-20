#include <pybind11/pybind11.h>

namespace py = pybind11;

// Forward declarations of binding functions
void bind_engine(py::module& m);
void bind_indicators(py::module& m);

PYBIND11_MODULE(phoenix_engine, m) {
    m.doc() = "Phoenix AI Trading Engine - C++ core with Python bindings";

    bind_engine(m);
    bind_indicators(m);
}
