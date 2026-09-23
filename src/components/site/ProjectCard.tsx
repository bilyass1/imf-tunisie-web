import Link from 'next/link';
import Image from 'next/image';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/getDictionary';
import type { Project } from '@/lib/types';
import { lotStats } from '@/lib/db';
import { t, formatArea } from '@/lib/format';
import { IconArrow, IconPin } from '@/components/Icons';
import { YASSAMINE_PROGRAMME } from '@/lib/project-presentation';

export default function ProjectCard({
  project,
  locale,
  dict,
  priority = false,
}: {
  project: Project;
  locale: Locale;
  dict: Dictionary;
  priority?: boolean;
}) {
  const stats = lotStats(project.lots);
  const isOngoing = project.status === 'ongoing';
  const programme = project.slug === 'diar-al-yassamine' ? YASSAMINE_PROGRAMME : undefined;

  return (
    <Link
      href={`/${locale}/projets/${project.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/5 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-lux"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={project.cover}
          alt={project.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          priority={priority}
          quality={90}
          className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.07]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent" />

        <div className="absolute start-4 top-4 flex flex-wrap gap-2">
          <span
            className={`chip ${
              isOngoing ? 'bg-gold-gradient text-ink' : 'bg-white/90 text-ink/70'
            }`}
          >
            {isOngoing ? dict.projects.status.ongoing : dict.projects.status.delivered}
          </span>
          {project.foprolos && <span className="chip bg-ink/80 text-gold-200">FOPROLOS</span>}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-200">
            <IconPin className="h-3.5 w-3.5" />
            {project.city}
          </p>
          <h3 className="mt-1.5 font-display text-[26px] font-light leading-tight text-white">{project.name}</h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-base leading-relaxed text-ink/65">{t(project.subtitle, locale)}</p>
        {project.deliveryLabel && <p className="mt-2 text-sm text-ink/60">{t(project.deliveryLabel, locale)}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink/8 pt-4 text-[12px]">
          {isOngoing && stats.total > 0 ? (
            <>
              <span className="font-semibold text-gold-600">
                {stats.available} {dict.projects.available}
              </span>
              <span className="text-ink/40">
                {programme?.apartments ?? stats.total} {dict.projects.lots}
              </span>
              {stats.minArea > 0 && (
                <span className="text-ink/40">
                  {dict.projects.from} {formatArea(programme?.minArea ?? stats.minArea, locale)}
                </span>
              )}
            </>
          ) : (
            <span className="text-ink/40">{project.status === 'delivered' ? dict.projects.sold : t(project.subtitle, locale)}</span>
          )}
        </div>

        <span className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-ink transition group-hover:text-gold-600">
          {dict.projects.view}
          <IconArrow className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
