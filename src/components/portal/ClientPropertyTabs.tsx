import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import { clientPropertyQuery, resolvedClientProperties } from '@/lib/client-properties';

type Properties = ReturnType<typeof resolvedClientProperties>;

export default function ClientPropertyTabs({locale,basePath,properties,selected}: {
  locale: Locale;
  basePath: string;
  properties: Properties;
  selected?: Properties[number];
}) {
  if (properties.length < 2) return null;
  const title = locale === 'ar' ? 'شققك' : locale === 'en' ? 'Your apartments' : 'Vos appartements';
  return <nav aria-label={title} className="mb-6 rounded-2xl border border-ink/8 bg-white p-4">
    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">{title} · {properties.length}</p>
    <div className="flex flex-wrap gap-2">{properties.map(({project,lot})=>{
      const active=selected?.project.slug===project.slug && selected?.lot.ref===lot.ref;
      return <Link key={`${project.slug}/${lot.ref}`} href={`${basePath}${clientPropertyQuery(project.slug,lot.ref)}`} aria-current={active?'page':undefined} className={`rounded-full border px-4 py-2 text-sm transition ${active?'border-gold-500 bg-gold-50 text-ink':'border-ink/10 text-ink/65 hover:border-gold-300'}`}>{project.name} · {lot.code}</Link>;
    })}</div>
  </nav>;
}
