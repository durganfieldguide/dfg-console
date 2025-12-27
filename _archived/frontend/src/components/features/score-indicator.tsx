import { cn } from '@/lib/utils/cn';

interface ScoreIndicatorProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ScoreIndicator({ score, size = 'md', showLabel = true }: ScoreIndicatorProps) {
  // Ensure score is a valid number
  const safeScore = typeof score === 'number' && !isNaN(score) ? score : 0;

  const getColor = (s: number) => {
    if (s >= 80) return { bg: 'bg-green-500', text: 'text-green-600 dark:text-green-400' };
    if (s >= 60) return { bg: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400' };
    return { bg: 'bg-red-500', text: 'text-red-600 dark:text-red-400' };
  };

  const colors = getColor(safeScore);

  const sizes = {
    sm: { container: 'w-12', bar: 'h-1.5', text: 'text-xs' },
    md: { container: 'w-16', bar: 'h-2', text: 'text-sm' },
    lg: { container: 'w-24', bar: 'h-2.5', text: 'text-base' },
  };

  const s = sizes[size];

  return (
    <div className="flex items-center gap-2">
      <div className={cn('rounded-full overflow-hidden', s.container, s.bar)}
        style={{ backgroundColor: 'var(--muted)' }}>
        <div
          className={cn('h-full rounded-full transition-all', colors.bg)}
          style={{ width: `${safeScore}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn('font-medium font-mono', s.text, colors.text)}>
          {safeScore}
        </span>
      )}
    </div>
  );
}
