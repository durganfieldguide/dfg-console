import { cn } from '@/lib/utils/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-6',
        className
      )}
      style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
          {title}
        </p>
        {icon && (
          <div className="h-8 w-8 rounded-md flex items-center justify-center"
            style={{ backgroundColor: 'var(--muted)' }}>
            {icon}
          </div>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        {trend && (
          <span
            className={cn(
              'text-sm font-medium',
              trend.direction === 'up' && 'text-green-600 dark:text-green-400',
              trend.direction === 'down' && 'text-red-600 dark:text-red-400',
              trend.direction === 'neutral' && 'text-muted-foreground'
            )}
          >
            {trend.direction === 'up' && '+'}
            {trend.value}%
          </span>
        )}
      </div>
      {description && (
        <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {description}
        </p>
      )}
    </div>
  );
}
