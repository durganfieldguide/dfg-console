import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const SCOUT_BASE_URL = process.env.SCOUT_API_URL || 'https://dfg-scout.automation-ab6.workers.dev';

// Map frontend source names to backend source names
function mapSourceToBackend(source: string): string {
  const sourceMap: Record<string, string> = {
    'sierra_auction': 'sierra',
    'ironplanet': 'ironplanet',
  };
  return sourceMap[source] || source;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.opsToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');

    if (!source) {
      return NextResponse.json({ error: 'Source is required' }, { status: 400 });
    }

    // Map to backend source name
    const backendSource = mapSourceToBackend(source);

    const response = await fetch(`${SCOUT_BASE_URL}/ops/run?source=${backendSource}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.opsToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || 'Failed to run scout' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Run Scout API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
