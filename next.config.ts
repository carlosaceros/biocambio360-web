import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  // La carpeta capacitacion/ vive fuera de src/ y public/ a propósito (no debe compilarse ni
  // servirse como ruta pública); solo /api/admin/capacitacion la lee en runtime tras verificar el
  // login, así que hay que forzar a Vercel a incluirla en el bundle de esa función serverless.
  outputFileTracingIncludes: {
    '/api/admin/capacitacion': ['./capacitacion/**'],
  },
  images: {
    contentDispositionType: 'inline',
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
  },
  /* config options here */
  async redirects() {
    return [
      {
        source: '/hogar-familiar',
        destination: '/?seg=Hogar#catalogo',
        permanent: false,
      },
      {
        source: '/hogar',
        destination: '/?seg=Hogar#catalogo',
        permanent: false,
      },
      {
        source: '/restaurantes-y-cafes',
        destination: '/?seg=Restaurante#catalogo',
        permanent: false,
      },
      {
        source: '/restaurantes',
        destination: '/?seg=Restaurante#catalogo',
        permanent: false,
      },
      {
        source: '/oficinas-e-institucional',
        destination: '/?seg=Oficina#catalogo',
        permanent: false,
      },
      {
        source: '/institucional',
        destination: '/?seg=Oficina#catalogo',
        permanent: false,
      },
      {
        source: '/oficinas',
        destination: '/?seg=Oficina#catalogo',
        permanent: false,
      },
      {
        source: '/airbnb',
        destination: '/?seg=Airbnb#catalogo',
        permanent: false,
      },
      {
        source: '/anfitriones-airbnb',
        destination: '/?seg=Airbnb#catalogo',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/videos/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }
        ],
      },
    ];
  },
  async rewrites() {
    return {
      fallback: [
        {
          source: '/images/:path*',
          destination: '/api/images/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
