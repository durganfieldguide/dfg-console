import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const SCOUT_BASE_URL = process.env.SCOUT_API_URL || 'https://dfg-scout.automation-ab6.workers.dev';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.opsToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids array is required' },
        { status: 400 }
      );
    }

    // Reject each listing
    const results = await Promise.allSettled(
      ids.map(async (id: string) => {
        const response = await fetch(`${SCOUT_BASE_URL}/ops/listings/${id}/status`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${session.opsToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'rejected' }),
        });

        if (!response.ok) {
          throw new Error(`Failed to reject ${id}`);
        }

        return response.json();
      })
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      rejected: succeeded,
      failed,
    });
  } catch (error) {
    console.error('Reject API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
