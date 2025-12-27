import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const SCOUT_BASE_URL = process.env.SCOUT_API_URL || 'https://dfg-scout.automation-ab6.workers.dev';

// POST - Store analysis result
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.opsToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${SCOUT_BASE_URL}/ops/analysis`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.opsToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || 'Failed to store analysis' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Store analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
