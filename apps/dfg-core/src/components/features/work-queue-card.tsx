'use client';

import { useState } from 'react';
import {
  ExternalLink,
  Copy,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { WorkQueueCard, PromptType } from '@/types/github';

interface WorkQueueCardProps {
  card: WorkQueueCard;
  onCopyPrompt: (card: WorkQueueCard, type: PromptType) => Promise<void>;
}

export function WorkQueueCard({ card, onCopyPrompt }: WorkQueueCardProps) {
  const [copying, setCopying] = useState<PromptType | null>(null);

  const handleCopy = async (type: PromptType) => {
    setCopying(type);
    try {
      await onCopyPrompt(card, type);
    } finally {
      // Reset after a brief delay to show feedback
      setTimeout(() => setCopying(null), 1000);
    }
  };

  const relativeTime = getRelativeTime(card.updatedAt);

  return (
    <div className="border-b border-gray-100 dark:border-gray-700 last:border-0 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
          >
            <span className="truncate">
              #{card.number} · {card.title}
            </span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>
      </div>

      {/* Labels */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {card.statusLabels.map((label) => (
          <span
            key={label}
            className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          >
            {label}
          </span>
        ))}
        {card.needsLabels.map((label) => (
          <span
            key={label}
            className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
          >
            {label}
          </span>
        ))}
        {card.qaGrade && (
          <span
            className={cn(
              'px-2 py-0.5 rounded text-xs font-medium',
              card.qaGrade === 'pass'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : card.qaGrade === 'pass-unverified'
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            )}
          >
            qa-grade:{card.qaGrade}
          </span>
        )}
        {card.type === 'pr' && (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            PR
          </span>
        )}
      </div>

      {/* Preview URL */}
      {card.previewUrl ? (
        <a
          href={card.previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-1.5 mb-2 truncate"
        >
          <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
          <span className="truncate">{card.previewUrl}</span>
        </a>
      ) : (
        <div className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1.5 mb-2">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          No preview URL available
        </div>
      )}

      {/* Timestamp */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Updated {relativeTime}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleCopy('qa')}
          loading={copying === 'qa'}
          disabled={copying !== null && copying !== 'qa'}
        >
          <Copy className="h-3 w-3 mr-1.5" />
          QA Prompt
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleCopy('pm')}
          loading={copying === 'pm'}
          disabled={copying !== null && copying !== 'pm'}
        >
          <Copy className="h-3 w-3 mr-1.5" />
          PM Prompt
        </Button>

        {card.hasAgentBrief && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleCopy('agent-brief')}
            loading={copying === 'agent-brief'}
            disabled={copying !== null && copying !== 'agent-brief'}
          >
            <Copy className="h-3 w-3 mr-1.5" />
            Agent Brief
          </Button>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleCopy('merge')}
          loading={copying === 'merge'}
          disabled={copying !== null && copying !== 'merge'}
        >
          <Copy className="h-3 w-3 mr-1.5" />
          Merge Prompt
        </Button>
      </div>
    </div>
  );
}

/**
 * Get relative time string from ISO date string.
 */
function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // For longer times, show the date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
