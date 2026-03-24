'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'react-hot-toast';

interface SystemConfig {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  updated_at: string;
}

export default function AdminSystemPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await fetch('/api/admin/system/config');
      if (!response.ok) throw new Error('Failed to fetch configs');
      
      const data = await response.json();
      setConfigs(data.configs || []);
    } catch (error) {
      toast.error('Failed to load system configuration');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (key: string, value: string) => {
    setSaving(key);
    try {
      const response = await fetch('/api/admin/system/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      
      if (!response.ok) throw new Error('Failed to update config');
      
      toast.success(`Updated ${key}`);
      await fetchConfigs();
    } catch (error) {
      toast.error(`Failed to update ${key}`);
      console.error(error);
    } finally {
      setSaving(null);
    }
  };

  const triggerTraining = async () => {
    try {
      const response = await fetch('/api/admin/ai/train', {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to trigger training');
      
      const result = await response.json();
      toast.success('Training job started successfully');
      
      // Update last run time
      await updateConfig('auto_train_last_run', new Date().toISOString());
    } catch (error) {
      toast.error('Failed to start training');
      console.error(error);
    }
  };

  const aiConfigs = configs.filter(c => 
    c.key.includes('auto_train') || 
    c.key.includes('python_service') ||
    c.key.includes('newsapi') ||
    c.key.includes('alpha_vantage') ||
    c.key.includes('quantconnect')
  );

  const renderConfigInput = (config: SystemConfig) => {
    const isSaving = saving === config.key;
    
    if (config.type === 'boolean') {
      return (
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={config.value === 'true'}
            onChange={(e) => updateConfig(config.key, e.target.checked.toString())}
            disabled={isSaving}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-600">
            {config.value === 'true' ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      );
    }

    if (config.type === 'number') {
      return (
        <Input
          type="number"
          value={config.value}
          onChange={(e) => updateConfig(config.key, e.target.value)}
          disabled={isSaving}
          className="w-32"
        />
      );
    }

    // For API keys, show masked input
    if (config.key.includes('key') || config.key.includes('secret')) {
      return (
        <div className="flex items-center space-x-2">
          <Input
            type="password"
            value={config.value}
            onChange={(e) => updateConfig(config.key, e.target.value)}
            disabled={isSaving}
            placeholder="Enter API key"
            className="w-64"
          />
          <span className="text-xs text-gray-500">
            {config.value ? '••••••••' : 'Not set'}
          </span>
        </div>
      );
    }

    return (
      <Input
        type="text"
        value={config.value}
        onChange={(e) => updateConfig(config.key, e.target.value)}
        disabled={isSaving}
        className="w-64"
      />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading system configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">System Configuration</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage system settings and AI training configuration
            </p>
          </div>

          {/* AI Training Settings */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>AI Training Settings</CardTitle>
              <CardDescription>
                Configure automatic AI model retraining and service integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aiConfigs.map((config) => (
                  <div key={config.key} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {config.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {config.description}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {renderConfigInput(config)}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Manual Training</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Trigger AI model training manually for all markets
                    </p>
                  </div>
                  <Button onClick={triggerTraining} className="ml-4">
                    Start Training Job
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>
                Current system configuration and last training information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">AI Training Status</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Auto Training</dt>
                      <dd className="text-sm font-medium">
                        {configs.find(c => c.key === 'auto_train_enabled')?.value === 'true' ? 'Enabled' : 'Disabled'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Frequency</dt>
                      <dd className="text-sm font-medium">
                        {configs.find(c => c.key === 'auto_train_frequency_hours')?.value || 'N/A'} hours
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Last Run</dt>
                      <dd className="text-sm font-medium">
                        {configs.find(c => c.key === 'auto_train_last_run')?.value 
                          ? new Date(configs.find(c => c.key === 'auto_train_last_run')!.value).toLocaleString()
                          : 'Never'
                        }
                      </dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Service Integration</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Python Service</dt>
                      <dd className="text-sm font-medium">
                        {configs.find(c => c.key === 'python_service_url')?.value ? 'Configured' : 'Not set'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">NewsAPI</dt>
                      <dd className="text-sm font-medium">
                        {configs.find(c => c.key === 'newsapi_api_key')?.value ? 'Configured' : 'Not set'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Alpha Vantage</dt>
                      <dd className="text-sm font-medium">
                        {configs.find(c => c.key === 'alpha_vantage_api_key')?.value ? 'Configured' : 'Not set'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">QuantConnect API</dt>
                      <dd className="text-sm font-medium">
                        {configs.find(c => c.key === 'quantconnect_api_key')?.value ? 'Configured' : 'Not set'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
