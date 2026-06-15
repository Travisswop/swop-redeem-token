'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { PublicKey } from '@solana/web3.js';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import {
  getTokenImageFallbackSrc,
  resolveTokenImageSrc,
} from '@/lib/tokenImages';

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

type DestinationType = 'swop' | 'wallet' | null;


const ACCENT = '#00ff88';
const MONO =
  '"JetBrains Mono", "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
const STABLE_SYMBOLS = new Set(['USDC', 'USDT', 'DAI', 'PYUSD', 'FDUSD']);

const validateSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
};

const shortenAddress = (address?: string) => {
  if (!address) return '';
  return `${address.slice(0, 8)}...${address.slice(-4)}`;
};

const cleanSwopId = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/\.swop\.id$/, '')
    .replace(/[^a-z0-9_]/g, '');

const getDestinationType = (value: string): DestinationType => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (validateSolanaAddress(trimmed)) return 'wallet';
  return cleanSwopId(trimmed).length > 0 ? 'swop' : null;
};

const getSwopLookupName = (value: string) => `${cleanSwopId(value)}.swop.id`;

async function fetchReceiverWallet(input: string): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed) return '';

  if (validateSolanaAddress(trimmed)) {
    return trimmed;
  }

  const swopName = getSwopLookupName(trimmed);
  const username = cleanSwopId(swopName);

  if (username.length < 3 || username.length > 30) {
    throw new Error('Enter a swop.id username or a Solana wallet.');
  }

  const response = await fetch(`/api/proxy/getEnsAddress/${swopName}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('That swop.id could not be resolved.');
  }

  const data = await response.json();
  const wallet = data?.addresses?.['501'];

  if (!wallet || !validateSolanaAddress(wallet)) {
    throw new Error('No Solana wallet found for that swop.id.');
  }

  return wallet;
}


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
  const [redeemedPool, setRedeemedPool] = useState<RedeemedPool[]>([]);
  const [destination, setDestination] = useState('');
  const [resolvedWallet, setResolvedWallet] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [destinationError, setDestinationError] = useState('');
  const [poolFetched, setPoolFetched] = useState(false);
  const [poolNotFound, setPoolNotFound] = useState(false);
  const [poolLoadError, setPoolLoadError] = useState('');
  const [tokenImageFailed, setTokenImageFailed] = useState(false);

  const debouncedDestination = useDebounce(destination, 450);

  const fetchPool = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/proxy/getRedeemTokenFromPool/${poolId}`,
        { cache: 'no-store' }
      );

      if (response.ok) {
        const { data } = await response.json();
        if (!data.pool) {
          setPoolNotFound(true);
        } else {
          setPoolLoadError('');
          setPoolNotFound(false);
          setPool(data.pool);
          setRedeemedPool(data.redeemed);
        }
      } else if (response.status === 404) {
        setPoolNotFound(true);
      } else {
        setPoolLoadError('We could not load this drop right now.');
      }
    } catch (error) {
      setPoolLoadError('We could not load this drop right now.');
    } finally {
      setPoolFetched(true);
    }
  }, [poolId]);

  const formatAmount = useCallback((amount: number, decimals: number) => {
    const value = amount / Math.pow(10, decimals);
    return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
  }, []);

  const claimAmount = useMemo(() => {
    if (!pool) return '';
    return formatAmount(pool.tokens_per_wallet, pool.token_decimals);
  }, [formatAmount, pool]);

  const prizeAmount = useMemo(() => {
    if (!pool) return '';
    return STABLE_SYMBOLS.has(pool.token_symbol.toUpperCase())
      ? `$${claimAmount}`
      : claimAmount;
  }, [claimAmount, pool]);

  const destinationType = useMemo(
    () => getDestinationType(destination),
    [destination]
  );

  const swopUsername = useMemo(() => cleanSwopId(destination), [destination]);

  const destinationLabel = useMemo(() => {
    if (!destination.trim()) return '';
    if (destinationType === 'wallet') return shortenAddress(destination.trim());
    return `@${swopUsername}.swop.id`;
  }, [destination, destinationType, swopUsername]);

  const hasRedeemed = useMemo(() => {
    if (!resolvedWallet) return false;
    return redeemedPool.some((item) => item.user_wallet === resolvedWallet);
  }, [resolvedWallet, redeemedPool]);

  const remainingRedemptions = useMemo(() => {
    return pool ? Math.max(pool.max_wallets - redeemedPool.length, 0) : 0;
  }, [pool, redeemedPool]);

  const dropId = useMemo(() => {
    const id = pool?.pool_id || poolId;
    return id.slice(0, 9).toUpperCase();
  }, [pool?.pool_id, poolId]);

  const expiryLabel = useMemo(() => getExpiryLabel(pool?.expires_at), [pool]);
  const tokenImageSrc = useMemo(
    () => resolveTokenImageSrc(pool?.token_logo, pool?.token_symbol),
    [pool?.token_logo, pool?.token_symbol]
  );
  const tokenImageFallbackSrc = useMemo(
    () => getTokenImageFallbackSrc(pool?.token_symbol),
    [pool?.token_symbol]
  );
  const displayedTokenImageSrc = tokenImageFailed
    ? tokenImageFallbackSrc
    : tokenImageSrc;

  useEffect(() => {
    setTokenImageFailed(false);
  }, [tokenImageSrc]);

  useEffect(() => {
    fetchPool();
  }, [fetchPool]);

  useEffect(() => {
    let active = true;

    const resolveDestination = async () => {
      const value = debouncedDestination.trim();

      if (!value) {
        if (active) {
          setResolvedWallet('');
          setDestinationError('');
          setIsResolving(false);
        }
        return;
      }

      const type = getDestinationType(value);

      if (type === 'swop') {
        const username = cleanSwopId(value);
        if (username.length < 3) {
          if (active) {
            setResolvedWallet('');
            setDestinationError('Username must be at least 3 characters.');
            setIsResolving(false);
          }
          return;
        }
      }

      setIsResolving(true);
      setDestinationError('');

      try {
        const wallet = await fetchReceiverWallet(value);
        if (active) {
          setResolvedWallet(wallet);
          setDestinationError('');
        }
      } catch (error: any) {
        if (active) {
          setResolvedWallet('');
          setDestinationError(
            error.message || 'Enter a swop.id username or a Solana wallet.'
          );
        }
      } finally {
        if (active) {
          setIsResolving(false);
        }
      }
    };

    resolveDestination();

    return () => {
      active = false;
    };
  }, [debouncedDestination]);

  const handleDestinationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDestination(e.target.value);
      setRedeemed(false);
    },
    []
  );

  const handleUseConnectedWallet = useCallback(() => {
    const walletAddress = publicKey?.toBase58();
    if (!walletAddress) return;

    setDestination(walletAddress);
    setResolvedWallet(walletAddress);
    setDestinationError('');
    setRedeemed(false);
  }, [publicKey]);

  const handleRedeem = useCallback(async () => {
    if (!resolvedWallet || !pool) {
      toast.error('Paste a valid swop.id or Solana wallet first');
      return;
    }

    if (hasRedeemed) {
      toast.error('This wallet already claimed this drop');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/proxy/redeemToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userWallet: resolvedWallet,
          poolId: pool.pool_id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Claimed ${claimAmount} ${pool.token_symbol}`);
        setRedeemed(true);
        await fetchPool();
      } else {
        toast.error(data.error || 'Failed to claim drop');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to claim drop');
    } finally {
      setLoading(false);
    }
  }, [claimAmount, fetchPool, hasRedeemed, pool, resolvedWallet]);

  const resetClaim = useCallback(() => {
    setRedeemed(false);
    setDestination('');
    setResolvedWallet('');
    setDestinationError('');
  }, []);

  if (!poolFetched) {
    return (
      <TerminalShell>
        <StatusPanel
          icon={<Loader2 className="h-6 w-6 animate-spin" />}
          title="Loading drop"
          description="Checking this redeem link and available supply."
        />
      </TerminalShell>
    );
  }

  if (poolNotFound) {
    return (
      <TerminalShell>
        <StatusPanel
          icon={<AlertTriangle className="h-6 w-6" />}
          title="Redeem link not found"
          description="This drop does not exist or may have expired."
          tone="danger"
        />
      </TerminalShell>
    );
  }

  if (poolLoadError) {
    return (
      <TerminalShell>
        <StatusPanel
          icon={<AlertTriangle className="h-6 w-6" />}
          title="Drop unavailable"
          description={`${poolLoadError} Please try again in a moment.`}
          tone="danger"
        />
      </TerminalShell>
    );
  }

  if (!pool) {
    return (
      <TerminalShell>
        <StatusPanel
          icon={<Loader2 className="h-6 w-6 animate-spin" />}
          title="Loading drop"
          description="Preparing this claim."
        />
      </TerminalShell>
    );
  }

  return (
    <TerminalShell>
      <div className="terminal-card">
          <header className="topbar">
            <div className="brand">
            <Image
              src="/swop-wordmark-white.png"
              alt="Swop"
              width={76}
              height={26}
              className="brand-logo"
              priority
            />
            <span className="slash">/</span>
            <span className="section-word">REDEEM</span>
          </div>
          <div className="expires">
            <span>EXPIRES</span>
            <strong>{expiryLabel}</strong>
          </div>
        </header>

        <div className="drop-strip">
          <span>DROP #{dropId}</span>
          <span>FROM @swop</span>
        </div>

        <section className="prize-card">
          <div className="glow" />
          <Sparkles />
          <div className="prize-content">
            <div className="drop-type">
              {STABLE_SYMBOLS.has(pool.token_symbol.toUpperCase())
                ? 'STABLECOIN DROP'
                : 'TOKEN DROP'}
            </div>
            <div className="prize-row">
              <div>
                <h1>{prizeAmount}</h1>
                <p>
                  in {pool.token_symbol}, ready to trade
                </p>
              </div>
              <div className="token-mark">
                <Image
                  src={displayedTokenImageSrc}
                  alt={pool.token_name || pool.token_symbol}
                  fill
                  sizes="58px"
                  className="rounded-full object-contain p-1"
                  onError={() => setTokenImageFailed(true)}
                />
              </div>
            </div>
            <div className="description">
              A welcome drop from Swop. Spend it, swap it, or stake it
              on a market - your call.
            </div>
          </div>
        </section>

        {redeemed ? (
          <ClaimedState
            destinationLabel={destinationLabel}
            prizeAmount={prizeAmount}
            tokenSymbol={pool.token_symbol}
            resetClaim={resetClaim}
          />
        ) : remainingRedemptions === 0 ? (
          <section className="drop-empty">
            <div className="drop-empty-icon">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h2>Drop is empty</h2>
            <p>All tokens have been claimed. This drop has no remaining supply.</p>
          </section>
        ) : (
          <section className="claim-form">
            <div className="input-label">
              -- PASTE YOUR SWOP.ID OR WALLET
            </div>

            <div
              className={`destination-box ${
                resolvedWallet && !destinationError ? 'valid' : ''
              } ${destinationError ? 'invalid' : ''}`}
            >
              <span className="prefix">
                {destinationType === 'wallet' ? '#' : '@'}
              </span>
              <input
                value={destination}
                onChange={handleDestinationChange}
                placeholder="yourname or wallet"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <span className="suffix">
                {destinationType === 'wallet' ? 'wallet' : '.swop.id'}
              </span>
            </div>

            <div className="hint-line">
              {isResolving && (
                <span>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  resolving destination
                </span>
              )}
              {!isResolving && !destination.trim() && (
                <span>
                  No swop.id yet? Get one free in the{' '}
                  <a
                    href="https://swopme.co"
                  >
                    Swop app
                  </a>
                  .
                </span>
              )}
              {!isResolving && destinationError && (
                <span className="error">{destinationError}</span>
              )}
              {!isResolving && resolvedWallet && !destinationError && (
                <span className="ok">
                  <Check className="h-3.5 w-3.5" />
                  Will deliver to {destinationLabel}
                </span>
              )}
            </div>

            {resolvedWallet && (
              <div className="resolved-wallet">
                <span>ROUTE</span>
                <strong>{shortenAddress(resolvedWallet)}</strong>
              </div>
            )}

            {hasRedeemed && (
              <div className="already-claimed">
                This destination already claimed this drop.
              </div>
            )}

            <div className="wallet-option">
              <div>
                <span>WALLET OPTION</span>
                <strong>
                  {connected && publicKey
                    ? shortenAddress(publicKey.toBase58())
                    : 'connect instead'}
                </strong>
              </div>
              {connected && publicKey ? (
                <button
                  className="connected-wallet-button"
                  onClick={handleUseConnectedWallet}
                  type="button"
                >
                  USE CONNECTED
                </button>
              ) : (
                <div className="terminal-wallet-button">
                  <WalletMultiButton />
                </div>
              )}
            </div>

            <button
              className="claim-button"
              disabled={
                loading ||
                isResolving ||
                !resolvedWallet ||
                !!destinationError ||
                hasRedeemed ||
                remainingRedemptions === 0
              }
              onClick={handleRedeem}
            >
              {loading ? (
                <span>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  CLAIMING
                </span>
              ) : remainingRedemptions === 0 ? (
                'DROP EMPTY'
              ) : hasRedeemed ? (
                'ALREADY CLAIMED'
              ) : (
                'CLAIM DROP ->'
              )}
            </button>
          </section>
        )}

        <footer className="terminal-footer">
          <span>
            <b>{'>'}</b> social wallet / self-custody
          </span>
          <span>SOLANA</span>
        </footer>
      </div>

      <style jsx>{`
        .terminal-card {
          width: 100%;
          min-height: 0;
          background: #000;
          background-image: radial-gradient(
              ellipse 90% 50% at 50% 20%,
              rgba(0, 255, 136, 0.1) 0%,
              transparent 60%
            ),
            radial-gradient(
              ellipse 80% 40% at 50% 100%,
              rgba(0, 255, 136, 0.04) 0%,
              transparent 60%
            ),
            repeating-linear-gradient(
              0deg,
              transparent 0,
              transparent 2px,
              rgba(255, 255, 255, 0.014) 3px,
              transparent 4px
            );
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          color: #fff;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 18px 20px 16px;
          box-shadow: 0 26px 80px rgba(0, 0, 0, 0.55);
        }

        .topbar,
        .drop-strip,
        .terminal-footer,
        .expires,
        .input-label,
        .hint-line,
        .resolved-wallet,
        .drop-type {
          font-family: ${MONO};
        }

        .topbar {
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.09);
          display: flex;
          justify-content: space-between;
          padding-bottom: 14px;
        }

        .brand {
          align-items: center;
          display: flex;
          gap: 10px;
          min-width: 0;
        }

        .slash {
          color: rgba(255, 255, 255, 0.25);
          font-size: 12px;
        }

        .section-word {
          color: rgba(255, 255, 255, 0.55);
          font-size: 10px;
          letter-spacing: 0.08em;
        }

        .expires {
          align-items: center;
          color: rgba(255, 255, 255, 0.42);
          display: flex;
          font-size: 10px;
          gap: 10px;
          white-space: nowrap;
        }

        .expires strong {
          color: ${ACCENT};
          font-weight: 600;
        }

        .drop-strip {
          color: rgba(255, 255, 255, 0.45);
          display: flex;
          font-size: 10px;
          justify-content: space-between;
          letter-spacing: 0.08em;
          margin-top: 18px;
        }

        .prize-card {
          background: linear-gradient(
            160deg,
            rgba(0, 255, 136, 0.16) 0%,
            rgba(0, 255, 136, 0.04) 52%,
            transparent 100%
          );
          border: 1px solid rgba(0, 255, 136, 0.34);
          border-radius: 14px;
          margin-top: 14px;
          min-height: 0;
          overflow: hidden;
          padding: 24px 18px 22px;
          position: relative;
        }

        .glow {
          animation: drift 7s linear infinite;
          background: radial-gradient(
            ellipse,
            rgba(0, 255, 136, 0.14) 0%,
            transparent 62%
          );
          height: 170%;
          left: -30%;
          pointer-events: none;
          position: absolute;
          top: -38%;
          width: 70%;
        }

        .prize-content {
          position: relative;
          z-index: 1;
        }

        .drop-type {
          color: ${ACCENT};
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.22em;
        }

        .prize-row {
          align-items: flex-start;
          display: flex;
          gap: 18px;
          justify-content: space-between;
          margin-top: 18px;
        }

        .prize-row h1 {
          color: #fff;
          font-size: 64px;
          font-weight: 950;
          letter-spacing: -0.06em;
          line-height: 0.9;
          text-shadow: 0 0 28px rgba(0, 255, 136, 0.24);
        }

        .prize-row p {
          color: rgba(255, 255, 255, 0.72);
          font-size: 16px;
          font-weight: 500;
          margin-top: 8px;
        }

        .token-mark {
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 999px;
          flex: 0 0 auto;
          height: 58px;
          overflow: hidden;
          position: relative;
          width: 58px;
        }

        .description {
          border-top: 1px dashed rgba(0, 255, 136, 0.35);
          color: rgba(255, 255, 255, 0.56);
          font-size: 13px;
          line-height: 1.45;
          margin-top: 22px;
          padding-top: 16px;
        }

        .drop-empty {
          align-items: center;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 22px;
          padding: 32px 0 12px;
          text-align: center;
        }

        .drop-empty-icon {
          align-items: center;
          background: rgba(255, 80, 80, 0.1);
          border: 1px solid rgba(255, 80, 80, 0.28);
          border-radius: 999px;
          color: #ff6b6b;
          display: flex;
          height: 56px;
          justify-content: center;
          margin-bottom: 6px;
          width: 56px;
        }

        .drop-empty h2 {
          color: #fff;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .drop-empty p {
          color: rgba(255, 255, 255, 0.46);
          font-family: ${MONO};
          font-size: 11px;
          letter-spacing: 0.04em;
          line-height: 1.55;
          max-width: 280px;
        }

        .claim-form {
          margin-top: 22px;
        }

        .input-label {
          color: rgba(255, 255, 255, 0.5);
          font-size: 10px;
          letter-spacing: 0.18em;
          margin-bottom: 10px;
        }

        .destination-box {
          align-items: center;
          background: rgba(255, 255, 255, 0.035);
          border: 2px solid rgba(255, 255, 255, 0.14);
          border-radius: 10px;
          display: flex;
          min-height: 56px;
          overflow: hidden;
          transition: border-color 0.18s, box-shadow 0.18s;
        }

        .destination-box.valid {
          border-color: rgba(0, 255, 136, 0.52);
          box-shadow: 0 0 28px rgba(0, 255, 136, 0.1);
        }

        .destination-box.invalid {
          border-color: rgba(255, 80, 80, 0.52);
        }

        .prefix,
        .suffix,
        .destination-box input {
          font-family: ${MONO};
        }

        .prefix {
          color: rgba(255, 255, 255, 0.42);
          font-size: 18px;
          font-weight: 600;
          padding-left: 14px;
        }

        .destination-box input {
          background: transparent;
          border: none;
          color: #f7f7f7;
          flex: 1;
          font-size: 16px;
          font-weight: 700;
          min-width: 0;
          outline: none;
          padding: 14px 6px;
        }

        .destination-box input::placeholder {
          color: rgba(255, 255, 255, 0.62);
        }

        .suffix {
          color: rgba(255, 255, 255, 0.32);
          font-size: 12px;
          font-weight: 700;
          padding-right: 14px;
          white-space: nowrap;
        }

        .hint-line {
          color: rgba(255, 255, 255, 0.42);
          font-size: 10px;
          letter-spacing: 0.06em;
          margin-top: 18px;
          min-height: 18px;
        }

        .hint-line span,
        .claim-button span {
          align-items: center;
          display: inline-flex;
          gap: 8px;
        }

        .hint-line .ok {
          color: ${ACCENT};
        }

        .hint-line .error {
          color: #ff6b6b;
        }

        .hint-line a {
          color: ${ACCENT};
          cursor: pointer;
          pointer-events: auto;
          position: relative;
          text-decoration: none;
          z-index: 4;
        }

        .hint-line a:hover {
          text-decoration: underline;
        }

        .resolved-wallet {
          align-items: center;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.46);
          display: flex;
          font-size: 9px;
          justify-content: space-between;
          letter-spacing: 0.1em;
          margin-top: 12px;
          padding: 12px 14px;
        }

        .resolved-wallet strong {
          color: rgba(255, 255, 255, 0.68);
          font-weight: 600;
        }

        .wallet-option {
          align-items: center;
          background: rgba(255, 255, 255, 0.026);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          display: flex;
          gap: 14px;
          justify-content: space-between;
          margin-top: 12px;
          padding: 14px;
        }

        .wallet-option div:first-child {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .wallet-option span,
        .wallet-option strong,
        .connected-wallet-button {
          font-family: ${MONO};
        }

        .wallet-option span {
          color: rgba(255, 255, 255, 0.36);
          font-size: 12px;
          letter-spacing: 0.14em;
        }

        .wallet-option strong {
          color: rgba(255, 255, 255, 0.68);
          font-size: 9px;
          font-weight: 600;
        }

        .connected-wallet-button {
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid rgba(0, 255, 136, 0.32);
          border-radius: 10px;
          color: ${ACCENT};
          cursor: pointer;
          flex: 0 0 auto;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          padding: 11px 13px;
        }

        .terminal-wallet-button {
          flex: 0 0 auto;
        }

        .terminal-wallet-button :global(.wallet-adapter-button) {
          background: rgba(255, 255, 255, 0.06) !important;
          border: 1px solid rgba(255, 255, 255, 0.16) !important;
          border-radius: 10px !important;
          color: rgba(255, 255, 255, 0.78) !important;
          font-family: ${MONO} !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          height: 40px !important;
          letter-spacing: 0.08em !important;
          line-height: 1 !important;
          padding: 0 13px !important;
        }

        .terminal-wallet-button :global(.wallet-adapter-button-start-icon) {
          display: none !important;
        }

        .already-claimed {
          background: rgba(255, 191, 0, 0.08);
          border: 1px solid rgba(255, 191, 0, 0.22);
          border-radius: 12px;
          color: rgba(255, 218, 128, 0.85);
          font-family: ${MONO};
          font-size: 9px;
          margin-top: 14px;
          padding: 12px 14px;
        }

        .claim-button {
          background: ${ACCENT};
          border: none;
          border-radius: 10px;
          box-shadow: 0 0 34px rgba(0, 255, 136, 0.26);
          color: #000;
          cursor: pointer;
          font-size: 16px;
          font-weight: 850;
          letter-spacing: 0.05em;
          margin-top: 18px;
          min-height: 56px;
          transition: opacity 0.18s, transform 0.12s, background 0.18s;
          width: 100%;
        }

        .claim-button:not(:disabled):active {
          transform: scale(0.985);
        }

        .claim-button:disabled {
          background: rgba(255, 255, 255, 0.06);
          box-shadow: none;
          color: rgba(255, 255, 255, 0.32);
          cursor: not-allowed;
        }

        .claimed-state {
          align-items: center;
          display: flex;
          flex: 1;
          flex-direction: column;
          justify-content: center;
          min-height: 310px;
          overflow: hidden;
          padding: 30px 0 10px;
          position: relative;
          text-align: center;
        }

        .claimed-state::before {
          animation: success-scan 1.4s ease-out both;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(0, 255, 136, 0.18),
            transparent
          );
          content: '';
          height: 140%;
          left: -80%;
          position: absolute;
          top: -20%;
          transform: rotate(18deg);
          width: 60%;
        }

        .success-mark {
          align-items: center;
          animation: success-pop 0.58s cubic-bezier(0.2, 1.5, 0.35, 1) both;
          background: rgba(0, 255, 136, 0.12);
          border: 1.5px solid ${ACCENT};
          border-radius: 999px;
          box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.34),
            0 0 34px rgba(0, 255, 136, 0.2);
          color: ${ACCENT};
          display: flex;
          height: 72px;
          justify-content: center;
          margin-bottom: 18px;
          position: relative;
          width: 72px;
          z-index: 2;
        }

        .success-mark::before,
        .success-mark::after {
          animation: success-ring 1.25s ease-out forwards;
          border: 1px solid rgba(0, 255, 136, 0.5);
          border-radius: 999px;
          content: '';
          inset: -10px;
          opacity: 0;
          position: absolute;
        }

        .success-mark::after {
          animation-delay: 0.18s;
          inset: -20px;
        }

        .burst-particle {
          animation: burst-pop 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          background: var(--color);
          border-radius: 999px;
          box-shadow: 0 0 12px var(--color);
          height: var(--size);
          left: 50%;
          opacity: 0;
          position: absolute;
          top: 36%;
          transform: translate(-50%, -50%) rotate(var(--angle));
          width: var(--size);
          z-index: 1;
        }

        .confetti-chip {
          animation: chip-fall 1.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          color: var(--color);
          font-family: ${MONO};
          font-size: 11px;
          font-weight: 800;
          left: var(--left);
          opacity: 0;
          position: absolute;
          text-shadow: 0 0 14px var(--color);
          top: -18px;
          transform: rotate(var(--rotate));
          z-index: 1;
        }

        .claimed-state h2 {
          animation: claim-copy-in 0.45s ease-out 0.22s both;
          font-size: 16px;
          font-weight: 850;
          letter-spacing: -0.01em;
          position: relative;
          z-index: 2;
        }

        .claimed-state p {
          animation: claim-copy-in 0.45s ease-out 0.32s both;
          color: rgba(255, 255, 255, 0.6);
          font-family: ${MONO};
          font-size: 16px;
          margin-top: 8px;
          position: relative;
          z-index: 2;
        }

        .reset-button {
          align-items: center;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.44);
          cursor: pointer;
          display: inline-flex;
          font-family: ${MONO};
          font-size: 13px;
          gap: 8px;
          letter-spacing: 0.1em;
          margin-top: 28px;
          position: relative;
          z-index: 2;
        }

        .terminal-footer {
          align-items: center;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.42);
          display: flex;
          font-size: 9px;
          justify-content: space-between;
          letter-spacing: 0.05em;
          margin-top: auto;
          padding-top: 12px;
        }

        .terminal-footer b {
          color: ${ACCENT};
          font-weight: 700;
        }

        @keyframes drift {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(190%);
          }
        }

        @keyframes success-pop {
          0% {
            opacity: 0;
            transform: scale(0.55);
          }
          70% {
            transform: scale(1.08);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes success-ring {
          0% {
            opacity: 0.8;
            transform: scale(0.62);
          }
          100% {
            opacity: 0;
            transform: scale(1.65);
          }
        }

        @keyframes burst-pop {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--angle))
              translateX(0) scale(0.4);
          }
          16% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--angle))
              translateX(var(--distance)) scale(1);
          }
        }

        @keyframes chip-fall {
          0% {
            opacity: 0;
            transform: translateY(0) rotate(var(--rotate)) scale(0.72);
          }
          18% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(var(--fall)) rotate(calc(var(--rotate) + 120deg))
              scale(1);
          }
        }

        @keyframes claim-copy-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes success-scan {
          from {
            opacity: 0;
            transform: translateX(0) rotate(18deg);
          }
          30% {
            opacity: 1;
          }
          to {
            opacity: 0;
            transform: translateX(340%) rotate(18deg);
          }
        }

        @media (max-width: 640px) {
          .terminal-card {
            border-radius: 0;
            min-height: 100vh;
            padding: 18px 20px 16px;
          }

          .wallet-option {
            align-items: stretch;
            flex-direction: column;
          }

          .connected-wallet-button,
          .terminal-wallet-button :global(.wallet-adapter-button) {
            justify-content: center !important;
            width: 100% !important;
          }
        }
      `}</style>
    </TerminalShell>
  );
}

function TerminalShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen w-full bg-black px-0 py-0 text-white sm:px-4 sm:py-6">
      <div className="mx-auto w-full max-w-[390px]">{children}</div>
    </main>
  );
}

function Sparkles() {
  return (
    <>
      {[
        ['12%', '15%', '0s'],
        ['64%', '8%', '0.4s'],
        ['52%', '33%', '0.8s'],
        ['70%', '48%', '1.1s'],
        ['58%', '76%', '1.5s'],
        ['22%', '58%', '1.9s'],
      ].map(([left, top, delay]) => (
        <span
          key={`${left}-${top}`}
          className="sparkle"
          style={{
            left,
            top,
            animationDelay: delay,
          }}
        />
      ))}

      <style jsx>{`
        .sparkle {
          animation: blink 2.8s ease-in-out infinite;
          background: ${ACCENT};
          border-radius: 999px;
          height: 4px;
          opacity: 0.52;
          position: absolute;
          width: 4px;
          z-index: 1;
        }

        @keyframes blink {
          0%,
          100% {
            opacity: 0.22;
            transform: scale(0.75);
          }
          50% {
            opacity: 0.78;
            transform: scale(1.15);
          }
        }
      `}</style>
    </>
  );
}

function ClaimedState({
  destinationLabel,
  prizeAmount,
  tokenSymbol,
  resetClaim,
}: {
  destinationLabel: string;
  prizeAmount: string;
  tokenSymbol: string;
  resetClaim: () => void;
}) {
  return (
    <section className="claimed-state">
      <ConfettiBurst />
      <div className="claimed-card">
        <div className="success-mark">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <span className="success-eyebrow">CLAIM CONFIRMED</span>
        <h2>
          {prizeAmount} {tokenSymbol}
        </h2>
        <p>delivered to</p>
        <strong>{destinationLabel}</strong>
        <button className="reset-button" onClick={resetClaim}>
          <RotateCcw className="h-4 w-4" />
          CLAIM ANOTHER
        </button>
      </div>

      <style jsx>{`
        .claimed-state {
          align-items: center;
          display: flex;
          justify-content: center;
          min-height: 310px;
          overflow: hidden;
          padding: 18px 0 4px;
          position: relative;
          text-align: center;
        }

        .claimed-state::before {
          animation: success-scan 1.2s ease-out both;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(0, 255, 136, 0.16),
            transparent
          );
          content: '';
          height: 160%;
          left: -90%;
          position: absolute;
          top: -30%;
          transform: rotate(18deg);
          width: 64%;
        }

        .claimed-card {
          align-items: center;
          background: linear-gradient(
              180deg,
              rgba(0, 255, 136, 0.08),
              rgba(255, 255, 255, 0.025)
            ),
            rgba(5, 5, 5, 0.82);
          border: 1px solid rgba(0, 255, 136, 0.28);
          border-radius: 18px;
          box-shadow: 0 22px 60px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          max-width: 100%;
          padding: 28px 22px 20px;
          position: relative;
          width: 100%;
          z-index: 2;
        }

        .success-mark {
          align-items: center;
          animation: success-pop 0.58s cubic-bezier(0.2, 1.5, 0.35, 1) both;
          background: rgba(0, 255, 136, 0.12);
          border: 1.5px solid ${ACCENT};
          border-radius: 999px;
          box-shadow: 0 0 34px rgba(0, 255, 136, 0.22);
          color: ${ACCENT};
          display: flex;
          height: 76px;
          justify-content: center;
          margin-bottom: 18px;
          position: relative;
          width: 76px;
        }

        .success-mark::before,
        .success-mark::after {
          animation: success-ring 1.25s ease-out forwards;
          border: 1px solid rgba(0, 255, 136, 0.5);
          border-radius: 999px;
          content: '';
          inset: -10px;
          opacity: 0;
          position: absolute;
        }

        .success-mark::after {
          animation-delay: 0.18s;
          inset: -20px;
        }

        .success-eyebrow {
          animation: claim-copy-in 0.42s ease-out 0.16s both;
          color: ${ACCENT};
          font-family: ${MONO};
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.24em;
        }

        .claimed-card h2 {
          animation: claim-copy-in 0.42s ease-out 0.22s both;
          color: #fff;
          font-size: 30px;
          font-weight: 900;
          line-height: 1;
          margin-top: 12px;
        }

        .claimed-card p {
          animation: claim-copy-in 0.42s ease-out 0.3s both;
          color: rgba(255, 255, 255, 0.44);
          font-family: ${MONO};
          font-size: 10px;
          letter-spacing: 0.1em;
          margin-top: 16px;
          text-transform: uppercase;
        }

        .claimed-card strong {
          animation: claim-copy-in 0.42s ease-out 0.36s both;
          color: rgba(255, 255, 255, 0.86);
          font-family: ${MONO};
          font-size: 15px;
          font-weight: 700;
          margin-top: 7px;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .reset-button {
          align-items: center;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          display: inline-flex;
          font-family: ${MONO};
          font-size: 11px;
          font-weight: 800;
          gap: 8px;
          justify-content: center;
          letter-spacing: 0.12em;
          margin-top: 22px;
          min-height: 44px;
          padding: 0 18px;
          transition: border-color 0.18s, color 0.18s, transform 0.12s;
        }

        .reset-button:hover {
          border-color: rgba(0, 255, 136, 0.32);
          color: #fff;
        }

        .reset-button:active {
          transform: scale(0.98);
        }

        @keyframes success-scan {
          from {
            opacity: 0;
            transform: translateX(0) rotate(18deg);
          }
          30% {
            opacity: 1;
          }
          to {
            opacity: 0;
            transform: translateX(340%) rotate(18deg);
          }
        }

        @keyframes success-pop {
          0% {
            opacity: 0;
            transform: scale(0.55);
          }
          70% {
            transform: scale(1.08);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes success-ring {
          0% {
            opacity: 0.8;
            transform: scale(0.62);
          }
          100% {
            opacity: 0;
            transform: scale(1.65);
          }
        }

        @keyframes claim-copy-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}

function ConfettiBurst() {
  const burstParticles = Array.from({ length: 22 }, (_, index) => {
    const angle = (index / 22) * 360;
    const distance = 70 + (index % 5) * 12;
    const size = 3 + (index % 3);
    const color = index % 4 === 0 ? '#ffffff' : index % 3 === 0 ? '#8cffc1' : ACCENT;

    return (
      <span
        key={`burst-${index}`}
        className="burst-particle"
        style={
          {
            '--angle': `${angle}deg`,
            '--distance': `${distance}px`,
            '--size': `${size}px`,
            '--color': color,
            animationDelay: `${index * 18}ms`,
          } as React.CSSProperties
        }
      />
    );
  });

  return (
    <div className="confetti-layer" aria-hidden="true">
      {burstParticles}

      <style jsx>{`
        .confetti-layer {
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          position: absolute;
          z-index: 1;
        }

        .burst-particle {
          animation: burst-pop 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          background: var(--color);
          border-radius: 999px;
          box-shadow: 0 0 12px var(--color);
          height: var(--size);
          left: 50%;
          opacity: 0;
          position: absolute;
          top: 34%;
          transform: translate(-50%, -50%) rotate(var(--angle));
          width: var(--size);
        }

        @keyframes burst-pop {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--angle))
              translateX(0) scale(0.4);
          }
          16% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--angle))
              translateX(var(--distance)) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

function StatusPanel({
  icon,
  title,
  description,
  tone = 'neutral',
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tone?: 'neutral' | 'danger';
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[18px] border border-white/10 bg-[#050505] p-8 text-center shadow-2xl">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
            tone === 'danger'
              ? 'bg-red-500/12 text-red-300'
              : 'bg-white/8 text-white/70'
          }`}
        >
          {icon}
        </div>
        <h1 className="mt-5 text-xl font-semibold text-white">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-white/52">{description}</p>
      </div>
    </div>
  );
}

function getExpiryLabel(expiresAt?: string | null) {
  if (!expiresAt) return 'NO EXPIRY';

  const expires = new Date(expiresAt).getTime();
  const diffMs = expires - Date.now();

  if (!Number.isFinite(expires) || diffMs <= 0) return 'EXPIRED';

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}D ${hours}H`;
  return `${hours}H ${minutes}M`;
}
