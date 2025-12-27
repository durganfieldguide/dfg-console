'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Inbox,
  Eye,
  Search,
  Clock,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn, formatRelativeTime, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils';
import { getStats, syncFromScout, triggerScoutRun } from '@/lib/api';
import type { DashboardStats, OpportunityStatus } from '@/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<{ created: number; updated: number } | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncFromScout();
      setLastSync(result);
      await fetchStats(); // Refresh stats after sync
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleRunScout = async () => {
    try {
      const result = await triggerScoutRun();
      alert(result.message);
    } catch (error) {
      console.error('Scout run failed:', error);
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

  const activeStatuses: OpportunityStatus[] = ['inbox', 'qualifying', 'watch', 'inspect', 'bid'];
  const totalActive = activeStatuses.reduce(
    (sum, status) => sum + (stats?.by_status[status] || 0),
    0
  );

  return (
    <div className="flex min-h-screen">
      <Navigation />

      <main className="flex-1 pb-20 md:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 h-14">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSync}
                loading={syncing}
              >
                <RefreshCw className={cn('h-4 w-4 mr-1', syncing && 'animate-spin')} />
                Sync
              </Button>
              <Button variant="ghost" size="sm" onClick={fetchStats} disabled={loading}>
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </header>

        {/* Last sync notification */}
        {lastSync && (
          <div className="mx-4 mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-700 dark:text-green-300">
            Synced: {lastSync.created} new, {lastSync.updated} updated
          </div>
        )}

        <div className="p-4 space-y-4">
          {/* Alerts Card */}
          {stats && stats.needs_attention > 0 && (
            <Link href="/opportunities?needs_attention=true">
              <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="font-medium text-red-900 dark:text-red-100">
                        {stats.needs_attention} items need attention
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-300">
                        {stats.watch_alerts_fired} watch alerts, {stats.stale_qualifying.over_24h} stale
                      </p>
                    </div>
                  </div>
                  <span className="text-red-600 dark:text-red-400">&rarr;</span>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/opportunities?status=inbox">
              <Card hover>
                <CardContent className="text-center">
                  <div className="flex justify-center mb-2">
                    <Inbox className="h-6 w-6 text-gray-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.by_status.inbox || 0}
                  </p>
                  <p className="text-sm text-gray-500">Inbox</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/opportunities?status=qualifying">
              <Card hover>
                <CardContent className="text-center">
                  <div className="flex justify-center mb-2">
                    <Search className="h-6 w-6 text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.by_status.qualifying || 0}
                  </p>
                  <p className="text-sm text-gray-500">Qualifying</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/opportunities?status=watch">
              <Card hover>
                <CardContent className="text-center">
                  <div className="flex justify-center mb-2">
                    <Eye className="h-6 w-6 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.by_status.watch || 0}
                  </p>
                  <p className="text-sm text-gray-500">Watching</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/opportunities?status=bid">
              <Card hover>
                <CardContent className="text-center">
                  <div className="flex justify-center mb-2">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.by_status.bid || 0}
                  </p>
                  <p className="text-sm text-gray-500">Bidding</p>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Ending Soon */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <h2 className="font-medium text-gray-900 dark:text-white">Ending Soon</h2>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-around text-center">
                <Link href="/opportunities?ending_within=24h" className="flex-1">
                  <p className="text-2xl font-bold text-orange-600">
                    {stats?.ending_soon.within_24h || 0}
                  </p>
                  <p className="text-xs text-gray-500">Next 24h</p>
                </Link>
                <div className="w-px bg-gray-200 dark:bg-gray-700" />
                <Link href="/opportunities?ending_within=48h" className="flex-1">
                  <p className="text-2xl font-bold text-amber-500">
                    {stats?.ending_soon.within_48h || 0}
                  </p>
                  <p className="text-xs text-gray-500">Next 48h</p>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Summary */}
          <Card>
            <CardHeader>
              <h2 className="font-medium text-gray-900 dark:text-white">Pipeline Overview</h2>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(stats?.by_status || {}).map(([status, count]) => (
                <Link
                  key={status}
                  href={`/opportunities?status=${status}`}
                  className="flex items-center justify-between py-1 hover:bg-gray-50 dark:hover:bg-gray-700 -mx-4 px-4 rounded"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        STATUS_COLORS[status as OpportunityStatus]
                      )}
                    >
                      {STATUS_LABELS[status as OpportunityStatus]}
                    </span>
                  </div>
                  <span className="text-gray-600 dark:text-gray-300">{count}</span>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Results Summary */}
          <Card>
            <CardHeader>
              <h2 className="font-medium text-gray-900 dark:text-white">Results</h2>
            </CardHeader>
            <CardContent>
              <div className="flex justify-around text-center">
                <div className="flex-1">
                  <div className="flex justify-center mb-1">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <p className="text-xl font-bold text-green-600">
                    {stats?.by_status.won || 0}
                  </p>
                  <p className="text-xs text-gray-500">Won</p>
                </div>
                <div className="w-px bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="flex justify-center mb-1">
                    <XCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <p className="text-xl font-bold text-red-600">
                    {stats?.by_status.lost || 0}
                  </p>
                  <p className="text-xs text-gray-500">Lost</p>
                </div>
                <div className="w-px bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="flex justify-center mb-1">
                    <XCircle className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-xl font-bold text-gray-600">
                    {stats?.by_status.rejected || 0}
                  </p>
                  <p className="text-xs text-gray-500">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* New Today */}
          {stats?.new_today !== undefined && stats.new_today > 0 && (
            <Card>
              <CardContent className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">New opportunities today</span>
                <span className="font-bold text-blue-600">{stats.new_today}</span>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
