import { PublicKey } from '@solana/web3.js';

import {
  actionIcon,
  actionJson,
  actionOptions,
  fetchPool,
  formatTokenAmount,
  getApiBaseUrl,
  getBaseUrl,
  isExpired,
  poolClaimAmount,
  remainingClaims,
  shortAddress,
} from '@/lib/actions';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return actionOptions();
}

export async function POST(
  request: Request,
  { params }: { params: { poolId: string } },
) {
  try {
    const body = await request.json().catch(() => ({}));
    const account = String(body?.account || '').trim();

    if (!account) {
      return actionJson({ message: 'Connect a wallet to claim this blink.' }, 400);
    }

    try {
      new PublicKey(account);
    } catch {
      return actionJson({ message: 'The connected wallet is not a Solana address.' }, 400);
    }

    const poolData = await fetchPool(params.poolId);
    const { pool, redeemed } = poolData;

    if (!pool) {
      return actionJson({ message: 'This redeemable token link could not be found.' }, 404);
    }

    if (isExpired(pool)) {
      return actionJson({ message: 'This blink has expired.' }, 410);
    }

    if (remainingClaims(pool, redeemed) <= 0) {
      return actionJson({ message: 'All claims have already been redeemed.' }, 410);
    }

    const alreadyClaimed = redeemed.some(
      (item) => item.user_wallet === account,
    );

    if (alreadyClaimed) {
      return actionJson({ message: 'This wallet already claimed this blink.' }, 400);
    }

    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      return actionJson({ message: 'NEXT_PUBLIC_API_URL is not configured' }, 500);
    }

    const redeemResponse = await fetch(
      `${apiBaseUrl}/api/v2/desktop/wallet/redeemToken`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userWallet: account,
          poolId: params.poolId,
        }),
        cache: 'no-store',
      },
    );

    const redeemBody = await redeemResponse.json().catch(() => null);

    if (!redeemResponse.ok) {
      return actionJson(
        {
          message:
            redeemBody?.message ||
            redeemBody?.error ||
            'Failed to claim this blink.',
        },
        redeemResponse.status,
      );
    }

    const baseUrl = getBaseUrl(request);
    const claimAmount = poolClaimAmount(pool);
    const claimLabel = `${formatTokenAmount(claimAmount)} ${pool.token_symbol}`;
    const description = `${claimLabel} is being sent to ${shortAddress(account)}.`;

    return actionJson({
      type: 'post',
      message: `Claimed ${claimLabel}`,
      links: {
        next: {
          type: 'inline',
          action: {
            type: 'completed',
            icon: actionIcon(pool, baseUrl),
            title: 'Blink claimed',
            description,
            label: 'Claimed',
            disabled: true,
          },
        },
      },
    });
  } catch (error) {
    const status =
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      typeof error.status === 'number'
        ? error.status
        : 500;
    const message =
      error instanceof Error ? error.message : 'Failed to claim this blink.';
    return actionJson({ message }, status);
  }
}
