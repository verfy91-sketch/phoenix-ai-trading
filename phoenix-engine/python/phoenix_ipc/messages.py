"""
JSON message helpers for Phoenix IPC communication.

This module provides utilities for creating and parsing JSON messages
used in IPC communication between Python clients and the C++ engine.
"""

import json
from typing import Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class Tick:
    """Market data tick."""
    symbol: str
    price: float
    volume: float
    timestamp_ns: int


@dataclass
class Order:
    """Order data."""
    id: int
    symbol: str
    side: int  # OrderSide enum
    type: int   # OrderType enum
    price: float
    quantity: float
    filled_quantity: float
    status: int  # OrderStatus enum
    timestamp_ns: int
    client_id: str = ""


@dataclass
class OrderUpdate:
    """Order update data."""
    order_id: int
    symbol: str
    side: int
    type: int
    price: float
    quantity: float
    filled_quantity: float
    status: int
    timestamp_ns: int
    client_id: str = ""


@dataclass
class Position:
    """Position data."""
    symbol: str
    quantity: float
    avg_price: float
    current_price: float
    unrealized_pnl: float


@dataclass
class PortfolioSnapshot:
    """Portfolio snapshot data."""
    balance: float
    unrealized_pnl: float
    realized_pnl: float
    total_value: float
    positions: list


@dataclass
class RiskStatus:
    """Risk management status."""
    max_position_size: float
    max_order_size: float
    max_daily_loss: float
    current_daily_loss: float
    risk_level: int
    blocked: bool


@dataclass
class EngineStats:
    """Engine statistics."""
    uptime_ns: int
    ticks_processed: int
    orders_submitted: int
    orders_filled: int
    total_volume: float
    total_turnover: float
    avg_fill_rate: float


class MessageTypes:
    """Message type constants."""
    REQUEST = "request"
    RESPONSE = "response"
    TICK = "tick"
    ORDER_UPDATE = "order_update"
    HEARTBEAT = "heartbeat"


class RequestMethods:
    """Request method constants."""
    SUBMIT_ORDER = "submitOrder"
    CANCEL_ORDER = "cancelOrder"
    GET_PORTFOLIO = "getPortfolio"
    GET_RISK_STATUS = "getRiskStatus"
    GET_STATS = "getStats"
    SUBSCRIBE_TICKS = "subscribeTicks"
    UNSUBSCRIBE_TICKS = "unsubscribeTicks"


def make_request(method: str, params: Dict[str, Any], request_id: int) -> Dict[str, Any]:
    """Create a request message."""
    return {
        "id": request_id,
        "type": MessageTypes.REQUEST,
        "method": method,
        "params": params
    }


def make_tick_message(tick: Tick) -> Dict[str, Any]:
    """Create a tick message."""
    return {
        "type": MessageTypes.TICK,
        "data": {
            "symbol": tick.symbol,
            "price": tick.price,
            "volume": tick.volume,
            "timestamp_ns": tick.timestamp_ns
        }
    }


def make_order_update_message(update: OrderUpdate) -> Dict[str, Any]:
    """Create an order update message."""
    return {
        "type": MessageTypes.ORDER_UPDATE,
        "data": {
            "order_id": update.order_id,
            "symbol": update.symbol,
            "side": update.side,
            "type": update.type,
            "price": update.price,
            "quantity": update.quantity,
            "filled_quantity": update.filled_quantity,
            "status": update.status,
            "timestamp_ns": update.timestamp_ns,
            "client_id": update.client_id
        }
    }


def parse_message(data: str) -> Optional[Dict[str, Any]]:
    """Parse incoming JSON message."""
    try:
        return json.loads(data)
    except json.JSONDecodeError:
        return None


def tick_from_dict(data: Dict[str, Any]) -> Tick:
    """Create Tick from dictionary."""
    return Tick(
        symbol=data["symbol"],
        price=data["price"],
        volume=data["volume"],
        timestamp_ns=data["timestamp_ns"]
    )


def order_from_dict(data: Dict[str, Any]) -> Order:
    """Create Order from dictionary."""
    return Order(
        id=data.get("id", 0),
        symbol=data["symbol"],
        side=data["side"],
        type=data["type"],
        price=data.get("price", 0.0),
        quantity=data["quantity"],
        filled_quantity=data.get("filled_quantity", 0.0),
        status=data.get("status", 0),
        timestamp_ns=data.get("timestamp_ns", 0),
        client_id=data.get("client_id", "")
    )


def portfolio_from_dict(data: Dict[str, Any]) -> PortfolioSnapshot:
    """Create PortfolioSnapshot from dictionary."""
    positions = []
    for pos_data in data.get("positions", []):
        positions.append(Position(
            symbol=pos_data["symbol"],
            quantity=pos_data["quantity"],
            avg_price=pos_data["avg_price"],
            current_price=pos_data["current_price"],
            unrealized_pnl=pos_data["unrealized_pnl"]
        ))
    
    return PortfolioSnapshot(
        balance=data["balance"],
        unrealized_pnl=data["unrealized_pnl"],
        realized_pnl=data["realized_pnl"],
        total_value=data["total_value"],
        positions=positions
    )


def risk_status_from_dict(data: Dict[str, Any]) -> RiskStatus:
    """Create RiskStatus from dictionary."""
    return RiskStatus(
        max_position_size=data["max_position_size"],
        max_order_size=data["max_order_size"],
        max_daily_loss=data["max_daily_loss"],
        current_daily_loss=data["current_daily_loss"],
        risk_level=data["risk_level"],
        blocked=data["blocked"]
    )


def stats_from_dict(data: Dict[str, Any]) -> EngineStats:
    """Create EngineStats from dictionary."""
    return EngineStats(
        uptime_ns=data["uptime_ns"],
        ticks_processed=data["ticks_processed"],
        orders_submitted=data["orders_submitted"],
        orders_filled=data["orders_filled"],
        total_volume=data["total_volume"],
        total_turnover=data["total_turnover"],
        avg_fill_rate=data["avg_fill_rate"]
    )
