import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const SCOUT_BASE_URL = process.env.SCOUT_API_URL || 'https://dfg-scout.automation-ab6.workers.dev';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.opsToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const listingId = decodeURIComponent(id);

    const response = await fetch(`${SCOUT_BASE_URL}/ops/analysis/${encodeURIComponent(listingId)}`, {
      headers: {
        Authorization: `Bearer ${session.opsToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
      }
      const error = await response.text();
      return NextResponse.json(
        { error: error || 'Failed to fetch analysis' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Analysis API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
