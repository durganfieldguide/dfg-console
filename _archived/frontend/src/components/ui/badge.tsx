import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground border',
        success: 'border-transparent bg-green-500 text-white',
        warning: 'border-transparent bg-yellow-500 text-white',
        buy: 'border-transparent bg-green-500/20 text-green-600 dark:text-green-400',
        marginal: 'border-transparent bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
        pass: 'border-transparent bg-red-500/20 text-red-600 dark:text-red-400',
        // Category badges
        power_tools: 'border-transparent bg-blue-500/20 text-blue-600 dark:text-blue-400',
        welders: 'border-transparent bg-orange-500/20 text-orange-600 dark:text-orange-400',
        trailers: 'border-transparent bg-purple-500/20 text-purple-600 dark:text-purple-400',
        compressors: 'border-transparent bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
        generators: 'border-transparent bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
        heavy_equipment: 'border-transparent bg-amber-500/20 text-amber-600 dark:text-amber-400',
        buy_box: 'border-transparent bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
        automotive: 'border-transparent bg-rose-500/20 text-rose-600 dark:text-rose-400',
        // Source badges
        sierra_auction: 'border-transparent bg-violet-500/20 text-violet-600 dark:text-violet-400',
        fb_marketplace: 'border-transparent bg-blue-600/20 text-blue-700 dark:text-blue-400',
        govplanet: 'border-transparent bg-green-600/20 text-green-700 dark:text-green-400',
        purple_wave: 'border-transparent bg-purple-600/20 text-purple-700 dark:text-purple-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
