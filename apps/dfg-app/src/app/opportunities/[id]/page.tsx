'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  ExternalLink,
  Clock,
  MapPin,
  AlertCircle,
  DollarSign,
  Eye,
  Ban,
  Gavel,
  CheckCircle,
  XCircle,
  Archive,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { StatusBadge, ScoreBadge } from '@/components/ui/Badge';
import { TabbedAnalysis } from '@/components/features/tabbed-analysis';
import { NextActionCard } from '@/components/NextActionCard';
// Sprint 1.5 components
import { TitleInputs, type OperatorInputs } from '@/components/features/title-inputs';
import { GatesDisplay, type ComputedGates } from '@/components/features/gates-display';
import { StalenessBanner, type StalenessReason } from '@/components/features/staleness-banner';
import { KillSwitchBanner } from '@/components/features/kill-switch-banner';
import { RequiredExit } from '@/components/features/required-exit';
import {
  cn,
  formatCurrency,
  formatRelativeTime,
  formatDateTime,
  isEndingSoon,
  SEVERITY_COLORS,
  formatSourceLabel,
} from '@/lib/utils';
import {
  getOpportunity,
  updateOpportunity,
  dismissAlert,
  triggerAnalysis,
  updateOperatorInputs,
  checkStaleness,
  type AnalysisResult,
  type OpportunityWithAnalysis,
} from '@/lib/api';
import type { OpportunityDetail, OpportunityStatus, RejectionReason } from '@/types';

