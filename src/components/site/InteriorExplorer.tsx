'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import PlanViewer from './PlanViewer';
import type { PlanLabels } from './PlanViewer';

const copy = {
  fr: { title: 'Imaginez votre intérieur', body: 'Explorez toutes les pièces dans une ambiance de luxe contemporain : pierre claire, bois foncé et touches dorées.', block: 'Bloc', apartment: 'Appartement', open: 'Découvrir cet appartement', plan: 'Plan original · PDF', note: 'Illustration d’aménagement. Le plan de vente reste la référence pour les dimensions et les équipements.' },
  en: { title: 'Imagine your interior', body: 'Explore every room in a contemporary luxury setting: light stone, dark wood and gold accents.', block: 'Block', apartment: 'Apartment', open: 'Explore this apartment', plan: 'Original plan · PDF', note: 'Interior design illustration. Refer to the sales plan for dimensions and fixed equipment.' },
  ar: { title: 'تخيّل تصميم منزلك', body: 'اكتشف جميع الغرف بأسلوب الفخامة المعاصرة: حجر فاتح وخشب داكن ولمسات ذهبية.', block: 'العمارة', apartment: 'الشقة', open: 'اكتشف هذه الشقة', plan: 'المخطط الأصلي · PDF', note: 'تصور للتأثيث. مخطط البيع هو المرجع للأبعاد والتجهيزات الثابتة.' },
};

export default function InteriorExplorer({ locale, references, labels }: { locale: Locale; references: string[]; labels: PlanLabels }) {
  const [reference, setReference] = useState(references[0]);
  const t = copy[locale];
  if (!reference) return null;
  const block = reference[0];
  return <div className="mb-16 overflow-hidden rounded-3xl border border-ink/10 bg-ivory">
    <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1fr_2fr]">
      <div>
        <p className="eyebrow">La Gloire · 3D</p>
        <h3 className="h-display mt-4 text-3xl">{t.title}</h3>
        <p className="mt-4 text-sm leading-relaxed text-ink/60">{t.body}</p>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <label className="text-xs text-ink/60">{t.block}
            <select value={block} onChange={e => setReference(references.find(ref => ref.startsWith(e.target.value))!)} className="mt-2 w-full rounded-lg border border-ink/15 bg-white p-3 text-sm text-ink focus:border-gold-500">
              {[...new Set(references.map(ref => ref[0]))].map(value => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-xs text-ink/60">{t.apartment}
            <select value={reference} onChange={e => setReference(e.target.value)} className="mt-2 w-full rounded-lg border border-ink/15 bg-white p-3 text-sm text-ink focus:border-gold-500">
              {references.filter(ref => ref.startsWith(block)).map(ref => <option key={ref}>{ref}</option>)}
            </select>
          </label>
        </div>
        <Link href={`/${locale}/projets/residence-la-gloire/appartements/${reference}#interieur`} className="btn-gold mt-6">{t.open}</Link>
        <a href={`/plans/la-gloire/${reference}.pdf`} download className="mt-4 block text-xs underline underline-offset-4">{t.plan}</a>
        <p className="mt-6 text-xs leading-relaxed text-ink/50">{t.note}</p>
      </div>
      <PlanViewer key={reference} image={`/interiors/la-gloire/${reference}.webp`} alt={`${t.apartment} ${reference} · 3D`} labels={labels} exists />
    </div>
  </div>;
}
