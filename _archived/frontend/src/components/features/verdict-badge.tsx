import { cn } from '@/lib/utils/cn';
import type { Verdict } from '@/lib/types';

interface VerdictBadgeProps {
  verdict: Verdict;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function VerdictBadge({ verdict, size = 'md', className }: VerdictBadgeProps) {
  const styles = {
    BUY: {
      bg: 'bg-green-500/20',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-500/30',
    },
    WATCH: {
      bg: 'bg-yellow-500/20',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-500/30',
    },
    PASS: {
      bg: 'bg-red-500/20',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-500/30',
    },
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  // Normalize verdict to uppercase and map legacy terms to canonical BUY/WATCH/PASS
  const rawVerdict = String(verdict || 'PASS').toUpperCase();
  const normalizedVerdict = rawVerdict === 'MARGINAL' ? 'WATCH'
    : rawVerdict === 'STRONG_BUY' ? 'BUY'
    : rawVerdict;
  const validVerdict: Verdict = normalizedVerdict === 'BUY' || normalizedVerdict === 'WATCH' || normalizedVerdict === 'PASS'
    ? normalizedVerdict as Verdict
    : 'PASS';

  const s = styles[validVerdict];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold border',
        s.bg,
        s.text,
        s.border,
        sizes[size],
        className
      )}
    >
      {validVerdict === 'BUY' && (
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )}
      {validVerdict === 'WATCH' && (
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )}
      {validVerdict === 'PASS' && (
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )}
      {validVerdict}
    </span>
  );
}
