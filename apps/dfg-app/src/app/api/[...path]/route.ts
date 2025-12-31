/**
 * API Proxy Route
 *
 * Proxies all /api/* requests to the dfg-api worker.
 * Keeps the API token server-side (not exposed to browser).
 *
 * Required environment variables:
 * - DFG_API_URL: The dfg-api worker URL (e.g., https://dfg-api.automation-ab6.workers.dev)
 * - OPS_TOKEN: The API authentication token
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params);
}

async function proxyRequest(
  request: NextRequest,
  params: { path: string[] }
): Promise<NextResponse> {
  // Get config from environment - these must be set in Vercel
  const apiBase = process.env.DFG_API_URL;
  const apiToken = process.env.OPS_TOKEN;

  // Validate configuration
  if (!apiBase) {
    console.error('[api-proxy] DFG_API_URL environment variable not set');
    return NextResponse.json(
      { error: { code: 'CONFIG_ERROR', message: 'API URL not configured' } },
      { status: 500 }
    );
  }

  if (!apiToken) {
    console.error('[api-proxy] OPS_TOKEN environment variable not set');
    return NextResponse.json(
      { error: { code: 'CONFIG_ERROR', message: 'API token not configured' } },
      { status: 500 }
    );
  }

  // Build target URL - params.path is ['opportunities', 'stats'] for /api/opportunities/stats
  const pathSegments = params.path.join('/');
  const queryString = new URL(request.url).search;
  const targetUrl = `${apiBase.replace(/\/$/, '')}/api/${pathSegments}${queryString}`;

  // Forward request body for non-GET requests
  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      body = await request.text();
    } catch {
      // No body
    }
  }

  try {
    console.log(`[api-proxy] Fetching: ${targetUrl}`);
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body,
    });

    console.log(`[api-proxy] Response status: ${response.status}`);
    const text = await response.text();
    console.log(`[api-proxy] Response body length: ${text.length}`);

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('[api-proxy] JSON parse error:', parseError, 'Body:', text.substring(0, 500));
      return NextResponse.json(
        { error: { code: 'PARSE_ERROR', message: 'Invalid JSON response from API' } },
        { status: 502 }
      );
    }

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[api-proxy] Fetch error:', error);
    return NextResponse.json(
      { error: { code: 'PROXY_ERROR', message: 'Failed to reach API', details: String(error) } },
      { status: 502 }
    );
  }
}
