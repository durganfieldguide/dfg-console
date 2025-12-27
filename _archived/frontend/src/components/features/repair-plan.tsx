'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';
import {
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  InformationCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

type RepairPriority = 'critical' | 'important' | 'cosmetic' | 'optional';
type RepairDifficulty = 'diy' | 'shop' | 'specialist';

interface RepairItem {
  name: string;
  estimatedCost: number;
  priority: RepairPriority;
  difficulty?: RepairDifficulty;
  description?: string;
  timeEstimate?: string; // e.g., "2-4 hours"
}

interface RepairPlanProps {
  items: RepairItem[];
  totalEstimate?: number;
  className?: string;
}

const priorityConfig: Record<RepairPriority, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  critical: {
    label: 'Critical',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    icon: <ExclamationTriangleIcon className="h-4 w-4" />,
  },
  important: {
    label: 'Important',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    icon: <ClockIcon className="h-4 w-4" />,
  },
  cosmetic: {
    label: 'Cosmetic',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    icon: <SparklesIcon className="h-4 w-4" />,
  },
  optional: {
    label: 'Optional',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'rgba(107, 114, 128, 0.1)',
    icon: <CheckCircleIcon className="h-4 w-4" />,
  },
};

const difficultyConfig: Record<RepairDifficulty, { label: string; description: string }> = {
  diy: { label: 'DIY', description: 'Can be done at home with basic tools' },
  shop: { label: 'Shop', description: 'Requires professional equipment' },
  specialist: { label: 'Specialist', description: 'Needs specialized expertise' },
};

// Parse raw repair plan text into structured items
export function parseRepairPlan(raw: string): RepairItem[] {
  if (!raw || raw.toLowerCase().includes('no repairs') || raw.trim() === '') {
    return [];
  }

  const items: RepairItem[] = [];
  const lines = raw.split(/[,;\n]/).map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    // Try to extract cost: "brakes $200" or "brakes ($200)"
    const costMatch = line.match(/\$?([\d,]+)/);
    const cost = costMatch ? parseInt(costMatch[1].replace(/,/g, '')) : 0;

    // Remove cost from name
    const name = line.replace(/\$?[\d,]+/g, '').replace(/[()]/g, '').trim();

    if (name.length === 0) continue;

    // Determine priority based on keywords
    let priority: RepairPriority = 'important';
    const lowerName = name.toLowerCase();

    if (lowerName.includes('safety') || lowerName.includes('brake') || lowerName.includes('tire') ||
        lowerName.includes('steering') || lowerName.includes('suspension') || lowerName.includes('critical')) {
      priority = 'critical';
    } else if (lowerName.includes('paint') || lowerName.includes('dent') || lowerName.includes('scratch') ||
               lowerName.includes('polish') || lowerName.includes('detail') || lowerName.includes('cosmetic')) {
      priority = 'cosmetic';
    } else if (lowerName.includes('optional') || lowerName.includes('upgrade') || lowerName.includes('nice to have')) {
      priority = 'optional';
    }

    // Determine difficulty based on keywords
    let difficulty: RepairDifficulty = 'shop';
    if (lowerName.includes('diy') || lowerName.includes('fluid') || lowerName.includes('filter') ||
        lowerName.includes('wiper') || lowerName.includes('bulb') || lowerName.includes('battery')) {
      difficulty = 'diy';
    } else if (lowerName.includes('engine') || lowerName.includes('transmission') || lowerName.includes('electrical') ||
               lowerName.includes('hybrid') || lowerName.includes('computer') || lowerName.includes('specialist')) {
      difficulty = 'specialist';
    }

    items.push({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      estimatedCost: cost,
      priority,
      difficulty,
    });
  }

  // Sort by priority: critical first, then important, cosmetic, optional
  const priorityOrder: RepairPriority[] = ['critical', 'important', 'cosmetic', 'optional'];
  items.sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority));

  return items;
}

export function RepairPlan({ items, totalEstimate, className }: RepairPlanProps) {
  // Calculate total if not provided
  const calculatedTotal = items.reduce((sum, item) => sum + item.estimatedCost, 0);
  const total = totalEstimate ?? calculatedTotal;

  // Group items by priority
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.priority]) acc[item.priority] = [];
    acc[item.priority].push(item);
    return acc;
  }, {} as Record<RepairPriority, RepairItem[]>);

  const priorityOrder: RepairPriority[] = ['critical', 'important', 'cosmetic', 'optional'];

  if (items.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <div
          className="flex items-center gap-3 p-4 rounded-lg border-l-4 border-green-500"
          style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
        >
          <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
          <div>
            <p className="font-medium text-green-700 dark:text-green-300">No Repairs Needed</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              The vehicle appears to be in good condition with no identified repair needs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Total Header */}
      <div
        className="p-4 rounded-lg border-2"
        style={{
          borderColor: total > 500 ? 'rgba(245, 158, 11, 0.5)' : 'var(--border)',
          background: total > 500
            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(245, 158, 11, 0.1) 100%)'
            : 'var(--background)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
              Estimated Repair Cost
            </p>
            <p className="text-3xl font-bold font-mono">
              {formatCurrency(total)}
            </p>
          </div>
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}
          >
            <WrenchScrewdriverIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
          <span>{items.length} repair{items.length !== 1 ? 's' : ''} identified</span>
          {groupedItems.critical?.length > 0 && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <ExclamationTriangleIcon className="h-3 w-3" />
              {groupedItems.critical.length} critical
            </span>
          )}
        </div>
      </div>

      {/* Grouped Repair Items */}
      {priorityOrder.map((priority) => {
        const priorityItems = groupedItems[priority];
        if (!priorityItems?.length) return null;

        const config = priorityConfig[priority];

        return (
          <div key={priority} className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className={config.color}>{config.icon}</span>
              <span>{config.label}</span>
              <span style={{ color: 'var(--muted-foreground)' }}>
                ({priorityItems.length})
              </span>
            </div>
            <div className="space-y-2 ml-6">
              {priorityItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                  style={{ borderColor: 'var(--border)', backgroundColor: config.bgColor }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.name}</span>
                      {item.difficulty && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: 'var(--background)', color: 'var(--muted-foreground)' }}
                          title={difficultyConfig[item.difficulty].description}
                        >
                          {difficultyConfig[item.difficulty].label}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                        {item.description}
                      </p>
                    )}
                  </div>
                  <span className="font-mono font-medium text-sm">
                    {item.estimatedCost > 0 ? formatCurrency(item.estimatedCost) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Guide */}
      <div
        className="flex items-start gap-3 p-3 rounded-lg"
        style={{ backgroundColor: 'var(--muted)' }}
      >
        <InformationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--muted-foreground)' }} />
        <div>
          <p className="text-sm font-medium">Repair Priority Guide</p>
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            <span><span className="text-red-600 dark:text-red-400 font-medium">Critical:</span> Safety/legal issues</span>
            <span><span className="text-yellow-600 dark:text-yellow-400 font-medium">Important:</span> Affects reliability</span>
            <span><span className="text-blue-600 dark:text-blue-400 font-medium">Cosmetic:</span> Appearance only</span>
            <span><span className="text-gray-600 dark:text-gray-400 font-medium">Optional:</span> Nice to have</span>
          </div>
        </div>
      </div>
    </div>
  );
}
