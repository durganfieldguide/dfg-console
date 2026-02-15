'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Clock,
  AlertCircle,
  FlaskConical,
  RefreshCw,
  ChevronRight,
  Hand,
  ThumbsDown,
  Eye,
  Loader2,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn, formatRelativeTime, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import {
  getAttentionRequired,
  touchOpportunity,
  updateOpportunity,
  triggerAnalysis,
  type AttentionItem,
  type ReasonChip,
} from '@/lib/api'
import type { OpportunityStatus } from '@dfg/types'

/**
 * Reason chip configuration for display.
 */
const CHIP_CONFIG: Record<
  ReasonChip,
  { label: string; icon: typeof AlertTriangle; color: string; filterUrl: string }
> = {
  DECISION_STALE: {
    label: 'Decision Needed',
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    filterUrl: '/opportunities?decision_stale=true',
  },
  ENDING_SOON: {
    label: 'Ending Soon',
    icon: Clock,
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    filterUrl: '/opportunities?ending_soon=true',
  },
  STALE: {
    label: 'Stale',
    icon: AlertCircle,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    filterUrl: '/opportunities?stale=true',
  },
  ANALYSIS_STALE: {
    label: 'Re-analyze',
    icon: FlaskConical,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    filterUrl: '/opportunities?analysis_stale=true',
  },
}

interface ReasonChipProps {
  chip: ReasonChip
  size?: 'sm' | 'md'
  onClick?: (e: React.MouseEvent) => void
}

function ReasonChipBadge({ chip, size = 'sm', onClick }: ReasonChipProps) {
  const config = CHIP_CONFIG[chip]
  const Icon = config.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity',
        config.color,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {config.label}
    </button>
  )
}

/**
 * CTA action types for inline quick actions
 */
type CTAAction = 'reanalyze' | 'touch' | 'pass' | 'watch'

interface AttentionItemRowProps {
  item: AttentionItem
  rank: number // 1-indexed position in the list
  onTouch: (id: string) => void
  onChipClick: (chip: ReasonChip) => void
  onAction: (id: string, action: CTAAction) => Promise<boolean>
  pendingAction: CTAAction | null
  error: string | null
}

