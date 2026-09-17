'use client';

import dynamic from 'next/dynamic';
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
      {isLaGloire && view === 'architect' ? <GloireArchitectMaquette locale={locale} labels={labels} /> : <Maquette3D
      key={isLaGloire ? 'availability' : projectSlug}
      lots={lots}
      massing={displayMassing}
      labels={labels}
      selectedRef={selectedRef}
      initialMode={isLaGloire ? 'commercial' : 'realistic'}
      hideModeToggle={isLaGloire}
      onSelect={(ref) => router.push(`/${locale}/projets/${projectSlug}/appartements/${ref}`)}
    />}
    </div>
  );
}
