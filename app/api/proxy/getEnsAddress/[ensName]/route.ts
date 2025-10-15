import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { ensName: string } }
) {
  try {
    const { ensName } = params;

    if (!ensName) {
      return NextResponse.json(
        { error: 'ENS name is required' },
        { status: 400 }
      );
    }

    if (ensName.endsWith('.swop.id')) {
      const apiUrl = `https://app.apiswop.co/api/v4/wallet/getEnsAddress/${ensName}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch ENS address' },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } else {
      // Handle Solana address validation
      return NextResponse.json({ addresses: { '501': ensName } });
    }
  } catch (error) {
    console.error('Error fetching ENS address:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
