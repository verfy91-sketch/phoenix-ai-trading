"""
Phoenix IPC package for remote engine communication.

This package provides Python clients for connecting to the Phoenix AI Trading System
engine via TCP/IP communication using JSON messages.
"""

from .remote_engine import RemoteEngine
from .messages import (
    MessageTypes, RequestMethods,
    Tick, Order, OrderUpdate, Position, PortfolioSnapshot, 
    RiskStatus, EngineStats
)

__version__ = "1.0.0"
__all__ = [
    "RemoteEngine",
    "MessageTypes", "RequestMethods",
    "Tick", "Order", "OrderUpdate", "Position", 
    "PortfolioSnapshot", "RiskStatus", "EngineStats"
]
