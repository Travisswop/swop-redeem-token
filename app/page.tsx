'use client';

import { useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

const ACCENT = '#00ff88';
const MONO =
  '"JetBrains Mono", "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

const validateSolanaAddress = (address: string) => {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
};

const cleanSwopId = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/\.swop\.id$/, '')
    .replace(/[^a-z0-9_]/g, '');

export default function Home() {
  const [destination, setDestination] = useState('');
  const cleanedSwopId = cleanSwopId(destination);
  const isWallet = validateSolanaAddress(destination.trim());
  const isValid = destination.trim().length >= 3;
  const showSuggestions = !isWallet && cleanedSwopId.length >= 2;

  return (
    <main className="min-h-screen w-full bg-black px-0 py-0 text-white sm:px-4 sm:py-6">
      <div className="mx-auto w-full max-w-[390px]">
        <div className="terminal-card">
          <header className="topbar">
            <div className="brand">
              <Image
                src="/swop-wordmark-white.png"
                alt="Swop"
                width={96}
                height={28}
                className="brand-logo"
                priority
              />
              <span className="slash">/</span>
              <span className="section-word">REDEEM</span>
            </div>
            <div className="expires">
              <span>EXPIRES</span>
              <strong>PREVIEW</strong>
            </div>
          </header>

          <div className="drop-strip">
            <span>DROP #A4F9-2C81</span>
            <span>FROM @swop</span>
          </div>

          <section className="prize-card">
            <div className="glow" />
            <Sparkles />
            <div className="prize-content">
              <div className="drop-type">STABLECOIN DROP</div>
              <h1>$25</h1>
              <p>in USDC, ready to trade</p>
              <div className="description">
                A welcome drop from Swop. Spend it, swap it, or stake it on a
                market - your call.
              </div>
            </div>
          </section>

          <section className="claim-form">
            <div className="input-label">-- PASTE YOUR SWOP.ID OR WALLET</div>

            <div className={`destination-box ${isValid ? 'valid' : ''}`}>
              <span className="prefix">{isWallet ? '#' : '@'}</span>
              <input
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder="yourname or wallet"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <span className="suffix">{isWallet ? 'wallet' : '.swop.id'}</span>
            </div>

            {showSuggestions && (
              <div className="suggestions-popover">
                <button onClick={() => setDestination(cleanedSwopId)}>
                  <span>@{cleanedSwopId}</span>
                  <strong>{cleanedSwopId}.swop.id</strong>
                </button>
                <button
                  onClick={() => setDestination(`${cleanedSwopId}.swop.id`)}
                >
                  <span>search</span>
                  <strong>{cleanedSwopId}.swop.id</strong>
                </button>
              </div>
            )}

            <div className="hint-line">
              {!destination.trim() && (
                <span>No swop.id yet? Get one free in the Swop app.</span>
              )}
              {destination.trim() && (
                <span className="ok">
                  {isWallet
                    ? 'Wallet detected. Open a real drop link to claim.'
                    : 'swop.id preview ready. Open a real drop link to claim.'}
                </span>
              )}
            </div>

            <div className="wallet-option">
              <div>
                <span>WALLET OPTION</span>
                <strong>connect instead</strong>
              </div>
              <div className="terminal-wallet-button">
                <WalletMultiButton />
              </div>
            </div>

            <button className="claim-button" disabled>
              CLAIM DROP -&gt;
            </button>
          </section>

          <footer className="terminal-footer">
            <span>
              <b>{'>'}</b> preview mode / valid links use /[poolId]
            </span>
            <span>SOLANA</span>
          </footer>
        </div>
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
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 18px 20px 16px;
        }

        .topbar,
        .drop-strip,
        .terminal-footer,
        .expires,
        .input-label,
        .hint-line,
        .drop-type,
        .wallet-option span,
        .wallet-option strong {
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
        }

        .brand-logo {
          height: auto;
          width: 76px;
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

        h1 {
          color: #fff;
          font-size: 64px;
          font-weight: 950;
          letter-spacing: -0.06em;
          line-height: 0.9;
          margin-top: 18px;
          text-shadow: 0 0 28px rgba(0, 255, 136, 0.24);
        }

        .prize-card p {
          color: rgba(255, 255, 255, 0.72);
          font-size: 16px;
          font-weight: 500;
          margin-top: 8px;
        }

        .description {
          border-top: 1px dashed rgba(0, 255, 136, 0.35);
          color: rgba(255, 255, 255, 0.56);
          font-size: 13px;
          line-height: 1.45;
          margin-top: 22px;
          padding-top: 16px;
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

        .suggestions-popover {
          background: rgba(10, 10, 10, 0.96);
          border: 1px solid rgba(0, 255, 136, 0.22);
          border-radius: 10px;
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.34);
          display: grid;
          gap: 6px;
          margin-top: 8px;
          padding: 8px;
        }

        .suggestions-popover button {
          align-items: center;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.72);
          cursor: pointer;
          display: flex;
          font-family: ${MONO};
          justify-content: space-between;
          padding: 9px 10px;
          text-align: left;
        }

        .suggestions-popover button:hover {
          border-color: rgba(0, 255, 136, 0.36);
        }

        .suggestions-popover span {
          color: ${ACCENT};
          font-size: 10px;
          letter-spacing: 0.08em;
        }

        .suggestions-popover strong {
          color: rgba(255, 255, 255, 0.66);
          font-size: 10px;
          font-weight: 600;
        }

        .hint-line .ok {
          color: ${ACCENT};
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
          padding: 0 13px !important;
        }

        .terminal-wallet-button :global(.wallet-adapter-button-start-icon) {
          display: none !important;
        }

        .claim-button {
          background: rgba(255, 255, 255, 0.06);
          border: none;
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.32);
          cursor: not-allowed;
          font-size: 16px;
          font-weight: 850;
          letter-spacing: 0.05em;
          margin-top: 18px;
          min-height: 56px;
          width: 100%;
        }

        .terminal-footer {
          align-items: center;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.42);
          display: flex;
          font-family: ${MONO};
          font-size: 9px;
          justify-content: space-between;
          letter-spacing: 0.05em;
          margin-top: auto;
          padding-top: 12px;
        }

        .terminal-footer b {
          color: ${ACCENT};
        }

        @keyframes drift {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(190%);
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

          .terminal-wallet-button :global(.wallet-adapter-button) {
            justify-content: center !important;
            width: 100% !important;
          }

          .claim-button {
            min-height: 62px;
          }
        }
      `}</style>
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
          style={{ left, top, animationDelay: delay }}
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
