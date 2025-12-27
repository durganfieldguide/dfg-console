import type {
  AuctionSource,
  ScoutRunResponse,
  StatsResponse,
  SyncBatchResponse,
  AnalyzeRequest,
  AnalysisResult,
  Listing,
} from '@/lib/types';

const SCOUT_BASE_URL = process.env.NEXT_PUBLIC_SCOUT_API_URL || 'https://dfg-scout.automation-ab6.workers.dev';
const ANALYST_BASE_URL = process.env.NEXT_PUBLIC_ANALYST_API_URL || 'https://dfg-analyst.automation-ab6.workers.dev';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new ApiError(response.status, error || `HTTP ${response.status}`);
  }

  return response;
}

// ============================================
// Scout API
// ============================================

export async function runScout(source: AuctionSource, token: string): Promise<ScoutRunResponse> {
  const response = await fetchWithAuth(`${SCOUT_BASE_URL}/ops/run?source=${source}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.json();
}

export async function getStats(token: string): Promise<StatsResponse> {
  const response = await fetchWithAuth(`${SCOUT_BASE_URL}/ops/stats`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.json();
}

export async function syncNextBatch(
  runId: string,
  source: AuctionSource,
  token: string,
  batchSize: number = 10
): Promise<SyncBatchResponse> {
  const params = new URLSearchParams({
    run_id: runId,
    source,
    batch_size: batchSize.toString(),
    token,
  });
  const response = await fetchWithAuth(`${SCOUT_BASE_URL}/ops/sync-next-batch?${params}`);
  return response.json();
}

export async function getListings(
  token: string,
  params?: {
    source?: AuctionSource;
    run_id?: string;
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ listings: Listing[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    });
  }
  const response = await fetchWithAuth(`${SCOUT_BASE_URL}/ops/listings?${searchParams}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.json();
}

export async function getListing(listingId: string, token: string): Promise<Listing> {
  const response = await fetchWithAuth(`${SCOUT_BASE_URL}/ops/listings/${listingId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.json();
}

export async function updateListingStatus(
  listingId: string,
  status: string,
  token: string
): Promise<Listing> {
  const response = await fetchWithAuth(`${SCOUT_BASE_URL}/ops/listings/${listingId}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  return response.json();
}

// ============================================
// Analyst API
// ============================================

export async function analyzeListing(request: AnalyzeRequest): Promise<AnalysisResult> {
  const response = await fetchWithAuth(`${ANALYST_BASE_URL}/analyze`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
  const result = await response.json();
  return {
    ...result,
    listing_id: `${request.source}:${request.lot_id}`,
  };
}

export async function getAnalysis(listingId: string, token: string): Promise<AnalysisResult | null> {
  try {
    const response = await fetchWithAuth(`${SCOUT_BASE_URL}/ops/analysis/${listingId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.json();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

// ============================================
// Server-Side API Functions (for API routes)
// ============================================

export const serverApi = {
  runScout,
  getStats,
  syncNextBatch,
  getListings,
  getListing,
  updateListingStatus,
  analyzeListing,
  getAnalysis,
};

export { ApiError };