function AttentionItemRow({
  item,
  rank,
  onTouch,
  onChipClick,
  onAction,
  pendingAction,
  error,
}: AttentionItemRowProps) {
  const handleClick = () => {
    // Fire touch on click (fire-and-forget)
    onTouch(item.id)
  }

  const handleChipClick = (e: React.MouseEvent, chip: ReasonChip) => {
    // Prevent the row click from firing
    e.preventDefault()
    e.stopPropagation()
    onChipClick(chip)
  }

  const handleCTAClick = async (e: React.MouseEvent, action: CTAAction) => {
    e.preventDefault()
    e.stopPropagation()
    await onAction(item.id, action)
  }

  // Format time remaining
  const timeRemaining = item.auction_ends_at ? formatRelativeTime(item.auction_ends_at) : null

  // Determine which CTAs to show
  const showReanalyze = item.is_analysis_stale
  const showTouch = item.is_decision_stale

  // Compute rank badge styling - top 3 get special treatment
  const rankBadgeStyles =
    rank <= 3
      ? 'bg-red-500 text-white font-bold'
      : rank <= 5
        ? 'bg-amber-500 text-white font-semibold'
        : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium'

  return (
    <div className="group relative overflow-hidden">
      <Link
        href={`/opportunities/${encodeURIComponent(item.id)}`}
        onClick={handleClick}
        className="block hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors -mx-4 px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
      >
        <div className="flex items-start gap-3">
          {/* Rank Badge */}
          <div
            className={cn(
              'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs',
              rankBadgeStyles
            )}
            title={`Priority #${rank}`}
          >
            {rank}
          </div>

          <div className="flex-1 min-w-0">
            {/* Title */}
            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate md:pr-24">
              {item.title}
            </h4>

            {/* Status, Source, and Decision-Grade Info */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium',
                  STATUS_COLORS[item.status as OpportunityStatus]
                )}
              >
                {STATUS_LABELS[item.status as OpportunityStatus]}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{item.source}</span>
              {/* Current bid (#69) */}
              {item.current_bid != null && item.current_bid > 0 && (
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  ${item.current_bid.toLocaleString()}
                </span>
              )}
              {timeRemaining && (
                <span className="text-xs text-gray-500 dark:text-gray-400">{timeRemaining}</span>
              )}
            </div>

            {/* Reason Chips - clickable to filter */}
            <div className="flex flex-wrap gap-1 mt-2">
              {item.reason_tags.map((chip) => (
                <ReasonChipBadge key={chip} chip={chip} onClick={(e) => handleChipClick(e, chip)} />
              ))}
            </div>

            {/* Error message */}
            {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
          </div>

          {/* Max Bid if set */}
          <div className="flex flex-col items-end gap-1">
            {item.max_bid_locked && (
              <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                ${item.max_bid_locked.toLocaleString()}
              </span>
            )}
            <ChevronRight className="h-4 w-4 text-gray-400 hidden md:block md:group-hover:hidden" />
          </div>
        </div>
      </Link>

      {/* Inline CTAs - always visible on mobile, hover-reveal on desktop */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {/* Re-analyze - only for analysis stale items */}
        {showReanalyze && (
          <button
            type="button"
            onClick={(e) => handleCTAClick(e, 'reanalyze')}
            disabled={pendingAction !== null}
            className={cn(
              'p-1.5 rounded text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title="Re-analyze"
          >
            {pendingAction === 'reanalyze' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FlaskConical className="h-4 w-4" />
            )}
          </button>
        )}

        {/* Touch - only for decision stale items */}
        {showTouch && (
          <button
            type="button"
            onClick={(e) => handleCTAClick(e, 'touch')}
            disabled={pendingAction !== null}
            className={cn(
              'p-1.5 rounded text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/30 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title="Mark as reviewed"
          >
            {pendingAction === 'touch' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Hand className="h-4 w-4" />
            )}
          </button>
        )}

        {/* Separator if there are conditional CTAs */}
        {(showReanalyze || showTouch) && (
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-0.5" />
        )}

        {/* Pass - always available */}
        <button
          type="button"
          onClick={(e) => handleCTAClick(e, 'pass')}
          disabled={pendingAction !== null}
          className={cn(
            'p-1.5 rounded text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title="Pass"
        >
          {pendingAction === 'pass' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ThumbsDown className="h-4 w-4" />
          )}
        </button>

        {/* Watch - always available */}
        <button
          type="button"
          onClick={(e) => handleCTAClick(e, 'watch')}
          disabled={pendingAction !== null}
          className={cn(
            'p-1.5 rounded text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/30 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title="Watch"
        >
          {pendingAction === 'watch' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
}

interface AttentionRequiredListProps {
  limit?: number
  showHeader?: boolean
  className?: string
}

// Rate limiting: track last reanalyze time per opportunity
const REANALYZE_COOLDOWN_MS = 30000 // 30 seconds

export function AttentionRequiredList({
  limit = 5,
  showHeader = true,
  className,
}: AttentionRequiredListProps) {
  const router = useRouter()
  const [items, setItems] = useState<AttentionItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Per-item action state
  const [pendingActions, setPendingActions] = useState<Record<string, CTAAction | null>>({})
  const [actionErrors, setActionErrors] = useState<Record<string, string | null>>({})

  // Rate limiting for reanalyze
  const reanalyzeTimestamps = useRef<Record<string, number>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAttentionRequired(limit)
      setItems(data.items)
      setTotalCount(data.total_count)
    } catch (err) {
      console.error('Failed to fetch attention required items:', err)
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleTouch = useCallback((id: string) => {
    // Fire and forget - don't await, just trigger the touch
    touchOpportunity(id).catch((err) => {
      console.warn('Touch failed:', err)
    })
  }, [])

  const handleChipClick = useCallback(
    (chip: ReasonChip) => {
      // Navigate to the filtered opportunities page
      const config = CHIP_CONFIG[chip]
      router.push(config.filterUrl)
    },
    [router]
  )

  /**
   * Handle CTA actions with optimistic UI updates
   */
  const handleAction = useCallback(
    async (id: string, action: CTAAction): Promise<boolean> => {
      // Clear previous error for this item
      setActionErrors((prev) => ({ ...prev, [id]: null }))

      // Rate limit reanalyze
      if (action === 'reanalyze') {
        const lastReanalyze = reanalyzeTimestamps.current[id] || 0
        const now = Date.now()
        if (now - lastReanalyze < REANALYZE_COOLDOWN_MS) {
          const remainingSec = Math.ceil((REANALYZE_COOLDOWN_MS - (now - lastReanalyze)) / 1000)
          setActionErrors((prev) => ({
            ...prev,
            [id]: `Please wait ${remainingSec}s before re-analyzing`,
          }))
          return false
        }
        reanalyzeTimestamps.current[id] = now
      }

      // Set pending state
      setPendingActions((prev) => ({ ...prev, [id]: action }))

      try {
        switch (action) {
          case 'reanalyze':
            await triggerAnalysis(id)
            // After successful reanalyze, remove the ANALYSIS_STALE tag optimistically
            setItems(
              (prev) =>
                prev
                  .map((item) =>
                    item.id === id
                      ? {
                          ...item,
                          is_analysis_stale: false,
                          reason_tags: item.reason_tags.filter((t) => t !== 'ANALYSIS_STALE'),
                        }
                      : item
                  )
                  .filter((item) => item.reason_tags.length > 0) // Remove if no more reasons
            )
            break

          case 'touch':
            await touchOpportunity(id)
            // After successful touch, remove DECISION_STALE and STALE tags optimistically
            setItems((prev) =>
              prev
                .map((item) =>
                  item.id === id
                    ? {
                        ...item,
                        is_decision_stale: false,
                        is_stale: false,
                        reason_tags: item.reason_tags.filter(
                          (t) => t !== 'DECISION_STALE' && t !== 'STALE'
                        ),
                      }
                    : item
                )
                .filter((item) => item.reason_tags.length > 0)
            )
            break

          case 'pass':
            // Pass requires a rejection reason - use 'other' with a default note
            await updateOpportunity(id, {
              status: 'rejected',
              rejection_reason: 'other',
              rejection_note: 'Passed from dashboard',
            })
            // Remove item from list optimistically
            setItems((prev) => prev.filter((item) => item.id !== id))
            setTotalCount((prev) => Math.max(0, prev - 1))
            break

          case 'watch': {
            // Watch requires watch_trigger and watch_threshold
            // Use 'manual' trigger with remind_at set to 24 hours from now
            // (ending_soon requires auction_ends_at which not all items have)
            const remindAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            await updateOpportunity(id, {
              status: 'watch',
              watch_trigger: 'manual',
              watch_threshold: { remind_at: remindAt },
            })
            // Remove item from attention list since status changed
            // (item no longer needs immediate attention after explicit watch action)
            setItems((prev) => prev.filter((item) => item.id !== id))
            setTotalCount((prev) => Math.max(0, prev - 1))
            break
          }
        }

        return true
      } catch (err) {
        console.error(`Action ${action} failed for ${id}:`, err)
        setActionErrors((prev) => ({
          ...prev,
          [id]: err instanceof Error ? err.message : 'Action failed',
        }))

        // Revert optimistic update on error - refetch data
        fetchData()
        return false
      } finally {
        setPendingActions((prev) => ({ ...prev, [id]: null }))
      }
    },
    [fetchData]
  )

  if (loading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader className="px-3 sm:px-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <h2 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                Attention
              </h2>
            </div>
          </CardHeader>
        )}
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn('border-red-200 dark:border-red-800', className)}>
        {showHeader && (
          <CardHeader className="px-3 sm:px-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              <h2 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                Attention
              </h2>
            </div>
          </CardHeader>
        )}
        <CardContent className="px-3 sm:px-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchData} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card className={cn('border-green-200 dark:border-green-800', className)}>
        {showHeader && (
          <CardHeader className="px-3 sm:px-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-green-500 shrink-0" />
              <h2 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                Attention
              </h2>
            </div>
          </CardHeader>
        )}
        <CardContent className="px-3 sm:px-4">
          <p className="text-sm text-green-600 dark:text-green-400">
            All caught up! No items need attention.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border-amber-200 dark:border-amber-800', className)}>
      {showHeader && (
        <CardHeader className="flex flex-row items-center justify-between px-3 sm:px-4 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <h2 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white truncate">
              Attention
            </h2>
            <span className="text-sm text-amber-600 dark:text-amber-400 font-semibold shrink-0">
              {totalCount}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchData} className="shrink-0">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((item, index) => (
            <div key={item.id} className="px-4">
              <AttentionItemRow
                item={item}
                rank={index + 1}
                onTouch={handleTouch}
                onChipClick={handleChipClick}
                onAction={handleAction}
                pendingAction={pendingActions[item.id] || null}
                error={actionErrors[item.id] || null}
              />
            </div>
          ))}
        </div>

        {/* View All link - shown when there are more items than displayed */}
        {totalCount > items.length && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <Link
              href="/opportunities?attention=true"
              className="text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 flex items-center justify-center gap-1"
            >
              View all {totalCount} items
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AttentionRequiredList
