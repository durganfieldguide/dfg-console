/**
 * Analyze Route
 *
 * Proxies analysis requests to the dfg-analyst worker.
 * This is separate from the main API proxy because it goes to a different worker.
 *
 * Required environment variables:
 * - DFG_ANALYST_URL: The dfg-analyst worker URL (e.g., https://dfg-analyst.automation-ab6.workers.dev)
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Get analyst URL from environment
  const analystUrl = process.env.DFG_ANALYST_URL;

  if (!analystUrl) {
    console.error('[analyze] DFG_ANALYST_URL environment variable not set');
    return NextResponse.json(
      { error: { code: 'CONFIG_ERROR', message: 'Analyst URL not configured' } },
      { status: 500 }
    );
  }

  try {
    const body = await request.text();
    const targetUrl = `${analystUrl.replace(/\/$/, '')}/analyze`;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[analyze] Fetch error:', error);
    return NextResponse.json(
      { error: { code: 'ANALYST_ERROR', message: 'Failed to reach analyst' } },
      { status: 502 }
    );
  }
}
