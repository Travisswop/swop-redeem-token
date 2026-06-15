import { NextResponse } from 'next/server';

export const ACTION_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, Content-Encoding, Accept-Encoding',
};

export interface RedemptionPool {
  pool_id: string;
  total_amount: string | number;
  remaining_amount: string | number;
  token_name: string;
  token_symbol: string;
  token_mint: string;
  token_decimals: number;
  tokens_per_wallet: string | number;
  max_wallets: number;
  token_logo?: string | null;
  expires_at?: string | null;
  created_at?: string;
}

export interface RedemptionRecord {
  user_wallet: string;
  amount: string | number;
  redeemed_at?: string;
}

export interface PoolResponse {
  pool: RedemptionPool | null;
  redeemed: RedemptionRecord[];
}

export function actionJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: ACTION_HEADERS,
  });
}

export function actionOptions() {
  return new NextResponse(null, {
    status: 204,
    headers: ACTION_HEADERS,
  });
}

export function getBaseUrl(request: Request) {
  return new URL(request.url).origin;
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || '';
}

export function formatUnits(amount: string | number, decimals: number) {
  const value = Number(amount) / Math.pow(10, decimals || 0);
  if (!Number.isFinite(value)) return 0;
  return value;
}

export function formatTokenAmount(amount: number) {
  if (!Number.isFinite(amount)) return '0';
  if (amount === 0) return '0';
  return amount.toLocaleString('en-US', {
    maximumFractionDigits: amount >= 1 ? 4 : 8,
  });
}

export function isExpired(pool: RedemptionPool) {
  return !!pool.expires_at && new Date(pool.expires_at).getTime() < Date.now();
}

export function poolClaimAmount(pool: RedemptionPool) {
  return formatUnits(pool.tokens_per_wallet, pool.token_decimals);
}

export function remainingClaims(pool: RedemptionPool, redeemed: RedemptionRecord[]) {
  const remainingAmount = formatUnits(pool.remaining_amount, pool.token_decimals);
  const amountPerWallet = poolClaimAmount(pool);
  const remainingBySupply =
    amountPerWallet > 0 ? Math.floor(remainingAmount / amountPerWallet) : 0;
  const remainingByWallets = Math.max(
    0,
    Number(pool.max_wallets || 0) - redeemed.length,
  );
  return Math.max(0, Math.min(remainingBySupply, remainingByWallets));
}

export function actionIcon(pool: RedemptionPool | null, baseUrl: string) {
  const candidate = pool?.token_logo?.trim();
  if (candidate) {
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.toString();
      }
    } catch {
      // Fall through to the Swop icon.
    }
  }
  return new URL('/swop-icon.svg', baseUrl).toString();
}

export function shortAddress(address: string) {
  return address.length > 10
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : address;
}

export async function fetchPool(poolId: string): Promise<PoolResponse> {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    throw Object.assign(new Error('NEXT_PUBLIC_API_URL is not configured'), {
      status: 500,
    });
  }

  const response = await fetch(
    `${apiBaseUrl}/api/v2/desktop/wallet/getRedeemTokenFromPool/${encodeURIComponent(
      poolId,
    )}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    },
  );

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw Object.assign(
      new Error(body?.message || body?.error || 'Failed to fetch blink'),
      { status: response.status },
    );
  }

  return {
    pool: body?.data?.pool ?? null,
    redeemed: body?.data?.redeemed ?? [],
  };
}

export function buildActionResponse(
  poolId: string,
  data: PoolResponse,
  baseUrl: string,
) {
  const { pool, redeemed } = data;

  if (!pool) {
    return {
      type: 'action',
      icon: new URL('/swop-icon.svg', baseUrl).toString(),
      title: 'Swop blink unavailable',
      description: 'This redeemable token link could not be found.',
      label: 'Unavailable',
      disabled: true,
      error: { message: 'This redeemable token link could not be found.' },
    };
  }

  const claimAmount = poolClaimAmount(pool);
  const claimLabel = `${formatTokenAmount(claimAmount)} ${pool.token_symbol}`;
  const claimsLeft = remainingClaims(pool, redeemed);
  const expired = isExpired(pool);
  const disabled = expired || claimsLeft <= 0;
  const statusText = expired
    ? 'This blink has expired.'
    : disabled
      ? 'All claims have already been redeemed.'
      : `${claimsLeft} claim${claimsLeft === 1 ? '' : 's'} remaining.`;

  return {
    type: 'action',
    icon: actionIcon(pool, baseUrl),
    title: `Claim ${claimLabel}`,
    description: `Redeem ${claimLabel} from Swop. ${statusText}`,
    label: disabled ? 'Unavailable' : 'Claim Tokens',
    disabled,
    links: {
      actions: [
        {
          type: 'post',
          label: disabled ? 'Unavailable' : 'Claim Tokens',
          href: `/api/actions/redeem/${encodeURIComponent(poolId)}/claim`,
        },
        {
          type: 'external-link',
          label: 'Open Claim Page',
          href: new URL(`/${encodeURIComponent(poolId)}`, baseUrl).toString(),
        },
      ],
    },
    error: disabled ? { message: statusText } : undefined,
  };
}
