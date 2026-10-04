'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const eventName = 'imf:commercial-public-preview';

export function showCommercialPublicPreview(path: string, published = false) {
  window.dispatchEvent(new CustomEvent(eventName, { detail: { path, published } }));
}

type PreviewProject = {
  slug: string;
  name: string;
  lots: { ref: string; code: string }[];
};

export default function CommercialPublicPreview({ projects, initialPath }: { projects: PreviewProject[]; initialPath?: string }) {
  const { locale } = useParams<{ locale: string }>();
  const [projectSlug, setProjectSlug] = useState(initialPath === '/' ? '' : projects[0]?.slug ?? '');
  const [lotRef, setLotRef] = useState('');
  const [path, setPath] = useState(initialPath ?? (projects[0] ? `/projets/${projects[0].slug}` : '/'));
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [published, setPublished] = useState(false);
  const project = projects.find(item => item.slug === projectSlug);

  useEffect(() => {
    const onPreview = (event: Event) => {
      const { path: nextPath, published: isPublished } = (event as CustomEvent<{ path: string; published: boolean }>).detail;
      if (!nextPath.startsWith('/') || nextPath.startsWith('//')) return;
      const match = /^\/projets\/([^/#?]+)(?:\/appartements\/([^/#?]+))?/.exec(nextPath);
      if (match && projects.some(item => item.slug === match[1])) {
        setProjectSlug(match[1]);
        setLotRef(match[2] ?? '');
      } else if (nextPath === '/') {
        setProjectSlug('');
        setLotRef('');
      }
      setPath(nextPath);
      setPublished(isPublished);
      setLoading(true);
      setRevision(value => value + 1);
    };
    window.addEventListener(eventName, onPreview);
    return () => window.removeEventListener(eventName, onPreview);
  }, [projects]);

  const [pathname, hash = ''] = path.split('#', 2);
  const publicUrl = `/${locale}${pathname}${revision ? `?admin_preview=${revision}` : ''}${hash ? `#${hash}` : ''}`;
  const chooseProject = (slug: string) => {
    setProjectSlug(slug);
    setLotRef('');
    showCommercialPublicPreview(slug ? `/projets/${slug}` : '/');
  };
  const chooseLot = (ref: string) => {
    setLotRef(ref);
    showCommercialPublicPreview(!projectSlug ? '/' : ref ? `/projets/${projectSlug}/appartements/${ref}` : `/projets/${projectSlug}`);
  };

  return <section className="overflow-hidden rounded-2xl border border-gold-500/30 bg-white shadow-card" aria-label="Aperçu du site public">
    <div className="border-b border-ink/10 bg-sand/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-700">Site public</p>
          <h2 className="mt-1 font-display text-2xl">Aperçu en direct</h2>
        </div>
        <button type="button" onClick={() => { setLoading(true); setRevision(value => value + 1); }} className="btn-ghost text-xs">Actualiser</button>
      </div>
      <p className="mt-2 text-sm text-ink/60">La page publique se recharge après chaque modification enregistrée.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium">Résidence
          <select className="field mt-1" value={projectSlug} onChange={event => chooseProject(event.target.value)}>
            <option value="">Accueil IMF</option>
            {projects.map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
        </label>
        <label className="block text-xs font-medium">Page
          <select className="field mt-1" value={lotRef} onChange={event => chooseLot(event.target.value)} disabled={!projectSlug}>
            <option value="">{projectSlug ? 'Résidence' : 'Accueil'}</option>
            {project?.lots.map(item => <option key={item.ref} value={item.ref}>Appartement {item.code}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span role="status" className={published ? 'font-medium text-emerald-700' : 'text-ink/55'}>{published ? 'Modification publiée · aperçu actualisé' : loading ? 'Chargement de l’aperçu…' : 'Page publique actuelle'}</span>
        <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-gold-700 underline">Ouvrir la page publique ↗</a>
      </div>
    </div>
    <div className="relative bg-ivory">
      {loading && <p className="absolute inset-x-0 top-4 z-10 mx-auto w-fit rounded-full bg-white/95 px-4 py-2 text-sm shadow-card">Chargement…</p>}
      <iframe key={`${path}/${revision}`} title={`Aperçu public : ${project?.name ?? 'IMF'}`} src={publicUrl} onLoad={() => setLoading(false)} loading="lazy" className="h-[620px] w-full border-0 sm:h-[760px]" />
    </div>
  </section>;
}
