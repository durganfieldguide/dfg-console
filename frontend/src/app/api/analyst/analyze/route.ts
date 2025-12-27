import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// Use production worker URL
const ANALYST_BASE_URL = process.env.ANALYST_API_URL || 'https://dfg-analyst.automation-ab6.workers.dev';

// Extend timeout for analysis (worker takes ~15s)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${ANALYST_BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || 'Failed to analyze listing' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      ...data,
      listing_id: `${body.source}:${body.lot_id}`,
    });
  } catch (error) {
    console.error('Analyze API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
