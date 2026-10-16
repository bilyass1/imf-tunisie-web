import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireAdminUser } from '@/lib/auth';
import { getCrmDashboard } from '@/lib/crm';
import { formatDate, formatMoney } from '@/lib/format';
import { PIPELINE_STAGES } from '@/lib/types';
import { clearDemoCrmAction, toggleTaskAction } from '@/lib/actions';
import PortalShell from '@/components/portal/PortalShell';
import { adminNav } from '@/components/portal/clientNav';
import { IconArrow, IconCheck } from '@/components/Icons';

export default async function CrmDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const user = await requireAdminUser(locale);

  const {stats,contactCount,hasDemo,available:availableTotal,activities,tasks}=await getCrmDashboard();
  const today = new Date().toISOString().slice(0, 10);
  const overdue=tasks.filter(t=>t.dueDate<today),dueToday=tasks.filter(t=>t.dueDate===today);

  const kpis = [
    { label: dict.crm.kpi.openDeals, value: String(stats.openDeals) },
    { label: dict.crm.kpi.openValue, value: formatMoney(stats.openValue, locale), accent: 'text-gold-600' },
    { label: dict.crm.kpi.weighted, value: formatMoney(stats.weightedValue, locale) },
    { label: dict.crm.kpi.conversion, value: `${stats.conversion} %`, accent: 'text-emerald-600' },
    { label: dict.crm.kpi.contacts, value: String(contactCount) },
    { label: dict.crm.kpi.won, value: String(stats.wonThisYear) },
    { label: dict.crm.kpi.wonValue, value: formatMoney(stats.wonValue, locale) },
    { label: dict.admin.stats.available, value: String(availableTotal) },
  ];

  return (
    <PortalShell
      locale={locale}
      title="Espace commercial"
      subtitle={dict.crm.dashboard}
      userName={user.name}
      nav={adminNav(locale, dict)}
      active="dashboard"
      backLabel={dict.auth.backToSite}
      logoutLabel={dict.auth.logout}
      accent="admin"
    >
      <div className="mb-6 rounded-2xl bg-ink p-6 text-white"><h2 className="font-display text-2xl">Gérer les clients et les résidences</h2><p className="mt-2 text-white/85">Créer les comptes clients, publier les contrats et photos, mettre à jour les disponibilités et l’avancement.</p><Link className="btn-gold mt-4" href={`/${locale}/admin/gestion`}>Ouvrir la gestion commerciale</Link></div>
      <Link href={`/${locale}/admin/audit`} className="btn-ghost mb-6">Journal d’audit des opérations</Link>
      <Link href={`/${locale}/admin/securite`} className="btn-ghost mb-6 ms-3">Sécurité du compte</Link>
      <Link href={`/${locale}/admin/qualite`} className="btn-ghost mb-6 ms-3">{locale==='ar'?'الجودة والأداء':locale==='en'?'Quality and performance':'Qualité et performances'}</Link>
      {hasDemo && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-dashed border-gold-300 bg-gold-50 px-5 py-3.5">
          <p className="text-[13px] text-gold-700">{dict.crm.demoBanner}</p>
          <form action={clearDemoCrmAction}>
            <button
              type="submit"
              className="rounded-full border border-gold-400 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-700 transition hover:bg-gold-400 hover:text-ink"
            >
              {dict.crm.clearDemo}
            </button>
          </form>
        </div>
      )}

      {/* ---- KPI ---- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-ink/8 bg-white p-5">
            <p className={`font-display text-[28px] font-light leading-none ${kpi.accent ?? 'text-ink'}`}>{kpi.value}</p>
            <p className="mt-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* ---- Répartition du pipeline ---- */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-ink/8 bg-white">
        <div className="flex items-center justify-between border-b border-ink/8 px-6 py-4">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">{dict.crm.pipeline}</h2>
          <Link
            href={`/${locale}/admin/pipeline`}
            aria-label={dict.crm.pipeline}
            className="grid h-11 w-11 place-items-center rounded-full border border-ink/12 text-muted transition hover:border-gold-400 hover:text-gold-600"
          >
            <IconArrow className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>
        <div className="grid grid-cols-2 divide-ink/6 sm:grid-cols-5 sm:divide-x">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage} className="px-5 py-5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted">
                {dict.crm.stages[stage]}
              </p>
              <p className="mt-2 font-display text-[26px] font-light leading-none text-ink">
                {stats.byStage[stage].count}
              </p>
              <p className="mt-1.5 text-[12px] text-gold-600">{formatMoney(stats.byStage[stage].value, locale)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* ---- Tâches ---- */}
        <div className="overflow-hidden rounded-2xl border border-ink/8 bg-white">
          <div className="flex items-center justify-between border-b border-ink/8 px-6 py-4">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">{dict.crm.tasks}</h2>
            <Link
              href={`/${locale}/admin/taches`}
              aria-label={dict.crm.tasks}
              className="grid h-11 w-11 place-items-center rounded-full border border-ink/12 text-muted transition hover:border-gold-400 hover:text-gold-600"
            >
              <IconArrow className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>

          {overdue.length + dueToday.length === 0 ? (
            <p className="px-6 py-10 text-center text-muted">{dict.crm.noTasks}</p>
          ) : (
            <ul className="divide-y divide-ink/6">
              {[...overdue, ...dueToday].slice(0, 6).map((task) => {
                const late = task.dueDate < today;
                return (
                  <li key={task.id} className="flex items-center gap-4 px-6 py-3.5">
                    <form action={toggleTaskAction}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <button
                        type="submit"
                        aria-label={dict.crm.markDone}
                        className="grid h-11 w-11 place-items-center rounded-md border border-ink/20 text-transparent transition hover:border-emerald-500 hover:text-emerald-500"
                      >
                        <IconCheck className="h-3.5 w-3.5" />
                      </button>
                    </form>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] text-ink">{task.title}</p>
                      {task.contactId && task.contactName && (
                        <Link
                          href={`/${locale}/admin/contacts/${task.contactId}`}
                          className="text-[11.5px] text-muted transition hover:text-gold-600"
                        >
                          {task.contactName}
                        </Link>
                      )}
                    </div>
                    <span className={`shrink-0 text-[11.5px] ${late ? 'text-red-600' : 'text-muted'}`}>
                      {late ? dict.crm.overdue : dict.crm.todayTasks}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ---- Activités ---- */}
        <div className="overflow-hidden rounded-2xl border border-ink/8 bg-white">
          <h2 className="border-b border-ink/8 px-6 py-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-muted">
            {dict.crm.recentActivity}
          </h2>
          {activities.length === 0 ? (
            <p className="px-6 py-10 text-center text-muted">{dict.crm.noActivities}</p>
          ) : (
            <ul className="divide-y divide-ink/6">
              {activities.map((a) => (
                <li key={a.id} className="px-6 py-3.5">
                  <p className="flex flex-wrap items-center gap-x-3 text-[11.5px] text-muted">
                    <span className="font-semibold uppercase tracking-wider text-gold-600">
                      {dict.crm.types[a.type]}
                    </span>
                    {a.contactName && (
                      <Link
                        href={`/${locale}/admin/contacts/${a.contactId}`}
                        className="text-ink/60 transition hover:text-gold-600"
                      >
                        {a.contactName}
                      </Link>
                    )}
                    <span>{formatDate(a.date, locale)}</span>
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-ink/70">{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
