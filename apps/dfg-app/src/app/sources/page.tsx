'use client';

import { useEffect, useState } from 'react';
import {
  Database,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn, formatRelativeTime } from '@/lib/utils';
import { listSources, triggerScoutRun } from '@/lib/api';
import type { Source } from '@/types';

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);

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

  const handleTriggerScout = async () => {
    setTriggering(true);
    setTriggerMessage(null);
    try {
      const result = await triggerScoutRun();
      setTriggerMessage(result.message);
      // Refresh sources to show updated last_run_at
      setTimeout(fetchSources, 2000);
    } catch (error) {
      console.error('Failed to trigger scout:', error);
      setTriggerMessage('Failed to trigger scout run');
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </main>
      </div>
    );
  }

  const enabledSources = sources.filter((s) => s.enabled);
  const disabledSources = sources.filter((s) => !s.enabled);

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full max-w-[100vw] overflow-x-hidden">
      <Navigation />

      <main className="flex-1 pb-4 min-w-0 w-full max-w-[100vw] overflow-x-hidden">
        {/* Header - hidden on mobile, Navigation provides it (#82) */}
        <header className="hidden md:block sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 h-14">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Sources
            </h1>
            <Button
              variant="primary"
              size="sm"
              onClick={handleTriggerScout}
              disabled={triggering}
            >
              {triggering ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Run Scout
            </Button>
          </div>
        </header>

        <div className="p-4 space-y-4">
          {/* Mobile: Run Scout button */}
          <div className="md:hidden">
            <Button
              variant="primary"
              className="w-full"
              onClick={handleTriggerScout}
              disabled={triggering}
            >
              {triggering ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Run Scout Now
            </Button>
          </div>

          {/* Trigger message */}
          {triggerMessage && (
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
              <CardContent>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {triggerMessage}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Active Sources */}
          <div>
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 px-1">
              Active Sources ({enabledSources.length})
            </h2>
            <div className="space-y-2">
              {enabledSources.map((source) => (
                <SourceCard key={source.id} source={source} />
              ))}
              {enabledSources.length === 0 && (
                <Card>
                  <CardContent className="text-center text-gray-500 py-8">
                    No active sources configured
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Disabled Sources */}
          {disabledSources.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 px-1">
                Disabled ({disabledSources.length})
              </h2>
              <div className="space-y-2">
                {disabledSources.map((source) => (
                  <SourceCard key={source.id} source={source} />
                ))}
              </div>
            </div>
          )}

          {/* Info Card */}
          <Card className="bg-gray-50 dark:bg-gray-900">
            <CardContent>
              <div className="flex items-start gap-3">
                <Database className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p className="font-medium text-gray-900 dark:text-white mb-1">
                    About Sources
                  </p>
                  <p>
                    Sources are auction platforms that DFG Scout monitors for opportunities.
                    Each source has configurable buyer premiums and pickup windows.
                  </p>
                  <p className="mt-2">
                    The scout runs automatically every few hours. Use &ldquo;Run Scout&rdquo; to trigger
                    an immediate scan.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function SourceCard({ source }: { source: Source }) {
  return (
    <Card hover>
      <CardContent className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {source.enabled ? (
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-gray-400 shrink-0" />
          )}
          <div className="min-w-0">
            <p className={cn(
              "font-medium truncate",
              source.enabled
                ? "text-gray-900 dark:text-white"
                : "text-gray-500 dark:text-gray-400"
            )}>
              {source.display_name}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{source.default_buyer_premium_pct}% premium</span>
              <span>•</span>
              <span>{source.default_pickup_days}d pickup</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {source.last_run_at && (
            <div className="text-right hidden sm:block">
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="h-3 w-3" />
                <span>{formatRelativeTime(source.last_run_at)}</span>
              </div>
            </div>
          )}
          <a
            href={source.base_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title={`Visit ${source.display_name}`}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
