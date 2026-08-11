import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SWOP Redeem token drop';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: '#000',
          color: '#fff',
          display: 'flex',
          fontFamily: 'Inter, Arial, sans-serif',
          height: '100%',
          justifyContent: 'center',
          position: 'relative',
          width: '100%',
        }}
      >
        <div
          style={{
            background:
              'radial-gradient(circle at 66% 25%, rgba(0,255,136,0.24), transparent 24%), linear-gradient(180deg, rgba(0,60,31,0.72), rgba(0,0,0,0.96))',
            border: '2px solid rgba(0,255,136,0.42)',
            borderRadius: 44,
            boxShadow: '0 0 90px rgba(0,255,136,0.12)',
            display: 'flex',
            flexDirection: 'column',
            height: 470,
            justifyContent: 'space-between',
            overflow: 'hidden',
            padding: '54px 64px',
            position: 'relative',
            width: 980,
          }}
        >
          <div
            style={{
              background:
                'repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 7px)',
              inset: 0,
              opacity: 0.46,
              position: 'absolute',
            }}
          />

          <div
            style={{
              alignItems: 'center',
              display: 'flex',
              justifyContent: 'space-between',
              position: 'relative',
              width: '100%',
            }}
          >
            <div
              style={{
                alignItems: 'center',
                display: 'flex',
                gap: 28,
              }}
            >
              <div
                style={{
                  fontSize: 62,
                  fontWeight: 900,
                  letterSpacing: 12,
                  lineHeight: 1,
                }}
              >
                SWOP
              </div>
              <div
                style={{
                  color: 'rgba(255,255,255,0.34)',
                  fontSize: 44,
                  fontWeight: 500,
                }}
              >
                /
              </div>
              <div
                style={{
                  color: 'rgba(255,255,255,0.72)',
                  fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: 7,
                }}
              >
                REDEEM
              </div>
            </div>
            <div
              style={{
                color: '#00ff88',
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: 4,
              }}
            >
              TOKEN DROP
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 22,
              position: 'relative',
            }}
          >
            <div
              style={{
                color: '#00ff88',
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: 9,
              }}
            >
              CLAIM YOUR DROP
            </div>
            <div
              style={{
                fontSize: 88,
                fontWeight: 950,
                letterSpacing: -3,
                lineHeight: 0.95,
              }}
            >
              Redeem with swop.id
            </div>
            <div
              style={{
                color: 'rgba(255,255,255,0.72)',
                fontSize: 32,
                fontWeight: 650,
              }}
            >
              Paste a swop.id or wallet to claim securely.
            </div>
          </div>

          <div
            style={{
              alignItems: 'center',
              borderTop: '2px dashed rgba(0,255,136,0.34)',
              color: 'rgba(255,255,255,0.58)',
              display: 'flex',
              fontSize: 24,
              fontWeight: 800,
              justifyContent: 'space-between',
              letterSpacing: 4,
              paddingTop: 26,
              position: 'relative',
              width: '100%',
            }}
          >
            <span>redeem.swopme.app</span>
            <span style={{ color: '#00ff88' }}>SOLANA</span>
          </div>
        </div>
      </div>
    ),
    size
  );
}
