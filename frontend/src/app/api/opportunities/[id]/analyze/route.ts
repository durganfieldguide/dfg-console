import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const API_BASE_URL = process.env.DFG_API_URL || 'https://dfg-api.automation-ab6.workers.dev';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.opsToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Body is optional (for passing assumptions)
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine
    }

    const response = await fetch(`${API_BASE_URL}/api/opportunities/${encodeURIComponent(id)}/analyze`, {
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
        { error: error || 'Failed to analyze opportunity' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Analyze API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
