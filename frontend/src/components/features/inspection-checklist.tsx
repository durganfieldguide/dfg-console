'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  EyeIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

type InspectionPriority = 'critical' | 'high' | 'medium' | 'low';

interface InspectionItem {
  area: string;
  what: string;
  why?: string;
  priority: InspectionPriority;
}

interface InspectionChecklistProps {
  items: InspectionItem[];
  className?: string;
}

const priorityConfig: Record<InspectionPriority, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
  critical: {
    label: 'Critical',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgb(239, 68, 68)',
    icon: <ExclamationTriangleIcon className="h-5 w-5" />,
  },
  high: {
    label: 'High Priority',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'rgba(249, 115, 22, 0.1)',
    borderColor: 'rgb(249, 115, 22)',
    icon: <ExclamationCircleIcon className="h-5 w-5" />,
  },
  medium: {
    label: 'Check',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgb(245, 158, 11)',
    icon: <EyeIcon className="h-5 w-5" />,
  },
  low: {
    label: 'Consider',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgb(59, 130, 246)',
    icon: <ClipboardDocumentCheckIcon className="h-5 w-5" />,
  },
};

// Parse raw inspection priorities text into structured items
export function parseInspectionPriorities(raw: string | string[] | any): InspectionItem[] {
  if (!raw) return [];

  // Handle different input types
  let lines: string[] = [];

  if (Array.isArray(raw)) {
    lines = raw.map(item => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item !== null) {
        return item.priority || item.item || item.text || item.description || String(item);
      }
      return String(item);
    }).filter(l => l && l.length > 0);
  } else if (typeof raw === 'string') {
    if (raw.trim() === '') return [];
    lines = raw.split(/[;\n]/).map(l => l.trim()).filter(l => l.length > 0);
  } else {
    return [];
  }

  const items: InspectionItem[] = [];

  for (const line of lines) {
    // Ensure line is a string
    const lineStr = typeof line === 'string' ? line : String(line || '');
    // Try to extract numbered items like "1. Check brakes"
    const cleanLine = lineStr.replace(/^\d+\.\s*/, '').trim();
    if (cleanLine.length === 0) continue;

    // Determine priority based on keywords
    let priority: InspectionPriority = 'medium';
    const lower = cleanLine.toLowerCase();

    if (lower.includes('must') || lower.includes('critical') || lower.includes('safety') ||
        lower.includes('immediately') || lower.includes('before driving')) {
      priority = 'critical';
    } else if (lower.includes('verify') || lower.includes('confirm') || lower.includes('ensure') ||
               lower.includes('important')) {
      priority = 'high';
    } else if (lower.includes('consider') || lower.includes('optional') || lower.includes('might') ||
               lower.includes('could')) {
      priority = 'low';
    }

    // Determine area based on keywords - using operator-focused categories
    let area = 'Condition';

    // Identity category - verifying the item matches listing
    if (lower.includes('verify') && (lower.includes('trailer') || lower.includes('vehicle') || lower.includes('item') || lower.includes('exists')) ||
        lower.includes('identity') || lower.includes('mismatch') || lower.includes('confirm') && lower.includes('listing') ||
        lower.includes('match') && (lower.includes('photo') || lower.includes('image'))) {
      area = 'Identity';
    }
    // Paperwork category - title, registration, legal docs
    else if (lower.includes('title') || lower.includes('vin') || lower.includes('carfax') || lower.includes('history') ||
             lower.includes('registration') || lower.includes('lien') || lower.includes('bill of sale') ||
             lower.includes('documentation') || lower.includes('paperwork')) {
      area = 'Paperwork';
    }
    // Market/Liquidity - resale concerns
    else if (lower.includes('market') || lower.includes('demand') || lower.includes('resale') ||
             lower.includes('liquidity') || lower.includes('sell') || lower.includes('buyer')) {
      area = 'Market';
    }
    // Logistics - transport, location, pickup
    else if (lower.includes('transport') || lower.includes('pickup') || lower.includes('location') ||
             lower.includes('delivery') || lower.includes('tow') || lower.includes('haul')) {
      area = 'Logistics';
    }
    // Condition category - everything else about physical state
    else if (lower.includes('engine') || lower.includes('motor') || lower.includes('oil') || lower.includes('coolant') ||
             lower.includes('brake') || lower.includes('rotor') || lower.includes('pad') ||
             lower.includes('tire') || lower.includes('wheel') || lower.includes('alignment') ||
             lower.includes('body') || lower.includes('paint') || lower.includes('rust') || lower.includes('dent') ||
             lower.includes('interior') || lower.includes('seat') || lower.includes('dashboard') ||
             lower.includes('electrical') || lower.includes('light') || lower.includes('battery') ||
             lower.includes('transmission') || lower.includes('clutch') || lower.includes('gear') ||
             lower.includes('suspension') || lower.includes('strut') || lower.includes('shock') ||
             lower.includes('a/c') || lower.includes('ac') || lower.includes('heat') || lower.includes('climate') ||
             lower.includes('frame') || lower.includes('axle') || lower.includes('hitch') ||
             lower.includes('floor') || lower.includes('ramp') || lower.includes('gate')) {
      area = 'Condition';
    }

    items.push({
      area,
      what: cleanLine.charAt(0).toUpperCase() + cleanLine.slice(1),
      priority,
    });
  }

  // Sort by priority
  const priorityOrder: InspectionPriority[] = ['critical', 'high', 'medium', 'low'];
  items.sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority));

  return items;
}

