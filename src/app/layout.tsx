import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { CartProvider } from "@/lib/cart-context";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const BASE_URL = 'https://www.biocambio360.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Biocambio360 — Limpieza Industrial de Calidad Premium | Fábrica Directa",
    template: "%s | Biocambio360"
  },
  description: "Productos de limpieza industrial concentrados: Detergente, Desengrasante, Suavizante y más. Calidad de fábrica propia directa al consumidor. Envíos a toda Colombia.",
  keywords: [
    "productos limpieza industrial Colombia",
    "detergente concentrado por mayor",
    "desengrasante industrial alto rendimiento",
    "suavizante hotelero",
    "limpieza profesional Bogotá",
    "Biocambio360",
    "aseo industrial fábrica directa",
    "productos concentrados limpieza"
  ],
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    apple: '/favicon.png',
  },
  verification: {
    google: ["D8korwn8MSRpH3qaGd1j5outfbLxO_WUtxe7Ok8vhz8", "htb2Q-eSNiKBROAxC3B3cERhsIdD7VD3qWmeUs8vYVw"],
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: BASE_URL,
    siteName: "Biocambio360 — Total Limpieza",
    title: "Biocambio360 — Limpieza Industrial de Calidad Premium",
    description: "Productos de limpieza concentrados. Fábrica propia en Soacha, Colombia. Envíos nacionales.",
    images: [
      {
        url: `${BASE_URL}/images/og-biocambio360.png`,
        width: 1200,
        height: 630,
        alt: "Biocambio360 — Limpieza Industrial Premium"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Biocambio360 — Limpieza Industrial de Calidad Premium",
    description: "Productos de limpieza concentrados. Fábrica propia en Soacha, Colombia.",
    images: [`${BASE_URL}/images/og-biocambio360.png`]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    }
  },
  alternates: {
    canonical: BASE_URL,
  }
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Biocambio360 S.A.S.",
  "alternateName": "Biocambio 360",
  "url": BASE_URL,
  "logo": `${BASE_URL}/images/logo-biocambio360.png`,
  "description": "Fabricantes de productos de limpieza industrial concentrados en Colombia. Calidad premium, fórmula concentrada, fábrica propia.",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Cra. 7C #44-17 Sur",
    "addressLocality": "Soacha",
    "addressRegion": "Cundinamarca",
    "postalCode": "250001",
    "addressCountry": "CO"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer support",
    "availableLanguage": "Spanish",
    "areaServed": "CO"
  },
  "sameAs": [
    "https://www.facebook.com/Biocambio360",
    "https://www.instagram.com/biocambio360"
  ]
};

import CartDrawer from "@/components/CartDrawer";
import DiscountWheelModal from "@/components/DiscountWheelModal";
import FirstPurchaseModal from "@/components/FirstPurchaseModal";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body suppressHydrationWarning style={{ fontFamily: '"Barlow", sans-serif' }}>
        <AuthProvider>
          <CartProvider>
            {children}
            <CartDrawer />
            <DiscountWheelModal />
            <FirstPurchaseModal />
            <Analytics />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
