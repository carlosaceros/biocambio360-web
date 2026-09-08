'use client';

import React, { useRef, useEffect } from 'react';

interface SmartVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  children?: React.ReactNode;
  sources?: Array<{ src: string; type: string }>;
  rootMargin?: string;
}

export default function SmartVideo({
  children,
  sources,
  className = '',
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
  preload = 'metadata',
  rootMargin = '150px',
  ...props
}: SmartVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let isVisible = false;

    // IntersectionObserver: only plays video while visible on screen
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisible = entry.isIntersecting;

        if (isVisible && document.visibilityState === 'visible') {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      {
        threshold: 0.05,
        rootMargin,
      }
    );

    observer.observe(video);

    // Also pause if the browser tab is hidden to conserve battery
    const handleVisibilityChange = () => {
      if (!video) return;
      if (document.visibilityState === 'visible' && isVisible) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [rootMargin]);

  return (
    <video
      ref={videoRef}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      preload={preload}
      className={className}
      {...props}
    >
      {sources?.map((s, i) => (
        <source key={i} src={s.src} type={s.type} />
      ))}
      {children}
    </video>
  );
}
