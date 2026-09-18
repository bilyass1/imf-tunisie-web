import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireClient } from '@/lib/auth';
import { getProject } from '@/lib/db';
import { t, formatMoney, formatDate, formatArea, floorLabel } from '@/lib/format';
import PortalShell from '@/components/portal/PortalShell';
import { clientNav } from '@/components/portal/clientNav';
import { IconArrow, IconCheck } from '@/components/Icons';

export default async function ClientDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const user = await requireClient(locale);

  const project = user.projectSlug ? (await getProject(user.projectSlug)) : undefined;
  const lot = project?.lots.find((l) => l.ref === user.lotRef);
  const payments = user.payments ?? [];

  const total = payments.reduce((s, p) => s + p.amount, 0);
  const paid = payments.filter((p) => p.paid).reduce((s, p) => s + p.amount, 0);
  const remaining = total - paid;
  const nextDue = payments.find((p) => !p.paid);
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

  const avgProgress = project?.progress?.length
    ? Math.round(project.progress.reduce((s, step) => s + step.percent, 0) / project.progress.length)
    : null;

  return (
    <PortalShell
      locale={locale}
      title={`${dict.client.welcome}, ${user.name.split(' ')[0]}`}
      subtitle={project ? project.name : undefined}
      userName={user.name}
      nav={clientNav(locale, dict)}
      active="dashboard"
      backLabel={dict.auth.backToSite}
      logoutLabel={dict.auth.logout}
    >
      {!project || !lot ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-10 text-center text-ink/55">
          {dict.client.noLot}
        </div>
      ) : (
        <div className="space-y-6">
          {/* ---- KPI ---- */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: dict.client.summary.total, value: formatMoney(total, locale) },
              { label: dict.client.summary.paid, value: formatMoney(paid, locale), accent: 'text-emerald-600' },
              { label: dict.client.summary.remaining, value: formatMoney(remaining, locale), accent: 'text-gold-600' },
              {
                label: dict.client.summary.nextDue,
                value: nextDue ? formatDate(nextDue.dueDate, locale) : '—',
              },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-2xl border border-ink/8 bg-white p-6">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink/40">{kpi.label}</p>
                <p className={`mt-3 font-display text-[26px] font-light leading-none ${kpi.accent ?? 'text-ink'}`}>
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>

          {/* ---- Progression paiement ---- */}
          <div className="rounded-2xl border border-ink/8 bg-white p-7">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink/40">
                  {dict.client.summary.progress}
                </p>
                <p className="mt-2 font-display text-[34px] font-light leading-none">{pct}%</p>
              </div>
              <Link
                href={`/${locale}/espace-client/paiements`}
                className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink/50 transition hover:text-gold-600"
              >
                {dict.client.payments}
                <IconArrow className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-sand">
              <div className="h-full rounded-full bg-gold-gradient transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* ---- Mon appartement ---- */}
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="overflow-hidden rounded-2xl border border-ink/8 bg-white">
              <div className="flex items-center justify-between border-b border-ink/8 px-6 py-4">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ink/50">{dict.client.myLot}</h2>
                <Link
                  href={`/${locale}/projets/${project.slug}`}
                  className="text-[12px] font-semibold uppercase tracking-[0.12em] text-gold-600"
                >
                  {project.name}
                </Link>
              </div>
              <dl className="divide-y divide-ink/6 px-6">
                {[
                  { k: dict.availability.table.code, v: lot.code },
                  { k: dict.availability.block, v: lot.block },
                  { k: dict.availability.floor, v: floorLabel(lot.floor, locale) },
                  { k: dict.availability.table.typology, v: lot.typology },
                  { k: dict.availability.table.sellable, v: formatArea(lot.sellableArea, locale) },
                  ...(lot.terraceArea
                    ? [{ k: dict.availability.table.terrace, v: formatArea(lot.terraceArea, locale) }]
                    : []),
                  ...(lot.gardenArea ? [{ k: dict.availability.table.garden, v: formatArea(lot.gardenArea, locale) }] : []),
                ].map((row) => (
                  <div key={row.k} className="flex items-center justify-between gap-4 py-3.5">
                    <dt className="text-[12px] uppercase tracking-[0.1em] text-ink/45">{row.k}</dt>
                    <dd className="text-[14px] font-medium text-ink">{row.v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* ---- Avancement chantier ---- */}
            {project.progress && (
              <div className="rounded-2xl border border-ink/8 bg-white p-6">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ink/50">
                    {dict.client.progress}
                  </h2>
                  {avgProgress !== null && (
                    <span className="font-display text-[26px] font-light text-gold-600">{avgProgress}%</span>
                  )}
                </div>
                <ul className="mt-6 space-y-5">
                  {project.progress.map((step) => (
                    <li key={step.label.fr}>
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="flex items-center gap-2 text-ink/70">
                          {step.done && <IconCheck className="h-3.5 w-3.5 text-emerald-600" />}
                          {t(step.label, locale)}
                        </span>
                        <span className="text-ink/45">{step.percent}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand">
                        <div className="h-full rounded-full bg-gold-gradient" style={{ width: `${step.percent}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </PortalShell>
  );
}
