/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow a clean preview/build alongside a checkout with locked OneDrive cache files.
  distDir: process.env.IMF_BUILD_DIR || '.next',
  compress: true,
  poweredByHeader: false,
  async headers() {
    return [
      {source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'SAMEORIGIN'},{key:'Content-Security-Policy',value:"object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'"},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}]},
      {source:'/sw.js',headers:[{key:'Cache-Control',value:'no-cache, no-store, must-revalidate'},{key:'Content-Type',value:'application/javascript; charset=utf-8'},{key:'Service-Worker-Allowed',value:'/'}]},
    ];
  },
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
    serverActions: { bodySizeLimit: '10mb' },
  },
};

export default nextConfig;
