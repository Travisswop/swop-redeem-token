'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import toast from 'react-hot-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { PublicKey } from '@solana/web3.js';

interface RedeemPageProps {
  params: {
    poolId: string;
  };
}

interface RedemptionPool {
  pool_id: string;
  temp_account_private_key: string;
  total_amount: number;
  remaining_amount: number;
  token_name: string;
  token_symbol: string;
  token_mint: string;
  token_decimals: number;
  tokens_per_wallet: number;
  max_wallets: number;
  token_logo: string;
  created_at: string;
  expires_at: string | null;
}

interface RedeemedPool {
  amount: string;
  user_wallet: string;
}

const validateSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
};

async function fetchReceiverWallet(ensName: string): Promise<string> {
  if (!ensName) return '';

  if (ensName.endsWith('.swop.id')) {
    const url = `/api/proxy/getEnsAddress/${ensName}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch ENS address');
    }
    const data = await response.json();

    return data.addresses['501'];
  } else {
    // Handle Solana address
    if (!validateSolanaAddress(ensName)) {
      throw new Error('Invalid Solana address');
    }
    return ensName;
  }
}

// Debounce hook for search optimization
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function RedeemPage({ params }: RedeemPageProps) {
  const { poolId } = params;
  const { publicKey, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const [pool, setPool] = useState<RedemptionPool | null>(null);
  const [redeemedPool, setRedeemedPool] = useState<RedeemedPool[]>(
    []
  );
  const [isManualInput, setIsManualInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string>('');

  // Debounce the search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Memoize the wallet validation
  const isValidWallet = useMemo(() => {
    if (!searchResult) return false;
    return validateSolanaAddress(searchResult);
  }, [searchResult]);

  // Memoize the redemption status
  const hasRedeemed = useMemo(() => {
    if (!searchResult && !publicKey) return false;
    const walletToCheck = searchResult || publicKey?.toBase58();
    return redeemedPool.some(
      (item) => item.user_wallet === walletToCheck
    );
  }, [searchResult, publicKey, redeemedPool]);

  // Memoize remaining redemptions
  const remainingRedemptions = useMemo(() => {
    return pool ? pool.max_wallets - redeemedPool.length : 0;
  }, [pool, redeemedPool]);

  // Search effect
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearchQuery.trim()) {
        setSearchResult('');
        setSearchError('');
        return;
      }

      setIsSearching(true);
      setSearchError('');

      try {
        const result = await fetchReceiverWallet(
          debouncedSearchQuery
        );
        setSearchResult(result);
      } catch (error: any) {
        setSearchError(
          error.message || 'Invalid address or ENS name'
        );
        setSearchResult('');
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery]);

  // Pool fetching effect
  useEffect(() => {
    if (connected || isManualInput) {
      fetchPool();
    }
  }, [connected, isManualInput]);

  const fetchPool = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/proxy/getRedeemTokenFromPool/${poolId}`
      );

      if (response.ok) {
        const { data } = await response.json();
        setPool(data.pool);
        setRedeemedPool(data.redeemed);
      } else {
        toast.error('Failed to fetch pool details');
      }
    } catch (error) {
      toast.error('Failed to fetch pool details');
    }
  }, [poolId]);

  const formatAmount = useCallback(
    (amount: number, decimals: number) => {
      return (amount / Math.pow(10, decimals)).toFixed(2);
    },
    []
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  const handleRedeem = useCallback(async () => {
    const walletToUse = isManualInput
      ? searchResult
      : publicKey?.toBase58();

    if (!walletToUse || !pool) {
      toast.error('Please provide a valid wallet address');
      return;
    }

    if (isManualInput && !isValidWallet) {
      toast.error('Invalid Solana address');
      return;
    }

    if (hasRedeemed) {
      toast.error('Maximum redemption limit reached for this wallet');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/proxy/redeemToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userWallet: walletToUse,
          poolId: pool.pool_id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Successfully redeemed ${formatAmount(
            pool.tokens_per_wallet,
            pool.token_decimals
          )} ${pool.token_name}!`
        );
        setRedeemed(true);
        await fetchPool();
      } else {
        toast.error(data.message || 'Failed to redeem tokens');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to redeem tokens');
    } finally {
      setLoading(false);
    }
  }, [
    isManualInput,
    searchResult,
    publicKey,
    pool,
    isValidWallet,
    hasRedeemed,
    formatAmount,
    fetchPool,
  ]);

  if (redeemed && pool) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium">
                Tokens Redeemed Successfully!
              </h3>
              <div className="mt-4 flex items-center justify-center space-x-2">
                {pool.token_logo && (
                  <div className="relative h-8 w-8">
                    <Image
                      src={pool.token_logo}
                      alt={pool.token_name}
                      fill
                      className="rounded-full"
                    />
                  </div>
                )}
                <p className="text-xl font-semibold">
                  {formatAmount(
                    pool.tokens_per_wallet,
                    pool.token_decimals
                  )}{' '}
                  {pool.token_name}
                </p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                The tokens have been transferred to your wallet
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!connected && !isManualInput) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <svg
                  className="h-6 w-6 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium">
                Connect Your Wallet
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Connect your Solana wallet or enter your wallet
                address to redeem tokens
              </p>
              <div className="mt-4 space-y-4">
                <WalletMultiButton
                  style={{
                    backgroundColor: 'white',
                    color: 'black',
                    border: '1px solid black',
                  }}
                />
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      or
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsManualInput(true)}
                >
                  Enter Wallet Address
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-lg">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            {pool.token_logo && (
              <div className="relative h-12 w-12">
                <Image
                  src={pool.token_logo}
                  alt={pool.token_name}
                  fill
                  className="rounded-full"
                />
              </div>
            )}
            <div>
              <CardTitle className="text-2xl">
                Redeem {pool.token_name}
              </CardTitle>
              <CardDescription>
                {remainingRedemptions} redemptions remaining
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="p-4 bg-muted/50 rounded-lg">
              {isManualInput ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Enter Wallet Address or ENS Name
                    </p>
                    <Input
                      placeholder="e.g., wallet address or name.swop.id"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      className={searchError ? 'border-red-500' : ''}
                    />
                  </div>

                  {/* Search Status Indicators */}
                  {isSearching && (
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                      <span>Searching...</span>
                    </div>
                  )}

                  {searchResult && !searchError && (
                    <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-xs text-green-700 font-medium">
                        Found wallet:
                      </p>
                      <p className="text-xs text-green-600 break-all font-mono">
                        {searchResult}
                      </p>
                    </div>
                  )}

                  {searchError && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-xs text-red-700">
                        {searchError}
                      </p>
                    </div>
                  )}

                  {hasRedeemed && (
                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-xs text-yellow-700">
                        This wallet has already redeemed tokens from
                        this pool
                      </p>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsManualInput(false);
                      setSearchQuery('');
                      setSearchResult('');
                      setSearchError('');
                    }}
                  >
                    Switch to Wallet Connection
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Connected Wallet
                  </p>
                  <p className="text-sm font-medium truncate">
                    {publicKey?.toBase58().slice(0, 8)}...
                    {publicKey?.toBase58().slice(-4)}
                  </p>
                  {hasRedeemed && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-xs text-yellow-700">
                        This wallet has already redeemed tokens from
                        this pool
                      </p>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setIsManualInput(true)}
                  >
                    Switch to Manual Input
                  </Button>
                </div>
              )}
            </div>

            <Button
              onClick={handleRedeem}
              disabled={
                loading ||
                remainingRedemptions === 0 ||
                hasRedeemed ||
                (isManualInput && (!searchResult || !isValidWallet))
              }
              className="w-full h-12 text-lg"
              variant="outline"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Redeeming...</span>
                </div>
              ) : remainingRedemptions === 0 ? (
                'No redemptions remaining'
              ) : hasRedeemed ? (
                'Already redeemed'
              ) : (
                `Redeem ${formatAmount(
                  pool.tokens_per_wallet,
                  pool.token_decimals
                )} ${pool.token_symbol}`
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
