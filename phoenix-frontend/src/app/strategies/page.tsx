'use client';

import React, { useState } from 'react';
import { Header, Sidebar, Footer } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useStrategies } from '@/hooks/useStrategies';
import { 
  Play, 
  Square, 
  Plus, 
  Edit, 
  Trash2,
  TrendingUp,
  TrendingDown,
  Pause
} from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils/formatters';

export default function StrategiesPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<string | null>(null);
  
  const [strategyForm, setStrategyForm] = useState({
    name: '',
    description: '',
    symbols: '',
    parameters: '{}',
  });

  const { 
    strategies, 
    createStrategy, 
    updateStrategy, 
    deleteStrategy, 
    startStrategy, 
    stopStrategy,
    isCreating,
    isStarting,
    isStopping
  } = useStrategies();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const symbols = strategyForm.symbols.split(',').map(s => s.trim()).filter(Boolean);
      const parameters = JSON.parse(strategyForm.parameters);
      
      const strategyData = {
        name: strategyForm.name,
        description: strategyForm.description,
        symbols,
        parameters,
      };

      if (editingStrategy) {
        updateStrategy(editingStrategy, strategyData);
      } else {
        createStrategy(strategyData);
      }

      // Reset form
      setStrategyForm({
        name: '',
        description: '',
        symbols: '',
        parameters: '{}',
      });
      setIsCreateModalOpen(false);
      setEditingStrategy(null);
    } catch (error) {
      console.error('Invalid JSON in parameters:', error);
    }
  };

  const handleEdit = (strategy: any) => {
    setStrategyForm({
      name: strategy.name,
      description: strategy.description || '',
      symbols: strategy.symbols?.join(', ') || '',
      parameters: JSON.stringify(strategy.parameters || {}, null, 2),
    });
    setEditingStrategy(strategy.id);
    setIsCreateModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this strategy?')) {
      deleteStrategy(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-success/10 text-success';
      case 'INACTIVE':
        return 'bg-warning/10 text-warning';
      case 'STOPPED':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted/10 text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="lg:ml-64 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Trading Strategies</h1>
              <p className="text-muted-foreground">
                Manage and automate your trading strategies
              </p>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Strategy
            </Button>
          </div>

          {/* Strategy Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {strategies.map((strategy: any) => (
              <Card key={strategy.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{strategy.name}</CardTitle>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(strategy.status)}`}>
                      {strategy.status}
                    </span>
                  </div>
                  {strategy.description && (
                    <CardDescription>{strategy.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Performance Metrics */}
                    {strategy.performance && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Return</span>
                          <p className="font-medium text-success">
                            {formatPercent(strategy.performance.totalReturn)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Win Rate</span>
                          <p className="font-medium">
                            {formatPercent(strategy.performance.winRate)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Sharpe</span>
                          <p className="font-medium">
                            {strategy.performance.sharpeRatio.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Max DD</span>
                          <p className="font-medium text-destructive">
                            {formatPercent(strategy.performance.maxDrawdown)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Symbols */}
                    <div>
                      <span className="text-sm text-muted-foreground">Symbols:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {strategy.symbols?.slice(0, 3).map((symbol: any) => (
                          <span
                            key={symbol}
                            className="px-2 py-1 bg-muted rounded text-xs"
                          >
                            {symbol}
                          </span>
                        ))}
                        {(strategy.symbols?.length || 0) > 3 && (
                          <span className="px-2 py-1 bg-muted rounded text-xs">
                            +{(strategy.symbols?.length || 0) - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {strategy.status === 'ACTIVE' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => stopStrategy(strategy.id)}
                          disabled={isStopping}
                        >
                          <Pause className="h-4 w-4 mr-1" />
                          Stop
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startStrategy(strategy.id)}
                          disabled={isStarting}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(strategy)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(strategy.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Create New Strategy Card */}
            <Card className="border-dashed border-2 flex items-center justify-center min-h-[200px] cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setIsCreateModalOpen(true)}>
              <div className="text-center">
                <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Create New Strategy</p>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Create/Edit Strategy Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingStrategy(null);
          setStrategyForm({
            name: '',
            description: '',
            symbols: '',
            parameters: '{}',
          });
        }}
        title={editingStrategy ? 'Edit Strategy' : 'Create Strategy'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Strategy Name"
            placeholder="Enter strategy name"
            value={strategyForm.name}
            onChange={(e) => setStrategyForm(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          
          <Input
            label="Description"
            placeholder="Describe your strategy"
            value={strategyForm.description}
            onChange={(e) => setStrategyForm(prev => ({ ...prev, description: e.target.value }))}
          />
          
          <Input
            label="Symbols"
            placeholder="BTC/USD, ETH/USD, AAPL"
            value={strategyForm.symbols}
            onChange={(e) => setStrategyForm(prev => ({ ...prev, symbols: e.target.value }))}
            helperText="Comma-separated list of trading symbols"
            required
          />
          
          <div>
            <label className="text-sm font-medium">Parameters (JSON)</label>
            <textarea
              className="w-full mt-1 p-3 border rounded-md bg-background font-mono text-sm"
              rows={6}
              placeholder='{"risk_per_trade": 0.02, "max_positions": 5}'
              value={strategyForm.parameters}
              onChange={(e) => setStrategyForm(prev => ({ ...prev, parameters: e.target.value }))}
              required
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating}
              className="flex-1"
            >
              {isCreating ? 'Creating...' : (editingStrategy ? 'Update' : 'Create')}
            </Button>
          </div>
        </form>
      </Modal>

      <Footer className="lg:ml-64" />
    </div>
  );
}
