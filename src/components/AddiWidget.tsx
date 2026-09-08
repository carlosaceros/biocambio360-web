'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';

interface AddiWidgetProps {
  price: number;
  allySlug?: string;
  className?: string;
}

export default function AddiWidget({
  price,
  allySlug = process.env.NEXT_PUBLIC_ADDI_ALLY_SLUG || 'biocambio360-ecommerce',
  className = ''
}: AddiWidgetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={`addi-widget-wrapper my-2.5 ${className}`}>
      <Script
        id="addi-widget-bundle"
        src="https://s3.amazonaws.com/widgets.addi.com/bundle.min.js"
        strategy="lazyOnload"
      />
      {React.createElement('addi-widget', {
        key: `addi-widget-${price}`,
        price: price,
        'ally-slug': allySlug
      })}
    </div>
  );
}
