import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { IconArrow } from '@/components/Icons';

export default function PageHero({
  eyebrow,
  title,
  subtitle,
  image,
  breadcrumb,
  children,
  compact = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  image: string;
  breadcrumb?: { label: string; href: string }[];
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={`relative isolate overflow-hidden bg-ink ${compact ? 'min-h-[58vh]' : 'min-h-[70vh]'}`}>
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Image src={image} alt="" fill priority quality={75} sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/45 to-ink/20" />
      </div>

      <div className={`container-lux relative flex flex-col justify-end ${compact ? 'pb-14 pt-40' : 'pb-20 pt-44'}`}>
        {breadcrumb && (
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-white/75">
            {breadcrumb.map((b, i) => (
              <span key={b.href} className="flex items-center gap-2">
                {i > 0 && <span className="text-white/25">/</span>}
                <Link href={b.href} className="transition hover:text-gold-300">
                  {b.label}
                </Link>
              </span>
            ))}
          </nav>
        )}
        {eyebrow && <span className="eyebrow !text-gold-300">{eyebrow}</span>}
        <h1 className="h-display mt-4 max-w-4xl text-balance text-[40px] text-white sm:text-[54px] lg:text-[64px]">
          {title}
        </h1>
        {subtitle && <p className="mt-6 max-w-2xl text-[16px] leading-[1.8] text-white/65">{subtitle}</p>}
        {children}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gold-gradient opacity-60" />
    </section>
  );
}

export function HeroLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="btn-gold mt-10 w-fit">
      {label}
      <IconArrow className="h-4 w-4 rtl:rotate-180" />
    </Link>
  );
}
