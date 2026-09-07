/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  // Accès au serveur de développement depuis un autre poste du réseau local.
  allowedDevOrigins: ['10.48.246.120', '192.168.1.*', '10.*'],
  images: {
    // Les visuels sont servis depuis /public/media (déjà optimisés à 1600px, qualité 80).
    formats: ['image/avif', 'image/webp'],
    // Les visuels ne changent pas : on les garde un an dans le cache du navigateur.
    minimumCacheTTL: 31536000,
  },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: { bodySizeLimit: '4mb' },
  },
};

export default nextConfig;
