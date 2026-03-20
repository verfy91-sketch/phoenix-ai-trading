'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Eye, EyeOff, Key, Shield, Copy, ExternalLink } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';
import { useApiKeys } from '@/hooks/useApiKeys';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

// Import UI components
import { Header, Sidebar, Footer } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

const apiKeySchema = z.object({
  brokerName: z.string().min(1, "Broker name is required"),
  apiKey: z.string().min(1, "API key is required"),
  apiSecret: z.string().min(1, "API secret is required"),
  environment: z.enum(["sandbox", "production"]),
});

type ApiKeyFormData = z.infer<typeof apiKeySchema>;

interface ApiKeyItem {
  id: string;
  brokerName: string;
  environment: 'sandbox' | 'production';
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
  maskedKey: string;
  maskedSecret: string;
}

export default function ApiKeysPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  
  const { user } = useAuth();
  const { apiKeys, isLoading, createApiKey, deleteApiKey, isCreating } = useApiKeys();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      environment: 'sandbox',
    },
  });

  const onSubmit = async (data: ApiKeyFormData) => {
    try {
      await createApiKey(data);
      toast.success('API key added successfully');
      reset();
      setIsCreateModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add API key');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      try {
        await deleteApiKey(id);
        toast.success('API key deleted successfully');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete API key');
      }
    }
  };

  const toggleSecretVisibility = (id: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getEnvironmentColor = (environment: string) => {
    return environment === 'production' 
      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  };

  const getBrokerIcon = (brokerName: string) => {
    return <Key className="h-4 w-4" />;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="lg:ml-64 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">API Keys</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your broker API connections for automated trading
            </p>
          </div>

          <Card className="mb-6 border-yellow-200 dark:border-yellow-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <Shield className="h-5 w-5" />
                Security Notice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>• API keys are encrypted and stored securely</p>
                <p>• Never share your API keys with anyone</p>
                <p>• Use sandbox environment for testing</p>
                <p>• Regularly rotate your API keys for security</p>
                <p>• Disable API keys when not in use</p>
              </div>
            </CardContent>
          </Card>

          <div className="mb-6">
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New API Key
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your API Keys</CardTitle>
              <CardDescription>
                Connected broker accounts for trading
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : apiKeys && apiKeys.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Broker</TableHead>
                        <TableHead>Environment</TableHead>
                        <TableHead>API Key</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Last Used</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.map((apiKey: any) => (
                        <TableRow key={apiKey.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getBrokerIcon(apiKey.brokerName)}
                              <span className="font-medium">{apiKey.brokerName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEnvironmentColor(apiKey.environment)}`}>
                              {apiKey.environment}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                {showSecrets[apiKey.id] ? apiKey.maskedKey || '••••••••••••' : '••••••••••••'}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleSecretVisibility(apiKey.id)}
                                className="h-6 w-6 p-0"
                              >
                                {showSecrets[apiKey.id] ? (
                                  <EyeOff className="h-3 w-3" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(apiKey.maskedKey || apiKey.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              apiKey.isActive 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {apiKey.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(apiKey.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {apiKey.lastUsed ? formatDate(apiKey.lastUsed) : 'Never'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(apiKey.maskedKey || apiKey.id)}
                                className="h-8 w-8 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(apiKey.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No API keys configured</p>
                  <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First API Key
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New API Key"
      >
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Connect a new broker account for automated trading
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Broker Name</label>
              <select
                {...register('brokerName')}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select broker</option>
                <option value="deriv">Deriv</option>
                <option value="binance">Binance</option>
                <option value="alpaca">Alpaca</option>
                <option value="oanda">OANDA</option>
                <option value="interactive-brokers">Interactive Brokers</option>
              </select>
              {errors.brokerName && (
                <p className="text-red-500 text-sm mt-1">{errors.brokerName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Environment</label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="sandbox"
                    {...register('environment')}
                    className="mr-2"
                  />
                  <span className="text-sm">Sandbox</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="production"
                    {...register('environment')}
                    className="mr-2"
                  />
                  <span className="text-sm">Production</span>
                </label>
              </div>
              {errors.environment && (
                <p className="text-red-500 text-sm mt-1">{errors.environment.message}</p>
              )}
            </div>

            <div>
              <Input
                label="API Key"
                type="password"
                placeholder="Enter your API key"
                {...register('apiKey')}
                error={errors.apiKey?.message}
              />
            </div>

            <div>
              <Input
                label="API Secret"
                type="password"
                placeholder="Enter your API secret"
                {...register('apiSecret')}
                error={errors.apiSecret?.message}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding...
                </>
              ) : (
                'Add API Key'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      <Footer className="lg:ml-64" />
    </div>
  );
}
