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

function versionAtLeast(version, minimum) {
  const current = version.split('-')[0].split('.').map(Number);
  const required = minimum.split('-')[0].split('.').map(Number);

  for (let index = 0; index < Math.max(current.length, required.length); index += 1) {
    const currentPart = current[index] || 0;
    const requiredPart = required[index] || 0;

    if (currentPart !== requiredPart) {
      return currentPart > requiredPart;
    }
  }

  return true;
}

function assertLockedVersionsAtLeast(packageName, minimumByMajor) {
  const packagePaths = lockedPackagePaths(packageName);
  assert.ok(packagePaths.length > 0, `${packageName} must be present in the lockfile`);

  for (const packagePath of packagePaths) {
    const version = lockfile.packages[packagePath].version;
    const major = version.split('.')[0];
    const minimum = minimumByMajor[major];

    assert.ok(
      minimum && versionAtLeast(version, minimum),
      `${packageName}@${version} must be at least the patched ${minimum || 'supported major'}`
    );
  }
}

function readRuntimeSources(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return readRuntimeSources(entryPath);
    }

    return /\.(?:js|jsx|ts|tsx)$/.test(entry.name)
      ? [fs.readFileSync(entryPath, 'utf8')]
      : [];
  });
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

test('build tooling stays above the patched dependency floors', () => {
  const patchedFloors = {
    'brace-expansion': { 1: '1.1.18', 2: '2.1.4', 5: '5.0.9' },
    minimatch: { 3: '3.1.4', 9: '9.0.7', 10: '10.2.6' },
    'js-yaml': { 4: '4.3.1' },
    postcss: { 8: '8.5.23' },
    nanoid: { 3: '3.3.17' },
    flatted: { 3: '3.4.2' },
    picomatch: { 2: '2.3.2', 4: '4.0.5' },
    yaml: { 2: '2.8.3' },
    ajv: { 6: '6.14.0', 8: '8.17.1' },
  };

  for (const [packageName, minimumByMajor] of Object.entries(patchedFloors)) {
    assertLockedVersionsAtLeast(packageName, minimumByMajor);
  }

  const tailwindGlob = lockfile.packages['node_modules/sucrase/node_modules/glob'];
  assert.ok(
    tailwindGlob && versionAtLeast(tailwindGlob.version, '10.5.0'),
    'Tailwind\'s glob CLI dependency must include its command-injection fix'
  );
});

test('Solana runtime dependencies stay above their patched floors', () => {
  const patchedFloors = {
    '@babel/runtime': { 7: '7.26.10' },
    'base-x': { 3: '3.0.11', 4: '4.0.1', 5: '5.0.1', 6: '6.0.0' },
    'bn.js': { 5: '5.2.3' },
    uuid: { 11: '11.1.1' },
    ws: { 7: '7.5.11', 8: '8.21.0' },
  };

  assert.ok(
    versionAtLeast(lockfile.packages['node_modules/@solana/web3.js'].version, '1.98.4'),
    '@solana/web3.js must remain on its patched 1.x release'
  );
  assert.deepEqual(
    lockedPackagePaths('bigint-buffer'),
    [],
    'the unpatched native bigint converter must remain absent'
  );

  for (const [packageName, minimumByMajor] of Object.entries(patchedFloors)) {
    assertLockedVersionsAtLeast(packageName, minimumByMajor);
  }
});

test('the supported Solana address boundary remains compatible', () => {
  const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');
  const systemAddress = '11111111111111111111111111111111';
  const connection = new Connection(clusterApiUrl('mainnet-beta'));

  assert.equal(new PublicKey(systemAddress).toBase58(), systemAddress);
  assert.throws(() => new PublicKey('not-a-solana-address'));
  assert.equal(connection.rpcEndpoint, 'https://api.mainnet-beta.solana.com/');
});

test('server code does not expose bigint-buffer conversion functions', () => {
  const sources = ['app', 'components', 'lib'].flatMap((directory) =>
    readRuntimeSources(path.join(repositoryRoot, directory))
  );
  const web3Imports = sources.flatMap((source) =>
    [...source.matchAll(/import\s*{([^}]+)}\s*from\s*['"]@solana\/web3\.js['"]/g)]
      .flatMap((match) => match[1].split(',').map((name) => name.trim()))
  );

  assert.deepEqual(
    [...new Set(web3Imports)].sort(),
    ['PublicKey', 'clusterApiUrl'],
    'runtime code may only use the audited PublicKey and endpoint helpers'
  );
});
