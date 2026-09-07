import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import { SITE } from '@/lib/site';

/**
 * Logo officiel IMF (fichier fourni par le client, nettoyé et détouré).
 * — `logo-mark*.png`  : le pictogramme seul (en-tête, pied de page, favicon)
 * — `logo-imf*.png`   : le lock-up complet (pictogramme + IMF + baseline)
 * Les variantes « blanc » sont destinées aux fonds sombres.
 */
export function LogoMark({ className = '', light = false }: { className?: string; light?: boolean }) {
  return (
    <Image
      src={light ? '/media/brand/logo-mark-blanc.png' : '/media/brand/logo-mark.png'}
      alt=""
      width={520}
      height={677}
      priority
      className={`w-auto object-contain ${className}`}
      aria-hidden="true"
    />
  );
}

/** Lock-up complet — pour les usages où la largeur le permet (partages, documents). */
export function LogoLockup({ className = '', light = false }: { className?: string; light?: boolean }) {
  return (
    <Image
      src={light ? '/media/brand/logo-imf-blanc.png' : '/media/brand/logo-imf.png'}
      alt={SITE.legalName}
      width={1400}
      height={721}
      className={`w-auto object-contain ${className}`}
    />
  );
}

export default function Logo({
  locale,
  light = false,
  compact = false,
}: {
  locale: Locale;
  light?: boolean;
  compact?: boolean;
}) {
  return (
    <Link href={`/${locale}`} className="group flex items-center gap-3" aria-label={SITE.legalName}>
      <LogoMark className={compact ? 'h-8' : 'h-10'} light={light} />
      <span className="flex flex-col leading-none">
        <span
          className={`font-display font-semibold tracking-[0.06em] ${compact ? 'text-[22px]' : 'text-[26px]'} ${
            light ? 'text-white' : 'text-ink'
          }`}
        >
          IMF
        </span>
        {!compact && (
          <span
            className={`mt-1 hidden whitespace-nowrap text-[8.5px] font-medium uppercase tracking-[0.18em] sm:block ${
              light ? 'text-white/65' : 'text-ink/55'
            }`}
          >
            Immobilière Mseddi Frères
          </span>
        )}
      </span>
    </Link>
  );
}
