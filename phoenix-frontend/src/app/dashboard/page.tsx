'use client';

import React, { useState } from 'react';
import { Header, Sidebar, Footer } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useOrders } from '@/hooks/useOrders';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart
} from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils/formatters';

export default function DashboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuthStore();
  const { portfolio, isLoading: portfolioLoading } = usePortfolio();
  const { orders, isLoading: ordersLoading } = useOrders({ limit: 5 });

  const totalPnL = portfolio?.unrealizedPnL || 0;
  const totalPnLPercent = portfolio?.totalValue ? (totalPnL / portfolio.totalValue) * 100 : 0;
  const isPositive = totalPnL >= 0;

  const recentOrders = orders?.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-background">
      <Header onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="lg:ml-64 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-muted-foreground">
              Here&apos;s an overview of your trading performance today.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(portfolio?.totalValue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total assets
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(Math.abs(totalPnL))}
                </div>
                <p className="text-xs text-muted-foreground flex items-center">
                  {isPositive ? (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                  )}
                  {formatPercent(totalPnLPercent)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {portfolio?.positions?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active trades
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(portfolio?.balance || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ready to trade
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>
                  Your latest trading activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : recentOrders.length > 0 ? (
                  <div className="space-y-4">
                    {recentOrders.map((order: any) => (
                      <div key={order.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            order.side === 'BUY' ? 'bg-success' : 'bg-destructive'
                          }`} />
                          <div>
                            <p className="font-medium">{order.symbol}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.side} {order.quantity} @ {formatCurrency(order.price || 0)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${
                            order.status === 'FILLED' ? 'text-success' : 
                            order.status === 'CANCELLED' ? 'text-destructive' : 
                            'text-warning'
                          }`}>
                            {order.status}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recent orders</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common trading tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <a
                    href="/trading"
                    className="flex flex-col items-center p-4 border rounded-lg hover:bg-muted transition-colors"
                  >
                    <Activity className="h-8 w-8 mb-2 text-primary" />
                    <span className="text-sm font-medium">New Order</span>
                  </a>
                  <a
                    href="/portfolio"
                    className="flex flex-col items-center p-4 border rounded-lg hover:bg-muted transition-colors"
                  >
                    <PieChart className="h-8 w-8 mb-2 text-primary" />
                    <span className="text-sm font-medium">Portfolio</span>
                  </a>
                  <a
                    href="/trading"
                    className="flex flex-col items-center p-4 border rounded-lg hover:bg-muted transition-colors"
                  >
                    <BarChart3 className="h-8 w-8 mb-2 text-primary" />
                    <span className="text-sm font-medium">Market Data</span>
                  </a>
                  <a
                    href="/strategies"
                    className="flex flex-col items-center p-4 border rounded-lg hover:bg-muted transition-colors"
                  >
                    <TrendingUp className="h-8 w-8 mb-2 text-primary" />
                    <span className="text-sm font-medium">Strategies</span>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer className="lg:ml-64" />
    </div>
  );
}
