'use client';

import React, { useState } from 'react';
import { Header, Sidebar, Footer } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useOrders } from '@/hooks/useOrders';
import { useAvailableSymbols } from '@/hooks/useOrders';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight,
  ArrowDownRight,
  Play,
  Square
} from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils/formatters';

export default function TradingPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USD');
  const [orderForm, setOrderForm] = useState({
    side: 'BUY' as 'BUY' | 'SELL',
    type: 'MARKET' as 'MARKET' | 'LIMIT' | 'STOP',
    quantity: '',
    price: '',
    stopPrice: '',
  });
  
  const { orders, submitOrder, isSubmitting } = useOrders();
  const { symbols, isLoading: symbolsLoading } = useAvailableSymbols();
  const { subscribe, unsubscribe, isConnected } = useWebSocket();

  React.useEffect(() => {
    if (isConnected && selectedSymbol) {
      subscribe([selectedSymbol]);
    }
    return () => {
      if (selectedSymbol) {
        unsubscribe([selectedSymbol]);
      }
    };
  }, [isConnected, selectedSymbol, subscribe, unsubscribe]);

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderForm.quantity) {
      return;
    }

    const orderData = {
      symbol: selectedSymbol,
      side: orderForm.side,
      type: orderForm.type,
      quantity: parseFloat(orderForm.quantity),
      ...(orderForm.type !== 'MARKET' && orderForm.price && { price: parseFloat(orderForm.price) }),
      ...(orderForm.type === 'STOP' && orderForm.stopPrice && { stopPrice: parseFloat(orderForm.stopPrice) }),
    };

    submitOrder(orderData);
    
    // Reset form
    setOrderForm({
      side: 'BUY',
      type: 'MARKET',
      quantity: '',
      price: '',
      stopPrice: '',
    });
  };

  const openOrders = orders?.filter((order: any) => order.status === 'PENDING') || [];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="lg:ml-64 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Trading</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Place orders and monitor real-time market data
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Form */}
            <Card>
              <CardHeader>
                <CardTitle>Place Order</CardTitle>
                <CardDescription>
                  Enter your trade parameters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitOrder} className="space-y-4">
                  {/* Symbol Selection */}
                  <div>
                    <label className="text-sm font-medium">Symbol</label>
                    <select
                      value={selectedSymbol}
                      onChange={(e) => setSelectedSymbol(e.target.value)}
                      className="w-full mt-1 p-2 border rounded-md bg-white dark:bg-gray-800"
                      disabled={symbolsLoading}
                    >
                      {symbolsLoading ? (
                        <option>Loading symbols...</option>
                      ) : (
                        symbols.map((symbol: any) => (
                          <option key={symbol} value={symbol}>
                            {symbol}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Order Side */}
                  <div>
                    <label className="text-sm font-medium">Side</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setOrderForm(prev => ({ ...prev, side: 'BUY' }))}
                        className={`p-2 rounded-md border transition-colors ${
                          orderForm.side === 'BUY'
                            ? 'bg-green-500 text-white border-green-500'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        BUY
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderForm(prev => ({ ...prev, side: 'SELL' }))}
                        className={`p-2 rounded-md border transition-colors ${
                          orderForm.side === 'SELL'
                            ? 'bg-red-500 text-white border-red-500'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        SELL
                      </button>
                    </div>
                  </div>

                  {/* Order Type */}
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <select
                      value={orderForm.type}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full mt-1 p-2 border rounded-md bg-white dark:bg-gray-800"
                    >
                      <option value="MARKET">Market</option>
                      <option value="LIMIT">Limit</option>
                      <option value="STOP">Stop</option>
                    </select>
                  </div>

                  {/* Quantity */}
                  <Input
                    type="number"
                    label="Quantity"
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, quantity: e.target.value }))}
                    required
                  />

                  {/* Price (for non-market orders) */}
                  {orderForm.type !== 'MARKET' && (
                    <Input
                      type="number"
                      label={orderForm.type === 'STOP' ? 'Stop Price' : 'Limit Price'}
                      placeholder="0.00"
                      step="0.01"
                      min="0.01"
                      value={orderForm.price}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, price: e.target.value }))}
                      required
                    />
                  )}

                  {/* Stop Price (for STOP orders) */}
                  {orderForm.type === 'STOP' && (
                    <Input
                      type="number"
                      label="Stop Loss Price"
                      placeholder="0.00"
                      step="0.01"
                      min="0.01"
                      value={orderForm.stopPrice}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, stopPrice: e.target.value }))}
                      required
                    />
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting || !orderForm.quantity}
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Placing Order...
                      </>
                    ) : (
                      `Place ${orderForm.side} Order`
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Market Data & Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {selectedSymbol}
                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                    ) : (
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    )}
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </CardTitle>
                <CardDescription>
                  Real-time market data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Price Display */}
                  <div className="text-center py-8">
                    <div className="text-3xl font-bold">
                      {formatCurrency(45000.00)} {/* Mock price */}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <ArrowUpRight className="h-4 w-4" />
                      <span>+2.5%</span>
                    </div>
                  </div>

                  {/* Mock Chart */}
                  <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                      <p>Chart visualization</p>
                      <p className="text-sm">TradingView integration</p>
                    </div>
                  </div>

                  {/* Market Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">24h High</span>
                      <p className="font-medium">{formatCurrency(46000)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">24h Low</span>
                      <p className="font-medium">{formatCurrency(44000)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">24h Volume</span>
                      <p className="font-medium">1.2B</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">24h Change</span>
                      <p className="font-medium text-green-600">+2.5%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Open Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Open Orders</CardTitle>
                <CardDescription>
                  Your pending orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                {openOrders.length > 0 ? (
                  <div className="space-y-3">
                    {openOrders.map((order: any) => (
                      <div key={order.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              order.side === 'BUY' ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            <span className="font-medium">{order.symbol}</span>
                          </div>
                          <span className={`text-sm px-2 py-1 rounded ${
                            order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : ''
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Side:</span>
                            <span className="ml-1">{order.side}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Type:</span>
                            <span className="ml-1">{order.type}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Qty:</span>
                            <span className="ml-1">{order.quantity}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Price:</span>
                            <span className="ml-1">
                              {order.type === 'MARKET' ? 'Market' : formatCurrency(order.price || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>No open orders</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer className="lg:ml-64" />
    </div>
  );
}
