'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import type { Locale } from '@/i18n/config';
import { IconArrow, IconPin, IconClose } from '@/components/Icons';

export interface ProjectSummary {
  slug: string;
  name: string;
  subtitle: string;
  city: string;
  cover: string;
  status: 'ongoing' | 'delivered' | 'upcoming';
  foprolos: boolean;
  typologies: string[];
  total: number;
  available: number;
  minArea: number;
}

export interface ExplorerLabels {
  all: string;
  status: string;
  city: string;
  typology: string;
  search: string;
  reset: string;
  results: string;
  noResult: string;
  foprolos: string;
  statusLabels: { ongoing: string; delivered: string; upcoming: string };
  sold: string;
  available: string;
  view: string;
  lots: string;
  from: string;
}

export default function ProjectsExplorer({
  projects,
  locale,
  labels,
}: {
  projects: ProjectSummary[];
  locale: Locale;
  labels: ExplorerLabels;
}) {
  const params = useSearchParams();
  const [status, setStatus] = useState<string>(params.get('status') ?? 'all');
  const [city, setCity] = useState('all');
  const [typology, setTypology] = useState('all');
  const [query, setQuery] = useState('');

  const cities = useMemo(() => Array.from(new Set(projects.map((p) => p.city))).sort(), [projects]);
  const typologies = useMemo(
    () => Array.from(new Set(projects.flatMap((p) => p.typologies))).sort(),
    [projects],
  );

  const filtered = projects.filter((p) => {
    if (status !== 'all' && p.status !== status) return false;
    if (city !== 'all' && p.city !== city) return false;
    if (typology !== 'all' && !p.typologies.includes(typology)) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      if (!`${p.name} ${p.subtitle} ${p.city}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const dirty = status !== 'all' || city !== 'all' || typology !== 'all' || query !== '';

  return (
    <>
      <div className="sticky top-[76px] z-30 -mx-5 border-y border-ink/8 bg-ivory/95 px-5 py-4 backdrop-blur-lg sm:-mx-8 sm:px-8 lg:top-[84px]">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex flex-wrap gap-1.5 rounded-full bg-white p-1 shadow-card ring-1 ring-ink/5">
            {(
              [
                ['all', labels.all],
                ['ongoing', labels.statusLabels.ongoing],
                ['delivered', labels.statusLabels.delivered],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={`rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] transition ${
                  status === value ? 'bg-gold-gradient text-ink' : 'text-ink/55 hover:text-gold-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <select value={city} onChange={(e) => setCity(e.target.value)} className="field !w-auto !rounded-full !py-2.5 text-[12.5px]">
            <option value="all">
              {labels.city} — {labels.all}
            </option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {typologies.length > 0 && (
            <select
              value={typology}
              onChange={(e) => setTypology(e.target.value)}
              className="field !w-auto !rounded-full !py-2.5 text-[12.5px]"
            >
              <option value="all">
                {labels.typology} — {labels.all}
              </option>
              {typologies.map((ty) => (
                <option key={ty} value={ty}>
                  {ty}
                </option>
              ))}
            </select>
          )}

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.search}
            className="field !w-auto min-w-[200px] flex-1 !rounded-full !py-2.5 text-[12.5px]"
          />

          {dirty && (
            <button
              type="button"
              onClick={() => {
                setStatus('all');
                setCity('all');
                setTypology('all');
                setQuery('');
              }}
              className="flex items-center gap-1.5 rounded-full border border-ink/12 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink/55 transition hover:border-gold-400 hover:text-gold-600"
            >
              <IconClose className="h-3.5 w-3.5" />
              {labels.reset}
            </button>
          )}

          <span className="ms-auto shrink-0 text-[12px] text-ink/40">
            {filtered.length} {labels.results}
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-24 text-center text-[15px] text-ink/45">{labels.noResult}</p>
      ) : (
        <div className="grid gap-8 py-14 lg:gap-10">
          {filtered.map((p, i) => (
            <Link
              key={p.slug}
              href={`/${locale}/projets/${p.slug}`}
              className="group grid overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/5 transition-all duration-500 hover:shadow-lux md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]"
            >
              <div className="relative aspect-[16/10] overflow-hidden md:aspect-auto md:min-h-[340px]">
                <Image
                  src={p.cover}
                  alt={p.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 55vw"
                  priority={i === 0}
                  className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]"
                />
                <div className="absolute start-4 top-4 flex flex-wrap gap-2">
                  <span className={`chip ${p.status === 'ongoing' ? 'bg-gold-gradient text-ink' : 'bg-white/90 text-ink/70'}`}>
                    {labels.statusLabels[p.status]}
                  </span>
                  {p.foprolos && <span className="chip bg-ink/85 text-gold-200">FOPROLOS</span>}
                </div>
              </div>

              <div className="flex flex-col justify-center p-7 lg:p-10">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-600">
                  <IconPin className="h-3.5 w-3.5" />
                  {p.city}
                </p>
                <h2 className="h-display mt-3 text-[30px] lg:text-[38px]">{p.name}</h2>
                <div className="rule-gold mt-5" />
                <p className="mt-5 text-[14.5px] leading-[1.8] text-ink/60">{p.subtitle}</p>

                <div className="mt-7 flex flex-wrap gap-x-8 gap-y-4">
                  {p.status === 'ongoing' && p.total > 0 ? (
                    <>
                      <Stat value={String(p.available)} label={labels.available} accent />
                      <Stat value={String(p.total)} label={labels.lots} />
                      {p.minArea > 0 && <Stat value={`${p.minArea.toFixed(0)} m²`} label={labels.from} />}
                      {p.typologies.length > 0 && <Stat value={p.typologies.join(' · ')} label={labels.typology} />}
                    </>
                  ) : (
                    <Stat value={labels.sold} label={labels.statusLabels.delivered} />
                  )}
                </div>

                <span className="mt-8 inline-flex w-fit items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-ink transition group-hover:text-gold-600">
                  {labels.view}
                  <IconArrow className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function Stat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div>
      <p className={`font-display text-[24px] font-light leading-none ${accent ? 'text-gold-600' : 'text-ink'}`}>{value}</p>
      <p className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</p>
    </div>
  );
}
