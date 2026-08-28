import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
