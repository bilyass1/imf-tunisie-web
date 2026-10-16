import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireAdminUser } from '@/lib/auth';
import { listCrm } from '@/lib/crm';
import { formatDate } from '@/lib/format';
import { addTaskAction, toggleTaskAction } from '@/lib/actions';
import PortalShell from '@/components/portal/PortalShell';
import { adminNav } from '@/components/portal/clientNav';
import { IconCheck } from '@/components/Icons';

export default async function TasksPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams:Promise<{after?:string}> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const user = await requireAdminUser(locale);

  const query=await searchParams;
  const {items:tasks,next}=await listCrm('tasks',{after:query.after});
  const today = new Date().toISOString().slice(0, 10);

  const open = tasks.filter((t) => !t.done).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  const groups = [
    { key: 'overdue', label: dict.crm.overdue, items: open.filter((t) => t.dueDate < today), tone: 'text-red-600' },
    { key: 'today', label: dict.crm.todayTasks, items: open.filter((t) => t.dueDate === today), tone: 'text-gold-600' },
    { key: 'upcoming', label: dict.crm.upcoming, items: open.filter((t) => t.dueDate > today), tone: 'text-muted' },
    { key: 'done', label: dict.crm.done, items: tasks.filter((t) => t.done), tone: 'text-emerald-600' },
  ];

  return (
    <PortalShell
      locale={locale}
      title={dict.crm.tasks}
      subtitle={`${open.length}`}
      userName={user.name}
      nav={adminNav(locale, dict)}
      active="tasks"
      backLabel={dict.auth.backToSite}
      logoutLabel={dict.auth.logout}
      accent="admin"
    >
      <form action={addTaskAction} className="mb-6 grid gap-3 rounded-2xl border border-ink/8 bg-white p-5 sm:grid-cols-[1fr_180px_auto]">
        <input aria-label={dict.crm.taskTitle} name="title" required placeholder={dict.crm.taskTitle} className="field" />
        <input aria-label={dict.crm.table.date} name="dueDate" type="date" defaultValue={today} className="field" />
        <button type="submit" className="btn-gold !px-6 !py-2.5 !text-[11px]">
          {dict.crm.addTask}
        </button>
      </form>

      <div className="space-y-6">
        {groups.map((group) =>
          group.items.length === 0 ? null : (
            <section key={group.key} className="overflow-hidden rounded-2xl border border-ink/8 bg-white">
              <h2 className={`border-b border-ink/8 px-6 py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] ${group.tone}`}>
                {group.label} · {group.items.length}
              </h2>
              <ul className="divide-y divide-ink/6">
                {group.items.map((task) => (
                  <li key={task.id} className="flex items-center gap-4 px-6 py-4">
                    <form action={toggleTaskAction}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <button
                        type="submit"
                        aria-label={task.done ? dict.crm.reopen : dict.crm.markDone}
                        className={`grid h-11 w-11 place-items-center rounded-md border transition ${
                          task.done
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-ink/20 text-transparent hover:border-emerald-500 hover:text-emerald-500'
                        }`}
                      >
                        <IconCheck className="h-3.5 w-3.5" />
                      </button>
                    </form>

                    <div className="min-w-0 flex-1">
                      <p className={`text-[14px] ${task.done ? 'text-muted line-through' : 'text-ink'}`}>
                        {task.title}
                      </p>
                      {task.contactId && task.contactName && (
                        <Link
                          href={`/${locale}/admin/contacts/${task.contactId}`}
                          className="text-[11.5px] text-muted transition hover:text-gold-600"
                        >
                          {task.contactName}
                        </Link>
                      )}
                    </div>

                    <span className="shrink-0 text-[12px] text-muted">{formatDate(task.dueDate, locale)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ),
        )}

        {tasks.length === 0 && (
          <p className="rounded-2xl border border-dashed border-ink/15 bg-white/60 p-12 text-center text-muted">
            {dict.crm.noTasks}
          </p>
        )}
      </div>
      <nav aria-label="Pagination" className="mt-5 flex flex-wrap gap-4"><Link className="btn-ghost" href={`/${locale}/admin/taches`}>{locale==='ar'?'البداية':locale==='en'?'First page':'Première page'}</Link>{next&&<Link className="btn-ghost" href={`/${locale}/admin/taches?${new URLSearchParams({after:next})}`}>{locale==='ar'?'التالي':locale==='en'?'Next page':'Page suivante'}</Link>}</nav>
    </PortalShell>
  );
}