export function InspectionChecklist({ items, className }: InspectionChecklistProps) {
  if (items.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <div
          className="flex items-center gap-3 p-4 rounded-lg border-l-4 border-green-500"
          style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
        >
          <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
          <div>
            <p className="font-medium text-green-700 dark:text-green-300">No Special Inspections Needed</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              Standard pre-purchase inspection should be sufficient for this vehicle.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Group by area
  const groupedByArea = items.reduce((acc, item) => {
    if (!acc[item.area]) acc[item.area] = [];
    acc[item.area].push(item);
    return acc;
  }, {} as Record<string, InspectionItem[]>);

  // Count by priority
  const criticalCount = items.filter(i => i.priority === 'critical').length;
  const highCount = items.filter(i => i.priority === 'high').length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div
        className="p-4 rounded-lg border-2"
        style={{
          borderColor: criticalCount > 0 ? 'rgba(239, 68, 68, 0.5)' : 'var(--border)',
          background: criticalCount > 0
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.1) 100%)'
            : 'var(--background)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
              Inspection Checklist
            </p>
            <p className="text-2xl font-bold">
              {items.length} Items to Check
            </p>
          </div>
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: criticalCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)' }}
          >
            <ClipboardDocumentCheckIcon className={cn(
              'h-6 w-6',
              criticalCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
            )} />
          </div>
        </div>
        {(criticalCount > 0 || highCount > 0) && (
          <div className="flex items-center gap-4 mt-3 text-xs">
            {criticalCount > 0 && (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                <ExclamationTriangleIcon className="h-3 w-3" />
                {criticalCount} critical
              </span>
            )}
            {highCount > 0 && (
              <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-medium">
                <ExclamationCircleIcon className="h-3 w-3" />
                {highCount} high priority
              </span>
            )}
          </div>
        )}
      </div>

      {/* Items by Area */}
      {Object.entries(groupedByArea).map(([area, areaItems]) => (
        <div key={area} className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            {area}
            <span
              className="text-xs font-normal px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
            >
              {areaItems.length}
            </span>
          </h4>
          <div className="space-y-2">
            {areaItems.map((item, index) => {
              const config = priorityConfig[item.priority];
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg border-l-4"
                  style={{
                    borderColor: config.borderColor,
                    backgroundColor: config.bgColor,
                  }}
                >
                  <span className={cn('flex-shrink-0 mt-0.5', config.color)}>
                    {config.icon}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.what}</span>
                      <span
                        className={cn('text-xs px-1.5 py-0.5 rounded', config.color)}
                        style={{ backgroundColor: 'var(--background)' }}
                      >
                        {config.label}
                      </span>
                    </div>
                    {item.why && (
                      <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                        {item.why}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Guide */}
      <div
        className="flex items-start gap-3 p-3 rounded-lg"
        style={{ backgroundColor: 'var(--muted)' }}
      >
        <InformationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--muted-foreground)' }} />
        <div>
          <p className="text-sm font-medium">Inspection Tips</p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Address critical items before purchasing. High priority items should be inspected by
            a professional. Medium and low priority items are good to verify but may not be dealbreakers.
          </p>
        </div>
      </div>
    </div>
  );
}
