'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';

interface ActionStatCardProps {
  title: string;
  count: number;
  description: string;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  actionLabel?: string;
  onAction?: () => void;
  onClick?: () => void;
  className?: string;
}

const variantStyles = {
  default: {
    iconBg: 'bg-gray-100 dark:bg-gray-800',
    iconColor: 'text-gray-600 dark:text-gray-400',
    countColor: '',
    hoverBorder: 'hover:border-gray-400 dark:hover:border-gray-600',
  },
  success: {
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    countColor: 'text-green-600 dark:text-green-400',
    hoverBorder: 'hover:border-green-400 dark:hover:border-green-600',
  },
  warning: {
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    countColor: 'text-yellow-600 dark:text-yellow-400',
    hoverBorder: 'hover:border-yellow-400 dark:hover:border-yellow-600',
  },
  danger: {
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    countColor: 'text-red-600 dark:text-red-400',
    hoverBorder: 'hover:border-red-400 dark:hover:border-red-600',
  },
  info: {
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    countColor: 'text-blue-600 dark:text-blue-400',
    hoverBorder: 'hover:border-blue-400 dark:hover:border-blue-600',
  },
};

export function ActionStatCard({
  title,
  count,
  description,
  icon,
  variant = 'default',
  actionLabel,
  onAction,
  onClick,
  className,
}: ActionStatCardProps) {
  const styles = variantStyles[variant];
  const isClickable = onClick || onAction;

  const handleClick = () => {
    if (onAction) {
      onAction();
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-colors',
        isClickable && 'cursor-pointer',
        isClickable && styles.hoverBorder,
        className
      )}
      style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
      onClick={isClickable ? handleClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && handleClick() : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--muted-foreground)' }}>
            {title}
          </p>
          <p className={cn('text-3xl font-bold mt-1', styles.countColor)}>
            {count}
          </p>
          <p className="text-xs mt-1 truncate" style={{ color: 'var(--muted-foreground)' }}>
            {description}
          </p>
        </div>
        <div
          className={cn(
            'h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0',
            styles.iconBg
          )}
        >
          <span className={styles.iconColor}>{icon}</span>
        </div>
      </div>
      {actionLabel && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <span
            className={cn(
              'text-xs font-medium',
              variant === 'default' ? 'text-blue-600 dark:text-blue-400' : styles.iconColor
            )}
          >
            {actionLabel} &rarr;
          </span>
        </div>
      )}
    </div>
  );
}
