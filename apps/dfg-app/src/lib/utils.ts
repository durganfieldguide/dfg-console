import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format, isAfter, isBefore, addHours } from 'date-fns'
import type { OpportunityStatus, AlertSeverity } from '@dfg/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// =============================================================================
// STATUS HELPERS
// =============================================================================

export const STATUS_LABELS: Record<OpportunityStatus, string> = {
  inbox: 'Inbox',
  qualifying: 'Qualifying',
  watch: 'Watch',
  inspect: 'Inspect',
  bid: 'Bid',
  won: 'Won',
  lost: 'Lost',
  rejected: 'Rejected',
  archived: 'Archived',
}

export const STATUS_COLORS: Record<OpportunityStatus, string> = {
  inbox: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  qualifying: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  watch: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  inspect: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  bid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  won: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  lost: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  archived: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}

export const ACTIVE_STATUSES: OpportunityStatus[] = [
  'inbox',
  'qualifying',
  'watch',
  'inspect',
  'bid',
]

export const TERMINAL_STATUSES: OpportunityStatus[] = ['won', 'lost', 'rejected', 'archived']

// =============================================================================
// ALERT HELPERS
// =============================================================================

export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-gray-900',
  low: 'bg-blue-500 text-white',
}

// =============================================================================
// DATE HELPERS
// =============================================================================

export function formatRelativeTime(isoDate: string | null): string {
  if (!isoDate) return 'N/A'
  try {
    return formatDistanceToNow(new Date(isoDate), { addSuffix: true })
  } catch {
    return 'Invalid date'
  }
}

export function formatDateTime(isoDate: string | null): string {
  if (!isoDate) return 'N/A'
  try {
    return format(new Date(isoDate), 'MMM d, yyyy h:mm a')
  } catch {
    return 'Invalid date'
  }
}

export function formatDate(isoDate: string | null): string {
  if (!isoDate) return 'N/A'
  try {
    return format(new Date(isoDate), 'MMM d, yyyy')
  } catch {
    return 'Invalid date'
  }
}

export function isEndingSoon(auctionEndsAt: string | null, hoursThreshold = 24): boolean {
  if (!auctionEndsAt) return false
  const endDate = new Date(auctionEndsAt)
  const threshold = addHours(new Date(), hoursThreshold)
  return isAfter(endDate, new Date()) && isBefore(endDate, threshold)
}

export function hasEnded(auctionEndsAt: string | null): boolean {
  if (!auctionEndsAt) return false
  return isBefore(new Date(auctionEndsAt), new Date())
}

// =============================================================================
// CURRENCY HELPERS
// =============================================================================

export function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(num: number | null): string {
  if (num === null || num === undefined) return '0'
  return new Intl.NumberFormat('en-US').format(num)
}

// =============================================================================
// SCORE HELPERS
// =============================================================================

export function getScoreBand(score: number): 'high' | 'medium' | 'low' {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

export function getScoreColor(score: number): string {
  const band = getScoreBand(score)
  switch (band) {
    case 'high':
      return 'text-green-600 dark:text-green-400'
    case 'medium':
      return 'text-amber-600 dark:text-amber-400'
    case 'low':
      return 'text-red-600 dark:text-red-400'
  }
}

// =============================================================================
// SOURCE HELPERS (#100)
// =============================================================================

const SOURCE_LABELS: Record<string, string> = {
  sierra: 'Sierra',
  sierra_auction: 'Sierra', // Legacy support
  ironplanet: 'IronPlanet',
  fb_marketplace: 'FB Marketplace',
  craigslist: 'Craigslist',
  offerup: 'OfferUp',
}

export function formatSourceLabel(source: string): string {
  return SOURCE_LABELS[source] || source
}
