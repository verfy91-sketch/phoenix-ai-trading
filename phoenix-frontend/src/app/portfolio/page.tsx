'use client';

import React, { useState } from 'react';
import { Header, Sidebar, Footer } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { usePortfolio, useTradeHistory } from '@/hooks/usePortfolio';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Calendar
} from 'lucide-react';
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils/formatters';

export default function PortfolioPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [timeRange, setTimeRange] = useState('1M');
  
  const { portfolio, isLoading: portfolioLoading } = usePortfolio();
  const { trades, isLoading: tradesLoading } = useTradeHistory({ limit: 20 });

  const totalPnL = portfolio?.unrealizedPnL || 0;
  const totalPnLPercent = portfolio?.totalValue ? (totalPnL / portfolio.totalValue) * 100 : 0;
  const isPositive = totalPnL >= 0;

  const positions = portfolio?.positions || [];
  const recentTrades = trades?.slice(0, 10) || [];

  return (
    <div className="min-h-screen bg-background">
      <Header onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="lg:ml-64 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Portfolio</h1>
            <p className="text-muted-foreground">
              Track your positions, performance, and trading history
            </p>
          </div>

          {/* Portfolio Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(portfolio?.totalValue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Portfolio value
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
                <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {positions.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active trades
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Positions Table */}
            <Card>
              <CardHeader>
                <CardTitle>Positions</CardTitle>
                <CardDescription>
                  Your current open positions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {positions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Side</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>P&L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {positions.map((position: any) => {
                        const isPositive = position.unrealizedPnL >= 0;
                        return (
                          <TableRow key={position.id}>
                            <TableCell className="font-medium">
                              {position.symbol}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs ${
                                position.side === 'LONG' 
                                  ? 'bg-success/10 text-success' 
                                  : 'bg-destructive/10 text-destructive'
                              }`}>
                                {position.side}
                              </span>
                            </TableCell>
                            <TableCell>{position.quantity}</TableCell>
                            <TableCell className={isPositive ? 'text-success' : 'text-destructive'}>
                              {formatCurrency(Math.abs(position.unrealizedPnL))}
                              <div className="text-xs">
                                {formatPercent(position.unrealizedPnLPercent)}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No open positions</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Performance
                  <div className="flex gap-2">
                    {['1D', '1W', '1M', '3M', '1Y'].map((range) => (
                      <Button
                        key={range}
                        variant={timeRange === range ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTimeRange(range)}
                      >
                        {range}
                      </Button>
                    ))}
                  </div>
                </CardTitle>
                <CardDescription>
                  Portfolio performance over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                    <p>Performance chart</p>
                    <p className="text-sm">Recharts integration</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trade History */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Trade History
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardTitle>
              <CardDescription>
                Your recent trading activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentTrades.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>P&L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTrades.map((trade: any) => {
                      const isPositive = (trade.pnl || 0) >= 0;
                      return (
                        <TableRow key={trade.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {formatDate(trade.executedAt)}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {trade.symbol}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${
                              trade.side === 'BUY' 
                                ? 'bg-success/10 text-success' 
                                : 'bg-destructive/10 text-destructive'
                            }`}>
                              {trade.side}
                            </span>
                          </TableCell>
                          <TableCell>{trade.quantity}</TableCell>
                          <TableCell>{formatCurrency(trade.price)}</TableCell>
                          <TableCell className={isPositive ? 'text-success' : 'text-destructive'}>
                            {trade.pnl ? formatCurrency(Math.abs(trade.pnl)) : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No trade history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer className="lg:ml-64" />
    </div>
  );
}
