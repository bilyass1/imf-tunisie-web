'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Locale } from '@/i18n/config';
import type { Lot, ProjectBlock } from '@/lib/types';
import { formatArea, formatMoney, floorLabel } from '@/lib/format';
import { IconGrid, IconList, IconArrow, IconDownload, IconClose } from '@/components/Icons';

export interface AvailabilityLabels {
  title: string;
  subtitle: string;
  block: string;
  floor: string;
  allFloors: string;
  typology: string;
  legend: { available: string; reserved: string; sold: string };
  table: {
    code: string;
    typology: string;
    gross: string;
    sellable: string;
    garden: string;
    terrace: string;
    price: string;
    status: string;
  };
  empty: string;
  selected: string;
  request: string;
  onRequest: string;
  stats: { available: string; reserved: string; sold: string; total: string };
  note: string;
  gridView: string;
  listView: string;
  all: string;
  downloadPlan: string;
  sheet: string;
}

const STATUS_STYLES: Record<Lot['status'], { tile: string; dot: string; text: string }> = {
  available: {
    tile: 'border-emerald-500/35 bg-emerald-50 hover:border-emerald-500 hover:bg-emerald-100 text-emerald-900',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
  },
  reserved: {
    tile: 'border-gold-400 bg-gold-100 hover:border-gold-500 hover:bg-gold-200 text-gold-700',
    dot: 'bg-gold-500',
    text: 'text-gold-700',
  },
  sold: {
    tile: 'border-red-400 bg-red-50 hover:border-red-500 hover:bg-red-100 text-red-900',
    dot: 'bg-red-500',
    text: 'text-red-700',
  },
};

