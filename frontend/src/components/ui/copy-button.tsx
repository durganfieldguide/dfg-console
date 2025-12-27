'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';

interface CopyButtonProps {
  value: string | number;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'subtle';
}

export function CopyButton({ value, label, className, size = 'sm', variant = 'ghost' }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const sizeClasses = {
    sm: 'h-6 w-6 p-1',
    md: 'h-8 w-8 p-1.5',
  };

  const variantClasses = {
    ghost: 'hover:bg-muted/50',
    subtle: 'opacity-50 hover:opacity-100',
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center justify-center rounded transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      title={label || `Copy ${value}`}
      aria-label={label || `Copy ${value}`}
    >
      {copied ? (
        <CheckIcon className="h-full w-full text-green-600 dark:text-green-400" />
      ) : (
        <ClipboardDocumentIcon className="h-full w-full" style={{ color: 'var(--muted-foreground)' }} />
      )}
    </button>
  );
}

// Metric with built-in copy functionality
interface CopyableMetricProps {
  label: string;
  value: string;
  rawValue: string | number;
  helpTerm?: string;
  className?: string;
  valueClassName?: string;
}

export function CopyableMetric({ label, value, rawValue, className, valueClassName }: CopyableMetricProps) {
  return (
    <div className={cn('group', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
          {label}
        </span>
        <CopyButton
          value={rawValue}
          label={`Copy ${label}`}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          variant="subtle"
        />
      </div>
      <p className={cn('text-2xl font-bold font-mono', valueClassName)}>{value}</p>
    </div>
  );
}
