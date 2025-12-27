'use client';

import * as React from 'react';
import { differenceInSeconds, parseISO } from 'date-fns';
import { cn } from '@/lib/utils/cn';

interface CountdownProps {
  endDate: string | null;
  className?: string;
}

export function Countdown({ endDate, className }: CountdownProps) {
  const [timeLeft, setTimeLeft] = React.useState<string>('');
  const [isUrgent, setIsUrgent] = React.useState(false);

  React.useEffect(() => {
    if (!endDate) {
      setTimeLeft('No end date');
      return;
    }

    const calculateTimeLeft = () => {
      const end = parseISO(endDate);
      const now = new Date();
      const seconds = differenceInSeconds(end, now);

      if (seconds <= 0) {
        setTimeLeft('Ended');
        setIsUrgent(false);
        return;
      }

      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      // Urgent if less than 2 hours
      setIsUrgent(seconds < 7200);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${secs}s`);
      } else {
        setTimeLeft(`${secs}s`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  if (!endDate) {
    return (
      <span className={cn('text-sm', className)} style={{ color: 'var(--muted-foreground)' }}>
        —
      </span>
    );
  }

  return (
    <span
      className={cn(
        'text-sm font-mono tabular-nums',
        isUrgent ? 'text-red-600 dark:text-red-400 font-semibold' : '',
        timeLeft === 'Ended' ? 'text-muted-foreground' : '',
        className
      )}
      style={!isUrgent && timeLeft !== 'Ended' ? { color: 'var(--foreground)' } : undefined}
    >
      {timeLeft}
    </span>
  );
}
