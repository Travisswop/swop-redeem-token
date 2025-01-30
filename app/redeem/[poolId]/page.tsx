'use client';

import { useEffect, useState } from 'react';
import {
  useWallet,
  useConnection,
} from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Transaction } from '@solana/web3.js';
import toast from 'react-hot-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

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

export default function RedeemPage({ params }: RedeemPageProps) {
  const { poolId } = params;
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const [pool, setPool] = useState<RedemptionPool | null>(null);
  const [redemptionsLeft, setRedemptionsLeft] = useState<number>(0);

  useEffect(() => {
    fetchPool();
  }, []);

  const fetchPool = async () => {
    try {
      const response = await fetch(`/api/redeem/${poolId}`);
      const data = await response.json();
      if (data.success) {
        setPool(data.pool);
        // Calculate redemptions left
        const totalRedemptions = data.pool.total_redemptions || 0;
        setRedemptionsLeft(data.pool.max_wallets - totalRedemptions);
      } else {
        toast.error(data.message || 'Failed to fetch pool details');
      }
    } catch (error) {
      console.error('Error fetching pool:', error);
      toast.error('Failed to fetch pool details');
    }
  };

  const formatAmount = (amount: number, decimals: number) => {
    return (amount / Math.pow(10, decimals)).toFixed(2);
  };

  const handleRedeem = async () => {
    if (!publicKey || !pool) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/wallet/redeemSwop`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userWallet: publicKey.toBase58(),
            amount: pool.tokens_per_wallet,
            privateKey: pool.temp_account_private_key,
            tokenMint: pool.token_mint,
          }),
        }
      );

      if (response.ok) {
        // Deserialize the signed transaction
        // const transaction = Transaction.from(
        //   Buffer.from(data.signedTransaction, 'base64')
        // );

        // // Send the signed transaction
        // const signature = await connection.sendRawTransaction(
        //   transaction.serialize()
        // );

        // // Wait for confirmation
        // const confirmation = await connection.confirmTransaction(
        //   signature,
        //   'confirmed'
        // );

        // if (confirmation.value.err) {
        //   throw new Error('Failed to confirm transaction');
        // }

        toast.success(
          `Successfully redeemed ${formatAmount(
            pool.tokens_per_wallet,
            pool.token_decimals
          )} ${pool.token_name}!`
        );
        setRedeemed(true);
        await fetchPool(); // Refresh pool data
      } else {
        toast.error('Failed to redeem tokens');
      }
    } catch (error: any) {
      console.error('Error redeeming tokens:', error);
      toast.error(error.message || 'Failed to redeem tokens');
    } finally {
      setLoading(false);
    }
  };

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

  if (!connected) {
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
                Connect your Solana wallet to redeem tokens
              </p>
              <div className="mt-4">
                <WalletMultiButton />
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
                {redemptionsLeft} redemptions remaining
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">
                  Connected Wallet
                </p>
                <p className="text-sm font-medium truncate">
                  {publicKey?.toBase58().slice(0, 8)}...
                  {publicKey?.toBase58().slice(-4)}
                </p>
              </div>
            </div>

            <Button
              onClick={handleRedeem}
              disabled={loading}
              className="w-full h-12 text-lg"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Redeeming...</span>
                </div>
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
