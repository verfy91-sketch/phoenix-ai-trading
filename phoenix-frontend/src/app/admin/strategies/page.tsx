'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'react-hot-toast';

interface Strategy {
  id: string;
  source: 'tradingview' | 'quantconnect';
  source_url: string;
  title: string;
  author: string | null;
  raw_content: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  created_at: string;
  updated_at: string;
}

interface EvolvedStrategy {
  id: string;
  parent_strategy_id?: string;
  name: string;
  description: string;
  code: string;
  parameters: Record<string, any>;
  performance_metrics: Record<string, any>;
  generation: number;
  fitness_score: number;
  status: 'created' | 'testing' | 'active' | 'inactive' | 'failed';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function StrategiesManagementPage() {
  const [pendingStrategies, setPendingStrategies] = useState<Strategy[]>([]);
  const [evolvedStrategies, setEvolvedStrategies] = useState<EvolvedStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'evolved'>('pending');

  useEffect(() => {
    fetchStrategies();
  }, [activeTab]);

  const fetchStrategies = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'pending') {
        const response = await fetch('/api/strategies/pending');
        if (!response.ok) throw new Error('Failed to fetch pending strategies');
        
        const data = await response.json();
        setPendingStrategies(data.data || []);
      } else {
        const response = await fetch('/api/strategies/evolved');
        if (!response.ok) throw new Error('Failed to fetch evolved strategies');
        
        const data = await response.json();
        setEvolvedStrategies(data.data || []);
      }
    } catch (error) {
      toast.error('Failed to load strategies');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const approveStrategy = async (strategyId: string) => {
    try {
      setActionLoading(strategyId);
      
      const response = await fetch(`/api/strategies/${strategyId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Approved via admin panel' })
      });
      
      if (!response.ok) throw new Error('Failed to approve strategy');
      
      toast.success('Strategy approved successfully');
      fetchStrategies(); // Refresh list
    } catch (error) {
      toast.error('Failed to approve strategy');
      console.error(error);
    } finally {
      setActionLoading(null);
    }
  };

  const rejectStrategy = async (strategyId: string) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;
    
    try {
      setActionLoading(strategyId);
      
      const response = await fetch(`/api/strategies/${strategyId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      
      if (!response.ok) throw new Error('Failed to reject strategy');
      
      toast.success('Strategy rejected successfully');
      fetchStrategies(); // Refresh list
    } catch (error) {
      toast.error('Failed to reject strategy');
      console.error(error);
    } finally {
      setActionLoading(null);
    }
  };

  const activateStrategy = async (strategyId: string, market: string) => {
    try {
      setActionLoading(strategyId);
      
      const response = await fetch(`/api/strategies/${strategyId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market })
      });
      
      if (!response.ok) throw new Error('Failed to activate strategy');
      
      toast.success(`Strategy activated for ${market}`);
      fetchStrategies(); // Refresh list
    } catch (error) {
      toast.error('Failed to activate strategy');
      console.error(error);
    } finally {
      setActionLoading(null);
    }
  };

  const deactivateStrategy = async (strategyId: string) => {
    try {
      setActionLoading(strategyId);
      
      const response = await fetch(`/api/strategies/${strategyId}/deactivate`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to deactivate strategy');
      
      toast.success('Strategy deactivated successfully');
      fetchStrategies(); // Refresh list
    } catch (error) {
      toast.error('Failed to deactivate strategy');
      console.error(error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'approved': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      case 'processing': return 'text-blue-600';
      case 'active': return 'text-green-600';
      case 'inactive': return 'text-gray-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'tradingview': return '📊';
      case 'quantconnect': return '🤖';
      default: return '📄';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading strategies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Strategy Management</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Review and manage absorbed and evolved trading strategies
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pending'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pending Strategies ({pendingStrategies.length})
              </button>
              <button
                onClick={() => setActiveTab('evolved')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'evolved'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Evolved Strategies ({evolvedStrategies.length})
              </button>
            </nav>
          </div>

          {/* Pending Strategies Tab */}
          {activeTab === 'pending' && (
            <div className="space-y-6">
              {pendingStrategies.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-gray-500 dark:text-gray-400">
                      No pending strategies found. New strategies will appear here after absorption.
                    </div>
                  </CardContent>
                </Card>
              ) : (
                pendingStrategies.map((strategy) => (
                  <Card key={strategy.id} className="mb-4">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            <span>{getSourceIcon(strategy.source)}</span>
                            {strategy.title}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            Source: {strategy.source} • Author: {strategy.author || 'Unknown'}
                          </CardDescription>
                        </div>
                        <div className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(strategy.status)}`}>
                          {strategy.status.toUpperCase()}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          <h4 className="font-medium mb-2">Strategy Content</h4>
                          <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap">
                            {strategy.raw_content.substring(0, 500)}
                            {strategy.raw_content.length > 500 && '...'}
                          </pre>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span>Created: {formatDate(strategy.created_at)}</span>
                          <span>Updated: {formatDate(strategy.updated_at)}</span>
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button
                            onClick={() => approveStrategy(strategy.id)}
                            disabled={actionLoading === strategy.id}
                            className="flex-1"
                          >
                            {actionLoading === strategy.id ? 'Approving...' : 'Approve'}
                          </Button>
                          <Button
                            onClick={() => rejectStrategy(strategy.id)}
                            disabled={actionLoading === strategy.id}
                            variant="destructive"
                            className="flex-1"
                          >
                            {actionLoading === strategy.id ? 'Rejecting...' : 'Reject'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Evolved Strategies Tab */}
          {activeTab === 'evolved' && (
            <div className="space-y-6">
              {evolvedStrategies.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-gray-500 dark:text-gray-400">
                      No evolved strategies found. Strategies will appear here after genetic evolution.
                    </div>
                  </CardContent>
                </Card>
              ) : (
                evolvedStrategies.map((strategy) => (
                  <Card key={strategy.id} className="mb-4">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            🧬 {strategy.name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            Generation: {strategy.generation} • Fitness: {strategy.fitness_score?.toFixed(2)}
                          </CardDescription>
                        </div>
                        <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                          strategy.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {strategy.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          <h4 className="font-medium mb-2">Strategy Parameters</h4>
                          <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                            {JSON.stringify(strategy.parameters, null, 2)}
                          </pre>
                        </div>
                        
                        {strategy.description && (
                          <div>
                            <h4 className="font-medium mb-2">Description</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {strategy.description}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span>Created: {formatDate(strategy.created_at)}</span>
                          <span>Updated: {formatDate(strategy.updated_at)}</span>
                        </div>

                        <div className="flex gap-2 pt-4">
                          {!strategy.is_active && (
                            <Button
                              onClick={() => activateStrategy(strategy.id, strategy.parameters.market || 'default')}
                              disabled={actionLoading === strategy.id}
                              className="flex-1"
                            >
                              {actionLoading === strategy.id ? 'Activating...' : 'Activate'}
                            </Button>
                          )}
                          {strategy.is_active && (
                            <Button
                              onClick={() => deactivateStrategy(strategy.id)}
                              disabled={actionLoading === strategy.id}
                              variant="destructive"
                              className="flex-1"
                            >
                              {actionLoading === strategy.id ? 'Deactivating...' : 'Deactivate'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
