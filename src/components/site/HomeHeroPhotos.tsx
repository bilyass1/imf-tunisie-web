'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/i18n/config';

const labels = {
  fr: { pause: 'Mettre le diaporama en pause', play: 'Reprendre le diaporama' },
  en: { pause: 'Pause slideshow', play: 'Resume slideshow' },
  ar: { pause: 'إيقاف عرض الصور مؤقتًا', play: 'استئناف عرض الصور' },
};

export default function HomeHeroPhotos({ initialImage, additionalImages, locale }: {
  initialImage: string;
  additionalImages: string[];
  locale: Locale;
}) {
  const [firstLoaded, setFirstLoaded] = useState(false);
  const images = useMemo(() => [...new Set([initialImage, ...additionalImages])], [initialImage, additionalImages]);
  const [loadedImages, setLoadedImages] = useState<string[]>([]);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [saveData, setSaveData] = useState(false);
  const [requestedCount, setRequestedCount] = useState(0);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setReducedMotion(preference.matches);
    const syncVisibility = () => setPageVisible(!document.hidden);
    syncMotion();
    syncVisibility();
    setSaveData(Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData));
    preference.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncVisibility);
    return () => {
      preference.removeEventListener('change', syncMotion);
      document.removeEventListener('visibilitychange', syncVisibility);
    };
  }, []);

  // Fetch one upcoming slide at a time, after the first image is painted.
  // Paused/hidden pages and data-saving connections keep their current image.
  useEffect(() => {
    if (!firstLoaded || paused || reducedMotion || saveData || !pageVisible || requestedCount >= images.length - 1) return;
    if (requestedCount > 0 && !loadedImages.includes(images[requestedCount]) && !failedImages.includes(images[requestedCount])) return;
    const timer = window.setTimeout(() => setRequestedCount(count => count + 1), 1500);
    return () => window.clearTimeout(timer);
  }, [firstLoaded, paused, reducedMotion, saveData, pageVisible, requestedCount, loadedImages, failedImages, images]);

  useEffect(() => {
    if (!firstLoaded || loadedImages.length === 0 || paused || reducedMotion || !pageVisible) return;
    const timer = window.setInterval(() => setActiveIndex(current => {
      // Keep the current photo if no other image has finished loading.
      for (let step = 1; step < images.length; step++) {
        const next = (current + step) % images.length;
        if (next === 0 || loadedImages.includes(images[next])) return next;
      }
      return current;
    }), 6000);
    return () => window.clearInterval(timer);
  }, [firstLoaded, loadedImages, images, paused, reducedMotion, pageVisible]);

  return (
    <>
      <Image src={initialImage} alt="" fill priority quality={80} sizes="100vw"
        className="object-cover object-[60%_center]" onLoad={() => setFirstLoaded(true)} />
      {firstLoaded && !reducedMotion && images.slice(1, requestedCount + 1).map((src, index) => (
        <Image key={src} src={src} alt="" fill quality={80} sizes="100vw" loading="eager" fetchPriority="low"
          onLoad={() => setLoadedImages(current => current.includes(src) ? current : [...current, src])}
          onError={() => setFailedImages(current => current.includes(src) ? current : [...current, src])}
          className={`object-cover object-[60%_center] transition-opacity duration-[1800ms] ease-in-out motion-reduce:transition-none ${activeIndex === index + 1 && loadedImages.includes(src) ? 'opacity-100' : 'opacity-0'}`} />
      ))}
      {loadedImages.length > 0 && !reducedMotion && (
        <button type="button" onClick={() => setPaused(current => !current)}
          aria-label={paused ? labels[locale].play : labels[locale].pause}
          title={paused ? labels[locale].play : labels[locale].pause}
          className="absolute bottom-4 right-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            {paused ? <path d="M7 4v16l13-8z" /> : <path d="M6 4h4v16H6zm8 0h4v16h-4z" />}
          </svg>
        </button>
      )}
    </>
  );
}