export default function AvailabilityPlan({
  projectSlug,
  blocks,
  lots,
  locale,
  labels,
}: {
  projectSlug: string;
  blocks: ProjectBlock[];
  lots: Lot[];
  locale: Locale;
  labels: AvailabilityLabels;
}) {
  const blockIds = blocks.length ? blocks.map((b) => b.id) : Array.from(new Set(lots.map((l) => l.block)));
  const [block, setBlock] = useState<string>(blockIds[0] ?? '');
  const [floor, setFloor] = useState<number | 'all'>('all');
  const [typology, setTypology] = useState<string>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selected, setSelected] = useState<Lot | null>(null);

  const typologies = useMemo(() => Array.from(new Set(lots.map((l) => l.typology))).sort(), [lots]);

  const blockLots = useMemo(() => lots.filter((l) => l.block === block), [lots, block]);

  const filtered = useMemo(
    () =>
      blockLots.filter(
        (l) => (floor === 'all' || l.floor === floor) && (typology === 'all' || l.typology === typology),
      ),
    [blockLots, floor, typology],
  );

  const floors = useMemo(
    () => Array.from(new Set(blockLots.map((l) => l.floor))).sort((a, b) => b - a),
    [blockLots],
  );

  const stats = useMemo(
    () => ({
      total: blockLots.length,
      available: blockLots.filter((l) => l.status === 'available').length,
      reserved: blockLots.filter((l) => l.status === 'reserved').length,
      sold: blockLots.filter((l) => l.status === 'sold').length,
    }),
    [blockLots],
  );

  const byFloor = useMemo(() => {
    const map = new Map<number, Lot[]>();
    filtered.forEach((lot) => {
      const arr = map.get(lot.floor) ?? [];
      arr.push(lot);
      map.set(lot.floor, arr);
    });
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [filtered]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        {/* ---- Contrôles ---- */}
        <div className="flex flex-wrap items-center gap-2.5">
          {blockIds.length > 1 && (
            <div className="flex flex-wrap gap-1.5 rounded-full bg-white p-1 shadow-card ring-1 ring-ink/5">
              {blockIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setBlock(id);
                    setFloor('all');
                    setSelected(null);
                  }}
                  className={`rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] transition ${
                    block === id ? 'bg-gold-gradient text-ink' : 'text-ink/55 hover:text-gold-600'
                  }`}
                >
                  {labels.block} {id}
                </button>
              ))}
            </div>
          )}

          <select
            value={typology}
            onChange={(e) => setTypology(e.target.value)}
            className="rounded-full border border-ink/12 bg-white px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink/65 outline-none transition focus:border-gold-400"
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

          <div className="ms-auto flex rounded-full bg-white p-1 shadow-card ring-1 ring-ink/5">
            <button
              type="button"
              onClick={() => setView('grid')}
              aria-label={labels.gridView}
              className={`grid h-8 w-9 place-items-center rounded-full transition ${
                view === 'grid' ? 'bg-ink text-white' : 'text-ink/45'
              }`}
            >
              <IconGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              aria-label={labels.listView}
              className={`grid h-8 w-9 place-items-center rounded-full transition ${
                view === 'list' ? 'bg-ink text-white' : 'text-ink/45'
              }`}
            >
              <IconList className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ---- Légende + stats ---- */}
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-ink/8 bg-white px-5 py-4 text-[12.5px]">
          {(['available', 'reserved', 'sold'] as const).map((s) => (
            <span key={s} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${STATUS_STYLES[s].dot}`} />
              <span className="text-ink/60">{labels.legend[s]}</span>
              <strong className="font-semibold text-ink">{stats[s]}</strong>
            </span>
          ))}
          <span className="ms-auto text-ink/45">
            {stats.total} {labels.stats.total}
          </span>
        </div>

        {/* ---- Vue plan (immeuble) ---- */}
        {view === 'grid' ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-ink/8 bg-white">
            {byFloor.length === 0 && <p className="p-10 text-center text-sm text-ink/45">{labels.empty}</p>}
            {byFloor.map(([f, floorLots], i) => (
              <div
                key={f}
                className={`flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-5 sm:px-6 ${
                  i > 0 ? 'border-t border-ink/8' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => setFloor(floor === f ? 'all' : f)}
                  className={`w-full shrink-0 rounded-lg px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-[0.14em] transition sm:w-[124px] ${
                    floor === f ? 'bg-ink text-gold-200' : 'bg-sand/60 text-ink/55 hover:text-gold-600'
                  }`}
                >
                  {floorLabel(f, locale)}
                </button>

                <div className="flex flex-wrap gap-2.5">
                  {floorLots.map((lot) => {
                    const st = STATUS_STYLES[lot.status];
                    const active = selected?.ref === lot.ref;
                    return (
                      <button
                        key={lot.ref}
                        type="button"
                        onClick={() => setSelected(active ? null : lot)}
                        className={`min-w-[92px] rounded-lg border px-3 py-2.5 text-start transition-all duration-200 ${st.tile} ${
                          active ? 'ring-2 ring-gold-400 ring-offset-2' : ''
                        }`}
                      >
                        <span className="block text-[13px] font-bold leading-none">{lot.code}</span>
                        <span className="mt-1.5 block text-[10.5px] font-semibold uppercase tracking-wider opacity-70">
                          {lot.typology}
                        </span>
                        {lot.sellableArea ? (
                          <span className="mt-0.5 block text-[10.5px] opacity-60">
                            {lot.sellableArea.toFixed(2)} m²
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ---- Vue liste ---- */
          <div className="mt-6 overflow-x-auto rounded-2xl border border-ink/8 bg-white">
            <table className="w-full min-w-[720px] text-start text-[13px]">
              <thead>
                <tr className="border-b border-ink/8 bg-sand/40 text-[11px] uppercase tracking-[0.12em] text-ink/50">
                  <th className="px-4 py-3 text-start font-semibold">{labels.table.code}</th>
                  <th className="px-4 py-3 text-start font-semibold">{labels.floor}</th>
                  <th className="px-4 py-3 text-start font-semibold">{labels.table.typology}</th>
                  <th className="px-4 py-3 text-start font-semibold">{labels.table.gross}</th>
                  <th className="px-4 py-3 text-start font-semibold">{labels.table.sellable}</th>
                  <th className="px-4 py-3 text-start font-semibold">{labels.table.garden}</th>
                  <th className="px-4 py-3 text-start font-semibold">{labels.table.terrace}</th>
                  <th className="px-4 py-3 text-start font-semibold">{labels.table.status}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-ink/45">
                      {labels.empty}
                    </td>
                  </tr>
                )}
                {filtered.map((lot) => (
                  <tr
                    key={lot.ref}
                    onClick={() => setSelected(lot)}
                    className="cursor-pointer border-b border-ink/5 transition hover:bg-sand/40"
                  >
                    <td className="px-4 py-3 font-semibold text-ink">{lot.code}</td>
                    <td className="px-4 py-3 text-ink/60">{floorLabel(lot.floor, locale)}</td>
                    <td className="px-4 py-3 text-ink/60">{lot.typology}</td>
                    <td className="px-4 py-3 text-ink/60">{formatArea(lot.grossArea, locale)}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{formatArea(lot.sellableArea, locale)}</td>
                    <td className="px-4 py-3 text-ink/60">{lot.gardenArea ? formatArea(lot.gardenArea, locale) : '—'}</td>
                    <td className="px-4 py-3 text-ink/60">{lot.terraceArea ? formatArea(lot.terraceArea, locale) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-2 font-semibold ${STATUS_STYLES[lot.status].text}`}>
                        <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[lot.status].dot}`} />
                        {labels.legend[lot.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-[12px] leading-relaxed text-ink/40">{labels.note}</p>
      </div>

      {/* ---- Panneau de détail ---- */}
      <aside className="lg:sticky lg:top-28 lg:h-fit">
        {selected ? (
          <div className="overflow-hidden rounded-2xl border border-ink/8 bg-white shadow-card">
            <div className="relative bg-ink px-6 py-6 text-white">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="absolute end-4 top-4 text-white/50 transition hover:text-gold-300"
                aria-label="×"
              >
                <IconClose className="h-4 w-4" />
              </button>
              <span className="eyebrow !text-gold-300">{labels.selected}</span>
              <p className="mt-3 font-display text-[34px] font-light leading-none">{selected.code}</p>
              <p className="mt-2 text-[13px] text-white/55">
                {labels.block} {selected.block} · {floorLabel(selected.floor, locale)} · {selected.typology}
              </p>
              <span
                className={`chip mt-4 ${
                  selected.status === 'available'
                    ? 'bg-emerald-400/15 text-emerald-300'
                    : selected.status === 'reserved'
                      ? 'bg-gold-400/20 text-gold-200'
                      : 'bg-red-400/20 text-red-200'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLES[selected.status].dot}`} />
                {labels.legend[selected.status]}
              </span>
            </div>

            <dl className="divide-y divide-ink/6 px-6">
              {[
                { k: labels.table.sellable, v: formatArea(selected.sellableArea, locale), strong: true },
                { k: labels.table.gross, v: formatArea(selected.grossArea, locale) },
                ...(selected.gardenArea ? [{ k: labels.table.garden, v: formatArea(selected.gardenArea, locale) }] : []),
                ...(selected.terraceArea ? [{ k: labels.table.terrace, v: formatArea(selected.terraceArea, locale) }] : []),
                { k: labels.table.price, v: selected.price ? formatMoney(selected.price, locale) : labels.onRequest },
              ].map((row) => (
                <div key={row.k} className="flex items-center justify-between gap-4 py-3.5">
                  <dt className="text-[12px] uppercase tracking-[0.1em] text-ink/45">{row.k}</dt>
                  <dd className={row.strong ? 'font-display text-[20px] text-ink' : 'text-[14px] font-medium text-ink/75'}>
                    {row.v}
                  </dd>
                </div>
              ))}
            </dl>
            {projectSlug === 'diar-al-yassamine' && selected.block === 'A5.a' && (
              <p className="px-6 pt-4 text-xs leading-relaxed text-ink/55">
                {locale === 'ar' ? 'المساحات تقريبية حسب مخطط البيع الفردي.' : locale === 'en' ? 'Approximate areas from the individual sales plan.' : 'Surfaces approximatives selon le plan de vente individuel.'}
              </p>
            )}

            <div className="flex flex-col gap-2.5 p-6 pt-2">
              <Link
                href={`/${locale}/projets/${projectSlug}/appartements/${selected.ref}`}
                className="btn-ghost w-full"
              >
                {labels.sheet}
                <IconArrow className="h-4 w-4 rtl:rotate-180" />
              </Link>
              {selected.status !== 'sold' && (
                <Link
                  href={`/${locale}/contact?project=${projectSlug}&lot=${encodeURIComponent(selected.code)}`}
                  className="btn-gold w-full"
                >
                  {labels.request}
                  <IconArrow className="h-4 w-4 rtl:rotate-180" />
                </Link>
              )}
              {selected.planUrl && (
                <a href={selected.planUrl} target="_blank" rel="noreferrer" className="btn-ghost w-full">
                  <IconDownload className="h-4 w-4" />
                  {labels.downloadPlan}
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-8 text-center">
            <p className="font-display text-[22px] font-light text-ink/70">{labels.title}</p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink/50">{labels.subtitle}</p>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {(['available', 'reserved', 'sold'] as const).map((s) => (
                <div key={s} className="rounded-xl bg-sand/50 px-2 py-3">
                  <p className={`font-display text-[24px] leading-none ${STATUS_STYLES[s].text}`}>{stats[s]}</p>
                  <p className="mt-1.5 text-[10px] uppercase tracking-wider text-ink/45">{labels.legend[s]}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
