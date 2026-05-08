import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiBaseUrl) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_API_URL is not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '')
      .trim()
      .toLowerCase()
      .replace(/^@/, '')
      .replace(/\.swop\.id$/, '')
      .replace(/[^a-z0-9_]/g, '');

    if (query.length < 2) {
      return NextResponse.json({ data: { results: [] } });
    }

    const limit = searchParams.get('limit') || '6';
    const apiUrl = new URL(`${apiBaseUrl}/api/v1/user/search-swop-id`);
    apiUrl.searchParams.set('q', query);
    apiUrl.searchParams.set('limit', limit);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch Swop ID suggestions' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching Swop ID suggestions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
