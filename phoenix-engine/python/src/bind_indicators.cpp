#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include "indicators/rsi.h"

namespace py = pybind11;
using namespace phoenix;

void bind_indicators(py::module& m) {
    py::class_<RSI>(m, "RSI")
        .def(py::init<int>(), py::arg("period") = 14)
        .def("update", &RSI::update)
        .def("value", &RSI::value)
        .def("reset", &RSI::reset);
}
