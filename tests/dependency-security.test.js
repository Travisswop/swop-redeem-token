const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repositoryRoot = path.resolve(__dirname, '..');
const lockfile = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, 'package-lock.json'), 'utf8')
);
const manifest = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8')
);
const npmConfig = fs.readFileSync(
  path.join(repositoryRoot, '.npmrc'),
  'utf8'
);
const lockedPaths = Object.keys(lockfile.packages || {});

function lockedPackagePaths(packageName) {
  const suffix = `/node_modules/${packageName}`;
  return lockedPaths.filter(
    (lockedPath) =>
      lockedPath === `node_modules/${packageName}` ||
      lockedPath.endsWith(suffix)
  );
}

test('the vulnerable native image parser toolchain is absent', () => {
  for (const packageName of ['image-size', 'metro', 'react-native']) {
    assert.deepEqual(
      lockedPackagePaths(packageName),
      [],
      `${packageName} must not be present in the web app lockfile`
    );
  }
});

test('future installs keep peer-only native tooling out of the lockfile', () => {
  assert.match(npmConfig, /^legacy-peer-deps=true$/m);
});

test('the supported Solana web wallet path remains installed', () => {
  for (const packageName of [
    '@solana/wallet-adapter-react-ui',
    '@solana/wallet-adapter-react',
    '@solana-mobile/wallet-adapter-mobile',
  ]) {
    assert.ok(
      lockedPackagePaths(packageName).length > 0,
      `${packageName} must remain in the web wallet dependency graph`
    );
  }

  assert.ok(manifest.dependencies['@solana/wallet-adapter-react-ui']);
});

test('unused legacy wallet adapters stay out of the web app', () => {
  assert.equal(
    manifest.dependencies['@solana/wallet-adapter-wallets'],
    undefined,
    'the all-wallet bundle must not be reintroduced'
  );

  for (const packageName of [
    '@solana/wallet-adapter-torus',
    '@solana/wallet-adapter-trezor',
    '@solana/wallet-adapter-walletconnect',
  ]) {
    assert.deepEqual(
      lockedPackagePaths(packageName),
      [],
      `${packageName} must not be present in the web app lockfile`
    );
  }
});

test('Next.js stays on the secured 15.5 backport line', () => {
  const nextPackage = lockfile.packages?.['node_modules/next'];

  assert.ok(nextPackage?.version, 'Next.js must be present in the lockfile');
  assert.match(
    nextPackage.version,
    /^15\.5\.(?:2[1-9]|[3-9]\d|\d{3,})$/,
    'Next.js must include the security fixes released in 15.5.21'
  );
  assert.equal(
    manifest.dependencies.next,
    manifest.dependencies['eslint-config-next'],
    'Next.js and eslint-config-next must stay on the same release'
  );
});
