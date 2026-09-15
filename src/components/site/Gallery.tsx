'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconArrow, IconArrowLeft, IconClose } from '@/components/Icons';
import { useImmersiveViewer } from './useImmersiveViewer';

export interface GalleryItem {
  src: string;
  caption: string;
}

export default function Gallery({
  items,
  labels,
}: {
  items: GalleryItem[];
  labels: { close: string; previous: string; next: string; of: string };
}) {
  const [index, setIndex] = useState<number | null>(null);
  const dialog = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIndex(null), []);
  useImmersiveViewer(index !== null, close, dialog);
  const prev = useCallback(() => setIndex((i) => (i === null ? i : (i - 1 + items.length) % items.length)), [items.length]);
  const next = useCallback(() => setIndex((i) => (i === null ? i : (i + 1) % items.length)), [items.length]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [index, close, prev, next]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map((item, i) => (
          <button
            key={`${item.src}-${i}`}
            type="button"
            onClick={() => setIndex(i)}
            className={`group relative overflow-hidden rounded-xl bg-sand ${
              i === 0 ? 'col-span-2 row-span-2 aspect-square md:aspect-[4/3]' : 'aspect-[4/3]'
            }`}
          >
            <Image
              src={item.src}
              alt={item.caption}
              fill
              sizes={i === 0 ? '(max-width: 768px) 100vw, 60vw' : '(max-width: 768px) 50vw, 25vw'}
              quality={90}
              className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.08]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent transition-opacity duration-300" />
            <span className="absolute inset-x-0 bottom-0 p-3 text-start text-sm font-medium text-white">
              {item.caption}
            </span>
          </button>
        ))}
      </div>

      {index !== null && (
        <div ref={dialog} className="fixed inset-0 z-[100] flex flex-col bg-ink/[0.97] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={items[index].caption}>
          <div className="flex items-center justify-between px-5 py-4 text-white/70">
            <span className="text-[12px] uppercase tracking-[0.2em]">
              {index + 1} {labels.of} {items.length}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label={labels.close}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/20 transition hover:border-gold-400 hover:text-gold-300"
            >
              <IconClose className="h-5 w-5" />
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center px-4 pb-4">
            <button
              type="button"
              onClick={prev}
              aria-label={labels.previous}
              className="absolute start-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white/80 transition hover:border-gold-400 hover:text-gold-300 md:start-8"
            >
              <IconArrowLeft className="h-5 w-5 rtl:rotate-180" />
            </button>

            <div className="relative h-full w-full max-w-6xl">
              <Image
                src={items[index].src}
                alt={items[index].caption}
                fill
                sizes="100vw"
                quality={95}
                className="object-contain"
                priority
              />
            </div>

            <button
              type="button"
              onClick={next}
              aria-label={labels.next}
              className="absolute end-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white/80 transition hover:border-gold-400 hover:text-gold-300 md:end-8"
            >
              <IconArrow className="h-5 w-5 rtl:rotate-180" />
            </button>
          </div>

          <p className="pb-6 text-center text-[14px] text-white/70">{items[index].caption}</p>
        </div>
      )}
    </>
  );
}
