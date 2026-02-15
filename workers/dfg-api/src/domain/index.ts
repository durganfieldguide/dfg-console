/**
 * Domain Logic Exports
 *
 * Sprint 1.5 domain functions for gates, required exit, and staleness detection.
 */

export { computeGates, getBlockingGates, formatBlockedMessage } from './gates'
export {
  computeRequiredExitPrice,
  formatRequiredExitMessage,
  type RequiredExitParams,
  type RequiredExitResult,
} from './requiredExit'
export {
  checkStaleness,
  computeListingSnapshotHash,
  formatStalenessReason,
  formatStalenessBanner,
  type Assumptions,
  type AnalysisRunSnapshot,
} from './staleness'
