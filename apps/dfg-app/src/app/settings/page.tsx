'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Check } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { listSources, updateSource } from '@/lib/api';
import type { Source } from '@/types';

export default function SettingsPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const data = await listSources();
      setSources(data);
    } catch (error) {
      console.error('Failed to fetch sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSource = async (source: Source) => {
    setUpdating(source.id);
    try {
      const updated = await updateSource(source.id, { enabled: !source.enabled });
      setSources((prev) =>
        prev.map((s) => (s.id === source.id ? updated : s))
      );
    } catch (error) {
      console.error('Failed to update source:', error);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full max-w-[100vw] overflow-x-hidden">
      <Navigation />

      <main className="flex-1 pb-4 min-w-0 w-full max-w-[100vw] overflow-x-hidden">
        {/* Header - hidden on mobile, Navigation provides mobile header (#82) */}
        <header className="hidden md:block sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 h-14">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Settings
            </h1>
            <Button variant="ghost" size="sm" onClick={fetchSources} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </header>

        <div className="p-4 space-y-4">
          {/* Sources */}
          <Card>
            <CardHeader>
              <h2 className="font-medium text-gray-900 dark:text-white">Auction Sources</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {source.display_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {source.default_buyer_premium_pct}% premium, {source.default_pickup_days} days pickup
                    </p>
                    {source.last_run_at && (
                      <p className="text-xs text-gray-400">
                        Last run: {new Date(source.last_run_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Button
                    variant={source.enabled ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => toggleSource(source)}
                    disabled={updating === source.id}
                  >
                    {updating === source.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : source.enabled ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Enabled
                      </>
                    ) : (
                      'Disabled'
                    )}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* API Info */}
          <Card>
            <CardHeader>
              <h2 className="font-medium text-gray-900 dark:text-white">API Configuration</h2>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">API URL</span>
                <span className="font-mono text-xs">
                  {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Auth</span>
                <span className="text-green-600">
                  {process.env.NEXT_PUBLIC_API_TOKEN ? 'Configured' : 'Not configured'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* App Info */}
          <Card>
            <CardHeader>
              <h2 className="font-medium text-gray-900 dark:text-white">About</h2>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Version</span>
                <span>0.1.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Environment</span>
                <span>{process.env.NODE_ENV}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
