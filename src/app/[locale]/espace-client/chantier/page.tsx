import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireClient } from '@/lib/auth';
import { getProjects } from '@/lib/db';
import { clientConstructionPhotos, resolvedClientProperties, selectedClientProperty } from '@/lib/client-properties';
import { t } from '@/lib/format';
import PortalShell from '@/components/portal/PortalShell';
import { clientNav } from '@/components/portal/clientNav';
import ClientPropertyTabs from '@/components/portal/ClientPropertyTabs';
import { IconCheck } from '@/components/Icons';
import ProgressMeter from '@/components/site/ProgressMeter';

export default async function ProgressPage({params,searchParams}: {params:Promise<{locale:string}>;searchParams:Promise<{project?:string;lot?:string}>}) {
  const {locale:raw}=await params;if(!isLocale(raw))notFound();const locale=raw as Locale;
  const dict=getDictionary(locale);const user=await requireClient(locale);
  const properties=resolvedClientProperties(user,await getProjects());const selected=selectedClientProperty(properties,await searchParams);
  const project=selected?.project,lot=selected?.lot,steps=project?.progress??[];
  const photos=[...(project?.constructionPhotos??[]),...(lot?.constructionPhotos??[]),...clientConstructionPhotos(user,selected?{projectSlug:selected.project.slug,lotRef:selected.lot.ref}:undefined)];
  const photoTitle=locale==='ar'?'صور تقدم الأشغال':locale==='en'?'Construction photos':'Photos de chantier';
  const emptyPhotos=locale==='ar'?'لم تتم إضافة صور لهذا الملف بعد.':locale==='en'?'No photos have been added to this file yet.':'Aucune photo ajoutée à ce dossier pour le moment.';
  return <PortalShell locale={locale} title={dict.client.progress} subtitle={project?.name} userName={user.name} nav={clientNav(locale,dict,selected?{projectSlug:selected.project.slug,lotRef:selected.lot.ref}:undefined)} active="progress" backLabel={dict.auth.backToSite} logoutLabel={dict.auth.logout}>
    <ClientPropertyTabs locale={locale} basePath={`/${locale}/espace-client/chantier`} properties={properties} selected={selected}/>
    <section data-construction-photos className="mb-8 space-y-4" aria-label={photoTitle}>
      <h2 className="font-display text-2xl">{photoTitle}</h2>
      {photos.length?<div className="grid gap-4 sm:grid-cols-2">{photos.map((photo,index)=><figure key={`${photo.src}/${index}`} className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
        <img src={photo.src} alt={t(photo.caption,locale)} loading={index?'lazy':'eager'} className="aspect-[4/3] w-full object-cover"/>
        <figcaption className="px-4 py-3 text-sm text-ink/70">{t(photo.caption,locale)}</figcaption>
      </figure>)}</div>:<p className="rounded-xl border border-dashed border-ink/15 p-6 text-ink/55">{emptyPhotos}</p>}
    </section>
    <section data-construction-stats className="space-y-5" aria-label={dict.project.progress}>
      <h2 className="font-display text-2xl">{dict.project.progress}</h2>
      <ProgressMeter value={project?.progressPercent} locale={locale} label={project?.name}/>
      <ProgressMeter value={lot?.progressPercent} locale={locale} label={lot?.code}/>
      {steps.length>0?<ol className="space-y-6 rounded-2xl border border-ink/8 bg-white p-5 sm:p-7">{steps.map(step=><li key={step.label.fr}>
        <div className="flex items-start justify-between gap-4"><p className="flex items-center gap-2 text-sm font-medium text-ink">{step.done && <IconCheck className="h-4 w-4 shrink-0 text-emerald-600"/>}{t(step.label,locale)}</p><span className="shrink-0 font-display text-xl text-gold-600">{step.percent}%</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand"><div className="h-full rounded-full bg-gold-gradient" style={{width:`${step.percent}%`}}/></div>
      </li>)}</ol>:project?.progressPercent==null && lot?.progressPercent==null && <p className="text-ink/55">{dict.client.noLot}</p>}
    </section>
  </PortalShell>;
}