export default function OpportunityDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [opportunity, setOpportunity] = useState<OpportunityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showWatchModal, setShowWatchModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Sprint 1.5 state
  const [operatorInputs, setOperatorInputs] = useState<OperatorInputs | null>(null);
  const [gates, setGates] = useState<ComputedGates | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [stalenessReasons, setStalenessReasons] = useState<StalenessReason[]>([]);
  const [reAnalyzing, setReAnalyzing] = useState(false);
  const [analysisTimestamp, setAnalysisTimestamp] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data = await getOpportunity(id) as OpportunityWithAnalysis;
        setOpportunity(data);

        // Sprint 1.5: Set operator inputs and gates from response
        if (data.operatorInputs) {
          setOperatorInputs(data.operatorInputs);
        }
        if (data.gates) {
          setGates(data.gates);
        }

        // Sprint N+3 (#54): Load persisted AI analysis if available
        const dataWithAnalysis = data as OpportunityWithAnalysis & {
          currentAnalysisRun?: { aiAnalysis?: AnalysisResult; createdAt?: string };
        };
        if (dataWithAnalysis.currentAnalysisRun?.aiAnalysis) {
          setAnalysisResult(dataWithAnalysis.currentAnalysisRun.aiAnalysis);
          setAnalysisTimestamp(dataWithAnalysis.currentAnalysisRun.createdAt || null);
        }

        // Check staleness
        const staleness = checkStaleness(data);
        setIsStale(staleness.isStale);
        setStalenessReasons(staleness.reasons);
      } catch (error) {
        console.error('Failed to fetch opportunity:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleStatusChange = async (newStatus: OpportunityStatus, extra?: Record<string, unknown>) => {
    if (!opportunity) return;

    setUpdating(true);
    try {
      const updated = await updateOpportunity(opportunity.id, {
        status: newStatus,
        ...extra,
      });
      setOpportunity(updated);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDismissAlert = async (alertKey: string) => {
    if (!opportunity) return;

    try {
      await dismissAlert(opportunity.id, alertKey);
      // Refresh opportunity to get updated alerts
      const updated = await getOpportunity(opportunity.id);
      setOpportunity(updated);
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  };

  const handleAnalyze = async () => {
    if (!opportunity) return;

    setAnalyzing(true);
    setAnalysisError(null);
    try {
      // Sprint N+3 (#54): Use unified triggerAnalysis which calls dfg-analyst AND persists
      const { analysisRun } = await triggerAnalysis(opportunity.id);
      if (analysisRun.aiAnalysis) {
        setAnalysisResult(analysisRun.aiAnalysis);
      }
      setAnalysisTimestamp(analysisRun.createdAt);
      // Clear staleness after new analysis
      setIsStale(false);
      setStalenessReasons([]);
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  // Sprint 1.5: Handle saving operator inputs
  const handleSaveInputs = async (changedField?: string) => {
    if (!opportunity) return;

    try {
      // Refresh opportunity data to get updated gates and staleness
      const updated = await getOpportunity(opportunity.id) as OpportunityWithAnalysis;
      setOpportunity(updated);

      if (updated.operatorInputs) {
        setOperatorInputs(updated.operatorInputs);
      }
      if (updated.gates) {
        setGates(updated.gates);
      }

      // Sprint 1.5: Client-side staleness detection
      // If we have run an analysis (either result exists or timestamp is set), mark as stale
      if (analysisResult || analysisTimestamp) {
        setIsStale(true);
        setStalenessReasons([{
          type: 'operator_input_changed',
          field: changedField || 'inputs',
          from: null,
          to: 'updated',
        }]);
      } else {
        // Check server-side staleness if no client analysis
        const staleness = checkStaleness(updated);
        setIsStale(staleness.isStale);
        setStalenessReasons(staleness.reasons);
      }
    } catch (error) {
      console.error('Failed to refresh after save:', error);
    }
  };

  // Sprint N+3: Handle auto-rejection from hard gate failures
  const handleAutoReject = (failures: Array<{ field: string; reason: string }>) => {
    const failureDescriptions = failures.map(f => f.reason).join(', ');
    alert(`This opportunity has been auto-rejected due to disqualifying conditions:\n\n${failureDescriptions}\n\nYou will be redirected to the dashboard.`);
    router.push('/');
  };

  // Sprint 1.5: Handle re-analyze
  // Sprint N+3 (#54): Uses unified triggerAnalysis which calls dfg-analyst AND persists
  const handleReAnalyze = async () => {
    if (!opportunity) return;

    setReAnalyzing(true);
    setAnalysisError(null);
    try {
      // Re-run analysis - API now handles AI analysis + persistence
      const { analysisRun } = await triggerAnalysis(opportunity.id);
      if (analysisRun.aiAnalysis) {
        setAnalysisResult(analysisRun.aiAnalysis);
      }
      setAnalysisTimestamp(analysisRun.createdAt);

      // Clear staleness after re-analyze
      setIsStale(false);
      setStalenessReasons([]);
    } catch (error) {
      console.error('Re-analyze failed:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Re-analysis failed');
    } finally {
      setReAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </main>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500">Opportunity not found</p>
            <Button variant="ghost" onClick={() => router.back()} className="mt-2">
              Go back
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const endingSoon = isEndingSoon(opportunity.auction_ends_at, 24);

  // Ensure photos is an array (API may return JSON string)
  const photos: string[] = Array.isArray(opportunity.photos)
    ? opportunity.photos
    : typeof opportunity.photos === 'string'
      ? (() => { try { return JSON.parse(opportunity.photos) as string[]; } catch { return []; } })()
      : [];

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full max-w-[100vw] overflow-x-hidden">
      <Navigation title={opportunity.title} />

      <main className="flex-1 pb-24 min-w-0 w-full max-w-[100vw] overflow-x-hidden">
        {/* Header - back/title hidden on mobile, Navigation provides (#82) */}
        <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 h-14">
            {/* Back button - desktop only, Navigation has mobile back */}
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="shrink-0 hidden md:flex">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {/* Title - desktop only, Navigation has mobile title */}
            <h1 className="hidden md:block text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate flex-1 min-w-0">
              {opportunity.title}
            </h1>
            {/* Spacer for mobile to push buttons right */}
            <div className="flex-1 md:hidden" />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAnalyze}
              disabled={analyzing}
              className="shrink-0"
            >
              {analyzing ? (
                <RefreshCw className="h-4 w-4 sm:mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 sm:mr-1" />
              )}
              <span className="hidden sm:inline">{analyzing ? 'Analyzing...' : 'Analyze'}</span>
            </Button>
            {opportunity.source_url ? (
              <a
                href={opportunity.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">View Listing</span>
              </a>
            ) : (
              <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0" title="Source link unavailable">
                No link
              </span>
            )}
          </div>
        </header>

        {/* Alerts */}
        {opportunity.alerts.length > 0 && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
            {opportunity.alerts.map((alert) => (
              <div
                key={alert.key}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      SEVERITY_COLORS[alert.severity]
                    )}
                  >
                    {alert.severity}
                  </span>
                  <span className="text-sm font-medium text-red-800 dark:text-red-200">
                    {alert.title}
                  </span>
                  <span className="text-sm text-red-600 dark:text-red-300">
                    {alert.message}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismissAlert(alert.key)}
                >
                  Dismiss
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 space-y-4">
          {/* Next Action Card - #185 */}
          <NextActionCard
            analysis={analysisResult}
            analysisTimestamp={analysisTimestamp}
          />

          {/* Sprint 1.5: Staleness Banner */}
          <StalenessBanner
            isStale={isStale}
            reasons={stalenessReasons}
            analysisTimestamp={analysisTimestamp || (opportunity as OpportunityWithAnalysis).currentAnalysisRun?.createdAt}
            onReAnalyze={handleReAnalyze}
            isReAnalyzing={reAnalyzing}
          />

          {/* Sprint N+3: Kill Switch Banner - shows deal-breaker conditions */}
          <KillSwitchBanner operatorInputs={operatorInputs} />

          {/* Analysis Error */}
          {analysisError && (
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <CardContent>
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Analysis failed: {analysisError}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Results - Tabbed Interface */}
          <TabbedAnalysis
            analysis={analysisResult}
            currentBid={opportunity.current_bid}
            sourceUrl={opportunity.source_url}
          />

          {/* Photos - using regular img to avoid Next.js image optimization issues with external CDNs */}
          {photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {photos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedPhoto(photo)}
                  className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700"
                >
                  <img
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Status and Score */}
          <Card>
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusBadge status={opportunity.status} />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatSourceLabel(opportunity.source)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Sprint 1.5: Gates Display */}
          <GatesDisplay gates={gates} />

          {/* Sprint 1.5: Title Inputs */}
          <TitleInputs
            opportunityId={opportunity.id}
            initialInputs={operatorInputs}
            onSaveSuccess={handleSaveInputs}
            onAutoReject={handleAutoReject}
          />

          {/* Sprint 1.5: Required Exit Calculator */}
          <RequiredExit
            totalAllIn={opportunity.current_bid ? opportunity.current_bid * 1.15 : 0}
            maxBidOverride={operatorInputs?.overrides?.maxBidOverride?.value}
          />

          {/* Pricing */}
          <Card>
            <CardHeader>
              <h2 className="font-medium text-gray-900 dark:text-white">Pricing</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Current Bid</span>
                <span className="font-semibold text-lg">{formatCurrency(opportunity.current_bid)}</span>
              </div>
              {opportunity.max_bid_low && opportunity.max_bid_high && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Suggested Max</span>
                  <span className="text-green-600 dark:text-green-400">
                    {formatCurrency(opportunity.max_bid_low)} - {formatCurrency(opportunity.max_bid_high)}
                  </span>
                </div>
              )}
              {opportunity.max_bid_locked && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Your Max Bid</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(opportunity.max_bid_locked)}</span>
                </div>
              )}
              {opportunity.estimated_fees && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Est. Fees</span>
                  <span>{formatCurrency(opportunity.estimated_fees)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timing */}
          <Card>
            <CardHeader>
              <h2 className="font-medium text-gray-900 dark:text-white">Timing</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {opportunity.auction_ends_at && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>Auction Ends</span>
                  </div>
                  <div className={cn('text-right', endingSoon && 'text-red-600 dark:text-red-400')}>
                    <div className="font-medium">{formatRelativeTime(opportunity.auction_ends_at)}</div>
                    <div className="text-xs text-gray-400">{formatDateTime(opportunity.auction_ends_at)}</div>
                  </div>
                </div>
              )}
              {opportunity.distance_miles !== null && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-500">
                    <MapPin className="h-4 w-4" />
                    <span>Distance</span>
                  </div>
                  <span>{Math.round(opportunity.distance_miles)} miles</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          {opportunity.description && (
            <Card>
              <CardHeader>
                <h2 className="font-medium text-gray-900 dark:text-white">Description</h2>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {opportunity.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Analysis Summary */}
          {opportunity.analysis_summary && (
            <Card>
              <CardHeader>
                <h2 className="font-medium text-gray-900 dark:text-white">Analysis</h2>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {opportunity.analysis_summary}
                </p>
                {opportunity.last_analyzed_at && (
                  <p className="text-xs text-gray-400 mt-2">
                    Analyzed {formatRelativeTime(opportunity.last_analyzed_at)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions History */}
          {opportunity.actions.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="font-medium text-gray-900 dark:text-white">History</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {opportunity.actions.slice(0, 10).map((action) => (
                    <div key={action.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {action.action_type.replace('_', ' ')}
                        {action.to_status && ` → ${action.to_status}`}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatRelativeTime(action.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action buttons - Fixed at bottom (#82: no bottom nav on mobile anymore) */}
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 sm:p-4 overflow-x-hidden pb-safe">
          <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
            {opportunity.status === 'inbox' && (
              <>
                <Button
                  variant="primary"
                  onClick={() => handleStatusChange('qualifying')}
                  disabled={updating}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Qualify
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowWatchModal(true)}
                  disabled={updating}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Watch
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setShowRejectModal(true)}
                  disabled={updating}
                >
                  <Ban className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </>
            )}

            {opportunity.status === 'qualifying' && (
              <>
                <Button
                  variant="primary"
                  onClick={() => handleStatusChange('inspect')}
                  disabled={updating}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Inspect
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowWatchModal(true)}
                  disabled={updating}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Watch
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setShowRejectModal(true)}
                  disabled={updating}
                >
                  <Ban className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </>
            )}

            {opportunity.status === 'watch' && (
              <>
                <Button
                  variant="primary"
                  onClick={() => handleStatusChange('inspect')}
                  disabled={updating}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Inspect
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleStatusChange('qualifying')}
                  disabled={updating}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Qualify
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setShowRejectModal(true)}
                  disabled={updating}
                >
                  <Ban className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </>
            )}

            {opportunity.status === 'inspect' && (
              <>
                <Button
                  variant="primary"
                  onClick={() => {
                    const maxBid = prompt('Enter your maximum bid:');
                    if (maxBid) {
                      handleStatusChange('bid', { max_bid_locked: parseFloat(maxBid) });
                    }
                  }}
                  disabled={updating}
                >
                  <Gavel className="h-4 w-4 mr-1" />
                  Set Bid
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setShowRejectModal(true)}
                  disabled={updating}
                >
                  <Ban className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </>
            )}

            {opportunity.status === 'bid' && (
              <>
                <Button
                  variant="primary"
                  onClick={() => {
                    const finalPrice = prompt('Enter final price:');
                    if (finalPrice) {
                      handleStatusChange('won', { final_price: parseFloat(finalPrice) });
                    }
                  }}
                  disabled={updating}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Won
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleStatusChange('lost')}
                  disabled={updating}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Lost
                </Button>
              </>
            )}

            {['won', 'lost', 'rejected'].includes(opportunity.status) && (
              <Button
                variant="secondary"
                onClick={() => handleStatusChange('archived')}
                disabled={updating}
              >
                <Archive className="h-4 w-4 mr-1" />
                Archive
              </Button>
            )}
          </div>
        </div>

        {/* Reject Modal - Simple implementation */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 m-4 max-w-sm w-full">
              <h3 className="text-lg font-semibold mb-4">Reject Opportunity</h3>
              <select
                className="w-full border rounded-lg p-2 mb-4"
                onChange={(e) => {
                  if (e.target.value) {
                    handleStatusChange('rejected', {
                      rejection_reason: e.target.value as RejectionReason,
                    });
                    setShowRejectModal(false);
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>Select reason...</option>
                <option value="too_far">Too Far</option>
                <option value="too_expensive">Too Expensive</option>
                <option value="wrong_category">Wrong Category</option>
                <option value="poor_condition">Poor Condition</option>
                <option value="missing_info">Missing Info</option>
                <option value="other">Other</option>
              </select>
              <Button variant="ghost" onClick={() => setShowRejectModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Photo lightbox */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <img
              src={selectedPhoto}
              alt="Full size"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}
      </main>
    </div>
  );
}
