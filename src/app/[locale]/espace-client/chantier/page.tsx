import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireClient } from '@/lib/auth';
import { getProject } from '@/lib/db';
import { t } from '@/lib/format';
import PortalShell from '@/components/portal/PortalShell';
import { clientNav } from '@/components/portal/clientNav';
import { IconCheck } from '@/components/Icons';
import ProgressMeter from '@/components/site/ProgressMeter';

export default async function ProgressPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const user = await requireClient(locale);
  const project = user.projectSlug ? getProject(user.projectSlug) : undefined;
  const steps = project?.progress ?? [];
  const lot=project?.lots.find(l=>l.ref===user.lotRef);
  const photos = [...(project?.constructionPhotos??[]),...(lot?.constructionPhotos??[])];

  return (
    <PortalShell
      locale={locale}
      title={dict.client.progress}
      subtitle={project?.name}
      userName={user.name}
      nav={clientNav(locale, dict)}
      active="progress"
      backLabel={dict.auth.backToSite}
      logoutLabel={dict.auth.logout}
    >
      <ProgressMeter value={project?.progressPercent} locale={locale} label={project?.name}/>
      <ProgressMeter value={lot?.progressPercent} locale={locale} label={lot?.code}/>
      {steps.length === 0 && !photos.length && project?.progressPercent==null && lot?.progressPercent==null ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-10 text-center text-ink/50">
          {dict.client.noLot}
        </div>
      ) : (
        <>
          {steps.length>0 && <ol className="relative space-y-8 rounded-2xl border border-ink/8 bg-white p-7 ps-12">
            <span className="absolute bottom-8 start-[34px] top-10 w-px bg-ink/10" />
            {steps.map((step) => (
              <li key={step.label.fr} className="relative">
                <span
                  className={`absolute -start-[26px] top-1 grid h-5 w-5 place-items-center rounded-full ring-4 ring-white ${
                    step.done ? 'bg-emerald-500 text-white' : step.percent > 0 ? 'bg-gold-400' : 'bg-ink/15'
                  }`}
                >
                  {step.done && <IconCheck className="h-3 w-3" />}
                </span>
                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-medium text-ink">{t(step.label, locale)}</p>
                  <span className="font-display text-[20px] text-gold-600">{step.percent}%</span>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-sand">
                  <div className="h-full rounded-full bg-gold-gradient" style={{ width: `${step.percent}%` }} />
                </div>
              </li>
            ))}
          </ol>}

          {photos.length > 0 && (
            <div className="mt-8">
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ink/45">
                {dict.project.gallery}
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                {photos.map((photo) => (
                  <div key={photo.src} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-sand">
                    <img src={photo.src} alt={t(photo.caption, locale)} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </PortalShell>
  );
}
