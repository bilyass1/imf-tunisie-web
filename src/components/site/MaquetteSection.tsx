'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { LA_GLOIRE_SITE } from '@/lib/la-gloire-footprints';
import type { MaquetteLabels } from './Maquette3D';
import type { Lot, Massing } from '@/lib/types';

/** Chargé à la demande : la maquette et three.js restent hors du bundle initial. */
const Maquette3D = dynamic(() => import('./Maquette3D'), {
  ssr: false,
  loading: () => <div className="h-[480px] w-full animate-pulse rounded-2xl bg-ink/10 sm:h-[600px]" />,
});

const GloireArchitectMaquette = dynamic(() => import('./GloireArchitectMaquette'), {
  ssr: false,
  loading: () => <div className="h-[520px] w-full animate-pulse rounded-2xl bg-ink/10 sm:h-[650px]" />,
});

const viewCopy = {
  fr: { architect: 'Modèle architecte', availability: 'Disponibilités' },
  en: { architect: 'Architect model', availability: 'Availability' },
  ar: { architect: 'نموذج المهندس', availability: 'التوفر' },
};

export default function MaquetteSection({
  locale,
  projectSlug,
  lots,
  massing,
  labels,
  selectedRef,
}: {
  locale: string;
  projectSlug: string;
  lots: Lot[];
  massing: Massing;
  labels: MaquetteLabels;
  selectedRef?: string;
}) {
  const router = useRouter();
  const isLaGloire = projectSlug === 'residence-la-gloire';
  const [view, setView] = useState<'architect' | 'availability'>('architect');
  const [apartmentRef, setApartmentRef] = useState(selectedRef ?? lots[0]?.ref ?? '');
  const apartmentCopy = locale === 'en'
    ? { label: 'Apartment', open: 'Open apartment details', pick: 'Select on the interactive plan' }
    : locale === 'ar'
      ? { label: 'الشقة', open: 'فتح تفاصيل الشقة', pick: 'اختر من المخطط التفاعلي' }
      : { label: 'Appartement', open: 'Voir la fiche appartement', pick: 'Choisir sur le plan interactif' };
  const viewLabels = viewCopy[locale as keyof typeof viewCopy] ?? viewCopy.fr;
  // Existing CRM snapshots can still contain the earlier 3.10 m estimate.
  // Apply the verified drawing height without rewriting any commercial data.
  const displayMassing = useMemo(() => projectSlug === 'residence-la-gloire'
    ? { ...massing, floorHeight: LA_GLOIRE_SITE.floorHeight }
    : massing, [massing, projectSlug]);
  return (
    <div>
      {isLaGloire && <div className="mb-4 flex w-fit gap-1 rounded-full border border-ink/10 bg-white p-1 shadow-sm">
        {(['architect', 'availability'] as const).map(value => <button key={value} type="button" className={`rounded-full px-4 py-2 text-sm transition-colors ${view === value ? 'bg-ink text-ivory' : 'text-ink/70 hover:text-ink'}`} aria-pressed={view === value} onClick={() => setView(value)}>{viewLabels[value]}</button>)}
      </div>}
      {isLaGloire && view === 'architect' ? <GloireArchitectMaquette locale={locale} labels={labels} lots={lots} onSelect={ref => router.push(`/${locale}/projets/${projectSlug}/appartements/${ref}`)} /> : <Maquette3D
      key={isLaGloire ? 'availability' : projectSlug}
      locale={locale}
      lots={lots}
      massing={displayMassing}
      labels={labels}
      selectedRef={selectedRef}
      initialMode={isLaGloire ? 'commercial' : 'realistic'}
      hideModeToggle={isLaGloire}
      onSelect={(ref) => router.push(`/${locale}/projets/${projectSlug}/appartements/${ref}`)}
    />}
      {isLaGloire && view === 'architect' && <div className="flex flex-wrap items-end gap-4 rounded-b-2xl bg-ink p-5 text-ivory">
        <label className="flex min-w-56 flex-col gap-2 text-sm">
          <span>{apartmentCopy.label}</span>
          <select className="rounded-lg border border-white/25 bg-ink px-3 py-3 text-ivory" value={apartmentRef} onChange={event => setApartmentRef(event.target.value)}>
            {Array.from(new Set(lots.map(lot => lot.block))).map(block => <optgroup key={block} label={`Bloc ${block}`}>
              {lots.filter(lot => lot.block === block).map(lot => <option key={lot.ref} value={lot.ref}>{lot.code} · {lot.typology} · {lot.floor === 0 ? 'RDC' : `R+${lot.floor}`}</option>)}
            </optgroup>)}
          </select>
        </label>
        {apartmentRef && <Link className="btn-gold" href={`/${locale}/projets/${projectSlug}/appartements/${apartmentRef}`}>{apartmentCopy.open} →</Link>}
        <button type="button" className="rounded-lg border border-white/25 px-4 py-3 text-sm hover:bg-white/10" onClick={() => setView('availability')}>{apartmentCopy.pick}</button>
      </div>}
    </div>
  );
}
