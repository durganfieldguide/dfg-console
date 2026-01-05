'use client';

import { cn } from '@/lib/utils';

// Color variants for filter chips
export type FilterChipColor = 'blue' | 'green' | 'orange' | 'amber' | 'red' | 'purple' | 'gray';

const colorStyles: Record<FilterChipColor, { active: string; dismiss: string; toggle: { active: string; inactive: string } }> = {
  blue: {
    active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    dismiss: 'text-blue-500',
    toggle: {
      active: 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400',
      inactive: 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
    },
  },
  green: {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    dismiss: 'text-green-500',
    toggle: {
      active: 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400',
      inactive: 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
    },
  },
  orange: {
    active: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    dismiss: 'text-orange-500',
    toggle: {
      active: 'bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-400',
      inactive: 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
    },
  },
  amber: {
    active: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    dismiss: 'text-amber-500',
    toggle: {
      active: 'bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400',
      inactive: 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
    },
  },
  red: {
    active: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    dismiss: 'text-red-500',
    toggle: {
      active: 'bg-red-100 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400',
      inactive: 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
    },
  },
  purple: {
    active: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    dismiss: 'text-purple-500',
    toggle: {
      active: 'bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-400',
      inactive: 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
    },
  },
  gray: {
    active: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    dismiss: 'text-gray-500',
    toggle: {
      active: 'bg-gray-200 border-gray-400 text-gray-700 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-300',
      inactive: 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
    },
  },
};

interface ActiveFilterChipProps {
  label: string;
  color?: FilterChipColor;
  onDismiss: () => void;
  className?: string;
}

/**
 * Dismissible chip showing an active filter with × button
 */
export function ActiveFilterChip({
  label,
  color = 'blue',
  onDismiss,
  className,
}: ActiveFilterChipProps) {
  const styles = colorStyles[color];

  return (
    <button
      onClick={onDismiss}
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full',
        styles.active,
        className
      )}
    >
      {label} <span className={styles.dismiss}>&times;</span>
    </button>
  );
}

interface ToggleFilterChipProps {
  label: string;
  color?: FilterChipColor;
  active: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * Toggle chip for enabling/disabling a filter
 */
export function ToggleFilterChip({
  label,
  color = 'blue',
  active,
  onToggle,
  className,
}: ToggleFilterChipProps) {
  const styles = colorStyles[color];

  return (
    <button
      onClick={onToggle}
      className={cn(
        'px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors',
        active ? styles.toggle.active : styles.toggle.inactive,
        className
      )}
    >
      {label}
    </button>
  );
}
