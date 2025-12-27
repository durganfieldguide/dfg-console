import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const SCOUT_BASE_URL = process.env.SCOUT_API_URL || 'https://dfg-scout.automation-ab6.workers.dev';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.opsToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('run_id');
    const source = searchParams.get('source');
    const batchSize = searchParams.get('batch_size') || '10';

    if (!runId || !source) {
      return NextResponse.json(
        { error: 'run_id and source are required' },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({
      run_id: runId,
      source,
      batch_size: batchSize,
      token: session.opsToken,
    });

    const response = await fetch(`${SCOUT_BASE_URL}/ops/sync-next-batch?${params}`);

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || 'Failed to sync batch' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Sync Batch API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
