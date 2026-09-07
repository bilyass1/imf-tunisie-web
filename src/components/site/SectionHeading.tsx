import type { ReactNode } from 'react';
import Reveal from '@/components/Reveal';

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'start',
  light = false,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'start' | 'center';
  light?: boolean;
  action?: ReactNode;
}) {
  const centered = align === 'center';
  return (
    <div
      className={`flex flex-col gap-6 ${
        centered ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'
      }`}
    >
      <Reveal className={centered ? 'max-w-2xl' : 'max-w-2xl'}>
        {eyebrow && <span className={`eyebrow ${light ? '!text-gold-300' : ''}`}>{eyebrow}</span>}
        <h2
          className={`h-display mt-4 text-[34px] sm:text-[42px] lg:text-[48px] ${
            light ? 'text-white' : 'text-ink'
          }`}
        >
          {title}
        </h2>
        <div className={`rule-gold mt-5 ${centered ? 'mx-auto' : ''}`} />
        {subtitle && (
          <p className={`mt-5 text-[15px] leading-[1.8] ${light ? 'text-white/60' : 'text-ink/60'}`}>{subtitle}</p>
        )}
      </Reveal>
      {action && <Reveal delay={120}>{action}</Reveal>}
    </div>
  );
}
