import { SITE } from './site';
import type { Project } from './types';
import { propertyGuides } from './property-guides';
import { locales, type Locale } from '@/i18n/config';
import { floorLabel } from './format';

export const agentCautions = 'Les disponibilités, prix et modalités doivent être confirmés avec IMF avant réservation. Les rendus et visualisations sont illustratifs et ne remplacent pas les plans contractuels. L’éligibilité FOPROLOS doit être confirmée avec IMF et BH Bank.';
const statusLabels = { ongoing: 'En cours', delivered: 'Livré', upcoming: 'À venir' };
export const projectPath = (project: Project, locale: Locale) => `/${locale}/projets/${project.slug}`;
export const lotPath = (project: Project, ref: string, locale: Locale) => `${projectPath(project, locale)}/appartements/${encodeURIComponent(ref)}`;
export const documentedPrice = (price: number | undefined): price is number => typeof price === 'number' && Number.isFinite(price) && price > 0;

/** Shared by the public text routes; only accepts the public project projection. */
export function llmsText(projects: Project[], full = false) {
  const lines = [
    `# ${SITE.name} — ${SITE.legalName}`, '',
    '> Promoteur immobilier à Sfax et Tunis, Tunisie. Projets, appartements et guides en français, arabe et anglais.', '',
    ...locales.map(locale => `- [Accueil ${locale.toUpperCase()}](${SITE.url}/${locale})`),
    `- [Sitemap multilingue](${SITE.url}/sitemap.xml)`,
    `- [Contenu détaillé](${SITE.url}/llms-full.txt)`, '',
    agentCautions, '', '## Projets', '',
  ];
  for (const project of projects) {
    for (const locale of locales) lines.push(`- [${project.name} — ${locale.toUpperCase()}](${SITE.url}${projectPath(project, locale)}): ${project.city}, ${statusLabels[project.status]}. ${project.address[locale]}`);
  }
  lines.push('', '## Guides', '');
  for (const guide of propertyGuides) {
    for (const locale of locales) lines.push(`- [${guide.title[locale]} — ${locale.toUpperCase()}](${SITE.url}/${locale}/guides/${guide.slug}): ${guide.summary[locale]}`);
  }
  lines.push('', '## Contact', '',
    `- [Contacter IMF](${SITE.url}/fr/contact): ${SITE.email}; ${SITE.office.phones.join(' / ')}`,
    `Siège commercial : ${SITE.office.line1}, ${SITE.office.line2}`,
    `Bureau de Tunis : ${SITE.tunisOffice.line1}, ${SITE.tunisOffice.line2}`, '',
  );
  if (full) {
    for (const project of projects) {
      lines.push(`## ${project.name} — lots disponibles`, '');
      for (const locale of locales) {
        lines.push(`### ${locale.toUpperCase()}`, '', project.description[locale], '');
        for (const lot of project.lots.filter(lot => lot.status === 'available')) {
          const details = [lot.typology, floorLabel(lot.floor, locale)];
          if (lot.sellableArea) details.push(`${lot.sellableArea} m² (surface vendable)`);
          if (lot.grossArea) details.push(`${lot.grossArea} m² (surface hors œuvre)`);
          if (documentedPrice(lot.price)) details.push(`${lot.price} TND`);
          lines.push(`- [${lot.ref} — ${lot.code}](${SITE.url}${lotPath(project, lot.ref, locale)}): ${details.join('; ')}`);
        }
        lines.push('');
      }
    }
    for (const guide of propertyGuides) {
      for (const locale of locales) {
        lines.push(`## ${guide.title[locale]} — ${locale.toUpperCase()}`, '', guide.summary[locale], '');
        for (const section of guide.sections) lines.push(`### ${section.title[locale]}`, '', section.body[locale], '', ...(section.source ? [`Source : ${section.source}`, ''] : []));
        for (const question of guide.questions) lines.push(`### ${question.question[locale]}`, '', question.answer[locale], '');
        lines.push(...guide.sources.map(source => `- [${source.title}](${source.url})`), '');
      }
    }
  }
  return lines.join('\n');
}
