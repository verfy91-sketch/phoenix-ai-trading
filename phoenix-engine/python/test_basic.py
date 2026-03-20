#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, '../build/python/Release')

import phoenix_engine as pe

def test_basic():
    print("Testing basic import...")
    engine = pe.Engine()
    print("✓ Engine created")
    
    # Test RSI
    rsi = pe.RSI(14)
    rsi.update(50000)
    val = rsi.value()
    print(f"✓ RSI value after one update: {val}")
    
    rsi.reset()
    val_after_reset = rsi.value()
    print(f"✓ RSI value after reset: {val_after_reset}")
    
    # Test order creation
    order = pe.Order()
    order.symbol = "BTC/USD"
    order.side = pe.OrderSide.BUY
    order.quantity = 1
    print("✓ Order created")
    
    print("\n=== All basic tests passed! ===")

if __name__ == "__main__":
    test_basic()
