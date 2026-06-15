const LOCAL_TOKEN_ICON_SYMBOLS = new Set([
  '1INCH',
  'AAVE',
  'BONK',
  'BRETT',
  'BTC',
  'CAKE',
  'CAT',
  'DAI',
  'DOLLAR',
  'ETH',
  'FDUSD',
  'FIL',
  'FTM',
  'GRT',
  'HNT',
  'JUP',
  'MATIC',
  'MEW',
  'MOBILE',
  'POL',
  'PONKE',
  'PYTH',
  'PYUSD',
  'SOL',
  'SUSHI',
  'SWOP',
  'UNI',
  'USDC',
  'USDT',
  'WBTC',
  'WETH',
  'XRP',
]);

const LOCAL_ICON_PATH = '/assets/crypto-icons';
export const SWOP_ICON_PATH = '/swop-icon.svg';

function normalizeSymbol(value?: string | null) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function localIconForSymbol(symbol?: string | null) {
  const normalized = normalizeSymbol(symbol);
  if (normalized && LOCAL_TOKEN_ICON_SYMBOLS.has(normalized)) {
    return `${LOCAL_ICON_PATH}/${normalized}.png`;
  }
  return '';
}

function localIconFromPath(value: string) {
  const filename = value.split(/[?#]/)[0].split('/').pop() || '';
  const symbol = filename.replace(/\.(png|jpe?g|webp|svg)$/i, '');
  return localIconForSymbol(symbol);
}

export function getTokenImageFallbackSrc(symbol?: string | null) {
  return localIconForSymbol(symbol) || SWOP_ICON_PATH;
}

export function resolveTokenImageSrc(
  tokenLogo?: string | null,
  tokenSymbol?: string | null,
) {
  const fallback = getTokenImageFallbackSrc(tokenSymbol);
  const candidate = String(tokenLogo || '').trim();

  if (!candidate || /^(null|undefined)$/i.test(candidate)) {
    return fallback;
  }

  const localIcon = localIconFromPath(candidate);
  if (
    localIcon &&
    (candidate.includes('/public/crypto-icons/') ||
      candidate.includes('/assets/crypto-icons/') ||
      /^[A-Z0-9]+\.(png|jpe?g|webp|svg)$/i.test(candidate))
  ) {
    return localIcon;
  }

  if (/^ipfs:\/\//i.test(candidate)) {
    const cidPath = candidate
      .replace(/^ipfs:\/\//i, '')
      .replace(/^ipfs\//i, '');
    return `https://ipfs.io/ipfs/${cidPath}`;
  }

  if (/^ar:\/\//i.test(candidate)) {
    return `https://arweave.net/${candidate.replace(/^ar:\/\//i, '')}`;
  }

  if (candidate.startsWith('//')) {
    return `https:${candidate}`;
  }

  if (/^https?:\/\//i.test(candidate)) {
    try {
      const parsed = new URL(candidate);
      const absoluteLocalIcon = localIconFromPath(parsed.pathname);
      if (
        absoluteLocalIcon &&
        (parsed.pathname.includes('/public/crypto-icons/') ||
          parsed.pathname.includes('/assets/crypto-icons/'))
      ) {
        return absoluteLocalIcon;
      }
      return parsed.toString();
    } catch {
      return fallback;
    }
  }

  if (candidate.startsWith('/')) {
    return encodeURI(candidate);
  }

  if (/^[^\s/]+\.[^\s/]+\/.+/.test(candidate)) {
    return `https://${candidate}`;
  }

  return fallback;
}

export function resolveTokenImageUrl(
  tokenLogo: string | null | undefined,
  tokenSymbol: string | null | undefined,
  baseUrl: string,
) {
  return new URL(
    resolveTokenImageSrc(tokenLogo, tokenSymbol),
    baseUrl,
  ).toString();
}
