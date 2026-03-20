#include <pybind11/pybind11.h>
#include <pybind11/functional.h>
#include <pybind11/stl.h>
#include "engine.h"
#include "core/market_data.h"
#include "core/order.h"
#include "core/portfolio.h"
#include "core/risk_manager.h"
#include <mutex>

namespace py = pybind11;
using namespace phoenix;

// Helper to hold Python callback and ensure GIL is held
struct TickCallbackHolder {
    py::function callback;
    TickCallbackHolder(py::function cb) : callback(cb) {}
    void operator()(const Tick& tick) {
        py::gil_scoped_acquire acquire;
        callback(tick);
    }
};

void bind_engine(py::module& m) {
    // Bind Tick
    py::class_<Tick>(m, "Tick")
        .def(py::init<>())
        .def_readonly("symbol", &Tick::symbol)
        .def_readonly("price", &Tick::price)
        .def_readonly("volume", &Tick::volume)
        .def_readonly("timestamp_ns", &Tick::timestamp_ns);

    // Bind Order enums
    py::enum_<OrderSide>(m, "OrderSide")
        .value("BUY", OrderSide::BUY)
        .value("SELL", OrderSide::SELL)
        .export_values();

    py::enum_<OrderType>(m, "OrderType")
        .value("MARKET", OrderType::MARKET)
        .value("LIMIT", OrderType::LIMIT)
        .export_values();

    py::enum_<OrderStatus>(m, "OrderStatus")
        .value("PENDING", OrderStatus::PENDING)
        .value("OPEN", OrderStatus::OPEN)
        .value("FILLED", OrderStatus::FILLED)
        .value("CANCELLED", OrderStatus::CANCELLED)
        .value("REJECTED", OrderStatus::REJECTED)
        .export_values();

    // Bind Order
    py::class_<Order>(m, "Order")
        .def(py::init<>())
        .def_readwrite("order_id", &Order::order_id)
        .def_readwrite("symbol", &Order::symbol)
        .def_readwrite("side", &Order::side)
        .def_readwrite("type", &Order::type)
        .def_readwrite("price", &Order::price)
        .def_readwrite("quantity", &Order::quantity)
        .def_readwrite("filled_qty", &Order::filled_qty)
        .def_readwrite("status", &Order::status)
        .def_readwrite("timestamp_ns", &Order::timestamp_ns);

    // Bind OrderManager
    py::class_<OrderManager>(m, "OrderManager")
        .def(py::init<>())
        .def("submit_order", &OrderManager::submit_order)
        .def("cancel_order", &OrderManager::cancel_order)
        .def("get_order", &OrderManager::get_order, py::return_value_policy::reference)
        .def("get_all_orders", &OrderManager::get_all_orders);

    // Bind Portfolio
    py::class_<Portfolio>(m, "Portfolio")
        .def(py::init<>())
        .def("update_position", &Portfolio::update_position,
              py::arg("symbol"), py::arg("delta"), py::arg("fill_price"))
        .def("get_position", &Portfolio::get_position)
        .def("get_balance", &Portfolio::get_balance)
        .def("get_unrealized_pnl", &Portfolio::get_unrealized_pnl,
              py::arg("symbol"), py::arg("current_price"))
        .def("set_balance", &Portfolio::set_balance);

    // Bind RiskConfig
    py::class_<RiskConfig>(m, "RiskConfig")
        .def(py::init<>())
        .def_readwrite("max_order_quantity", &RiskConfig::max_order_quantity)
        .def_readwrite("max_position_size", &RiskConfig::max_position_size)
        .def_readwrite("daily_loss_limit", &RiskConfig::daily_loss_limit)
        .def_readwrite("max_consecutive_losses", &RiskConfig::max_consecutive_losses);

    // Bind RiskManager
    py::class_<RiskManager>(m, "RiskManager")
        .def(py::init<const RiskConfig&>(), py::arg("config") = RiskConfig{})
        .def("check_order_size", &RiskManager::check_order_size)
        .def("check_position_limit", &RiskManager::check_position_limit, 
              py::arg("symbol"), py::arg("delta"), py::arg("current_pos"))
        .def("check_daily_loss", &RiskManager::check_daily_loss)
        .def("check_circuit_breaker", &RiskManager::check_circuit_breaker)
        .def("set_config", &RiskManager::set_config)
        .def("get_config", &RiskManager::get_config);

    // Bind Engine - add callback support
    py::class_<Engine>(m, "Engine")
        .def(py::init<>())
        .def("init", &Engine::init, py::arg("config_file") = "")
        .def("start", &Engine::start)
        .def("stop", &Engine::stop)
        .def("get_portfolio", &Engine::get_portfolio, py::return_value_policy::reference)
        .def("get_risk_manager", &Engine::get_risk_manager, py::return_value_policy::reference)
        .def("get_order_manager", &Engine::get_order_manager, py::return_value_policy::reference)
        .def("set_tick_callback", [](Engine& engine, py::function cb) {
            engine.set_tick_callback(TickCallbackHolder(cb));
        });
}
