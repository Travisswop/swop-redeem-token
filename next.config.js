/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https', // Allow any protocol
        hostname: '*', // Allow any hostname
      },
      {
        protocol: 'http', // Allow any protocol
        hostname: '*', // Allow any hostname
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'nftstorage.link',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
      },
      {
        protocol: 'https',
        hostname: 'i.seadn.io',
      },
    ],
    // domains: [
    //   "*",
    //   "i.seadn.io",
    //   "ipfs.io",
    //   "i.ibb.co",
    //   "nftstorage.link",
    //   "res.cloudinary.com",
    // ], // Allow images from all domains
  },
};

module.exports = nextConfig;
