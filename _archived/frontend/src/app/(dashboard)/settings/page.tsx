'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import {
  KeyIcon,
  GlobeAltIcon,
  TagIcon,
  BellIcon,
  CreditCardIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  EyeIcon,
  EyeSlashIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { useMockMode } from '@/lib/hooks/use-mock-mode';
import { cn } from '@/lib/utils/cn';
import type { AuctionSource, CategoryId } from '@/lib/types';

const SOURCES: { id: AuctionSource; name: string; description: string }[] = [
  { id: 'sierra_auction', name: 'Sierra Auction', description: 'Arizona-based auction house' },
  { id: 'ironplanet', name: 'IronPlanet', description: 'Heavy equipment and commercial trucks' },
];

const CATEGORIES: { id: CategoryId; name: string }[] = [
  { id: 'buy_box', name: 'Buy Box' },
  { id: 'welders', name: 'Welders' },
  { id: 'air_compressors', name: 'Air Compressors' },
  { id: 'generators', name: 'Generators' },
  { id: 'power_tools', name: 'Power Tools' },
  { id: 'tool_storage', name: 'Tool Storage' },
  { id: 'TRAILER_UTILITY', name: 'Utility Trailers' },
  { id: 'GENERATOR_PORTABLE', name: 'Portable Generators' },
  { id: 'WELDER_PRO', name: 'Professional Welders' },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const { useMockData, setUseMockData } = useMockMode();

  // Theme state
  const [theme, setTheme] = React.useState<'light' | 'dark' | 'system'>('system');

  // API token state
  const [showToken, setShowToken] = React.useState(false);
  const [token, setToken] = React.useState('••••••••••••••••••••••••••••••••');

  // Sources state
  const [enabledSources, setEnabledSources] = React.useState<Set<AuctionSource>>(
    new Set(['sierra_auction', 'fb_marketplace'])
  );

  // Categories state
  const [enabledCategories, setEnabledCategories] = React.useState<Set<CategoryId>>(
    new Set(CATEGORIES.map((c) => c.id))
  );

  // Notifications state
  const [notifications, setNotifications] = React.useState({
    emailOnNewDeals: true,
    emailOnAnalysisComplete: false,
  });

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else if (newTheme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('light', 'dark');
    }
    addToast({ type: 'success', title: 'Theme updated', description: `Switched to ${newTheme} mode` });
  };

  const handleToggleSource = (sourceId: AuctionSource) => {
    setEnabledSources((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) {
        next.delete(sourceId);
      } else {
        next.add(sourceId);
      }
      return next;
    });
  };

  const handleToggleCategory = (categoryId: CategoryId) => {
    setEnabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText('your-ops-token-here');
    addToast({ type: 'success', title: 'Copied', description: 'API token copied to clipboard' });
  };

  const handleRotateToken = () => {
    addToast({ type: 'info', title: 'Token rotation', description: 'Token rotation coming soon' });
  };

  const handleSaveSettings = () => {
    addToast({ type: 'success', title: 'Settings saved', description: 'Your preferences have been updated' });
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Manage your account and application preferences
        </p>
      </div>

      {/* Development Mode Toggle */}
      <Card className="border-dashed border-2" style={{ borderColor: 'var(--warning)' }}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ComputerDesktopIcon className="h-5 w-5" style={{ color: 'var(--warning)' }} />
            Development Mode
          </CardTitle>
          <CardDescription>
            Toggle between mock data and live API calls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{useMockData ? 'Using Mock Data' : 'Using Live API'}</p>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {useMockData
                  ? 'Application is using sample data for development'
                  : 'Application is connected to live Cloudflare Workers'}
              </p>
            </div>
            <Button
              variant={useMockData ? 'outline' : 'default'}
              onClick={() => {
                setUseMockData(!useMockData);
                addToast({
                  type: 'info',
                  title: useMockData ? 'Switched to Live API' : 'Switched to Mock Data',
                });
              }}
            >
              {useMockData ? 'Switch to Live' : 'Switch to Mock'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Token */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyIcon className="h-5 w-5" />
            API Token
          </CardTitle>
          <CardDescription>
            Your OPS_TOKEN for authenticating with the Scout and Analyst APIs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showToken ? 'text' : 'password'}
                value={token}
                readOnly
                className="font-mono pr-10"
              />
              <button
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--muted-foreground)' }}
              >
                {showToken ? (
                  <EyeSlashIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </button>
            </div>
            <Button variant="outline" onClick={handleCopyToken}>
              <ClipboardDocumentIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleRotateToken}>
            Rotate Token
          </Button>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <SunIcon className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize the look and feel of the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleThemeChange('light')}
            >
              <SunIcon className="h-4 w-4" />
              Light
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleThemeChange('dark')}
            >
              <MoonIcon className="h-4 w-4" />
              Dark
            </Button>
            <Button
              variant={theme === 'system' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleThemeChange('system')}
            >
              <ComputerDesktopIcon className="h-4 w-4" />
              System
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GlobeAltIcon className="h-5 w-5" />
            Auction Sources
          </CardTitle>
          <CardDescription>
            Enable or disable auction sources for Scout to monitor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {SOURCES.map((source) => (
              <div
                key={source.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                  enabledSources.has(source.id) ? '' : 'opacity-60'
                )}
                style={{ borderColor: 'var(--border)' }}
                onClick={() => handleToggleSource(source.id)}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={enabledSources.has(source.id)}
                    onChange={() => {}}
                    className="rounded border-gray-300"
                  />
                  <div>
                    <p className="font-medium">{source.name}</p>
                    <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      {source.description}
                    </p>
                  </div>
                </div>
                <Badge variant={source.id as keyof typeof Badge}>
                  {enabledSources.has(source.id) ? 'Active' : 'Disabled'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TagIcon className="h-5 w-5" />
            Categories
          </CardTitle>
          <CardDescription>
            Select which equipment categories to track
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <Badge
                key={category.id}
                variant={enabledCategories.has(category.id) ? (category.id as keyof typeof Badge) : 'outline'}
                className="cursor-pointer px-3 py-1.5"
                onClick={() => handleToggleCategory(category.id)}
              >
                {category.name}
                {enabledCategories.has(category.id) && (
                  <span className="ml-1">x</span>
                )}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BellIcon className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure email notifications for deal alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">New high-score deals</p>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Get notified when Scout finds deals with score 85+
              </p>
            </div>
            <input
              type="checkbox"
              checked={notifications.emailOnNewDeals}
              onChange={(e) =>
                setNotifications((prev) => ({ ...prev, emailOnNewDeals: e.target.checked }))
              }
              className="rounded border-gray-300 h-5 w-5"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Analysis complete</p>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Get notified when AI analysis is finished
              </p>
            </div>
            <input
              type="checkbox"
              checked={notifications.emailOnAnalysisComplete}
              onChange={(e) =>
                setNotifications((prev) => ({
                  ...prev,
                  emailOnAnalysisComplete: e.target.checked,
                }))
              }
              className="rounded border-gray-300 h-5 w-5"
            />
          </div>
        </CardContent>
      </Card>

      {/* Billing (Placeholder) */}
      <Card className="opacity-75">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5" />
              Billing
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Planned
            </Badge>
          </div>
          <CardDescription>
            Subscription management and payment methods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="flex items-center gap-4 p-4 rounded-lg border border-dashed"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}
          >
            <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
              <CreditCardIcon className="h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
            </div>
            <div>
              <p className="font-medium text-sm">In Development</p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                Stripe integration for subscription billing is planned for a future release.
                Currently, Durgan Field Guide is free during beta.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings}>
          Save Settings
        </Button>
      </div>
    </div>
  );
}
