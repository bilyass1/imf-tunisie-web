import { getDictionary } from '@/i18n/getDictionary';
import { SITE } from './site';
import type { Project } from './types';
import { propertyGuides } from './property-guides';
import { publicMarkdownPath } from './markdown-routing';
import { agentCautionsByLocale, documentedPrice, lotPath, projectPath } from './agent-content';
import { floorLabel, formatArea, formatMoney } from './format';
import { propertyCopy } from './property-copy';
import { cityCopy, cityFaq, cityListings, cityTitle, type City } from './city-content';

/** Build from the same public records as HTML, without scraping or private reads. */
export function markdownPage(pathname:string,projects:Project[]) {
  const route=publicMarkdownPath(pathname);
  if(!route) return null;
  const {locale,parts}=route;
  const dict=getDictionary(locale);
  const copy=propertyCopy[locale];
  const link=(label:string,path:string)=>`[${label}](${SITE.url}${path})`;
  const lines:string[]=[];
  const contact=()=>lines.push(`## ${dict.nav.contact}`, '',
    `${SITE.office.line1}, ${SITE.office.line2}`, `${SITE.tunisOffice.line1}, ${SITE.tunisOffice.line2}`,
    SITE.office.phones.join(' / '), SITE.email, '', link(dict.nav.contact,`/${locale}/contact`), '');
  const lotLines=(project:Project,lot:Project['lots'][number])=>[
    `### ${link(`${lot.code} · ${lot.typology}`,lotPath(project,lot.ref,locale))}`, '',
    `${copy.reference}: ${lot.ref}`, `${copy.status}: ${copy[lot.status]}`, floorLabel(lot.floor,locale),
    ...(lot.sellableArea ? [`${copy.surface}: ${formatArea(lot.sellableArea,locale)}`] : []),
    ...(documentedPrice(lot.price) ? [`${copy.price}: ${formatMoney(lot.price,locale,3)}`] : [copy.request]), '',
  ];
  if(parts.length===0) {
    lines.push(`# ${dict.meta.title}`, '', dict.meta.description, '', `## ${dict.nav.projects}`, '');
    for(const project of projects) lines.push(`- ${link(project.name,projectPath(project,locale))}: ${project.address[locale]}`);
    lines.push('',`## ${locale==='ar'?'أدلة عقارية':locale==='en'?'Property guides':'Guides immobiliers'}`,'');
    for(const guide of propertyGuides) lines.push(`- ${link(guide.title[locale],`/${locale}/guides/${guide.slug}`)}: ${guide.summary[locale]}`);
    for(const city of ['sfax','tunis'] as const) lines.push(`- ${link(cityTitle(city,locale),`/${locale}/appartements-${city}`)}`);
    lines.push(''); contact();
  } else if(parts[0]==='contact') {
    lines.push(`# ${dict.contact.title}`, '',dict.contact.subtitle,''); contact();
  } else if(parts[0]==='guides') {
    if(parts[1]) {
      const guide=propertyGuides.find(guide=>guide.slug===parts[1]);
      if(!guide) return null;
      lines.push(`# ${guide.title[locale]}`,'',guide.summary[locale],'');
      for(const section of guide.sections) lines.push(`## ${section.title[locale]}`,'',section.body[locale],'',...(section.source?[`Source: ${section.source}`,'']:[]));
      for(const question of guide.questions) lines.push(`## ${question.question[locale]}`,'',question.answer[locale],'');
      for(const source of guide.sources) lines.push(`- [${source.title}](${source.url.startsWith('/')?`${SITE.url}${source.url}`:source.url})`);
    } else {
      lines.push(`# ${locale==='ar'?'أدلة عقارية':locale==='en'?'Property guides':'Guides immobiliers'}`,'');
      for(const guide of propertyGuides) lines.push(`- ${link(guide.title[locale],`/${locale}/guides/${guide.slug}`)}: ${guide.summary[locale]}`);
    }
  } else if(parts[0].startsWith('appartements-')) {
    const city=parts[0].slice('appartements-'.length) as City;
    const data=cityListings(projects,city);
    lines.push(`# ${cityTitle(city,locale)}`,'',cityCopy[locale].intro,'');
    for(const project of data.projects) lines.push(`- ${link(project.name,projectPath(project,locale))}: ${project.address[locale]}`);
    lines.push('');
    for(const {project,lot} of data.available) lines.push(...lotLines(project,lot));
    for(const question of cityFaq(city,locale,data)) lines.push(`## ${question.question}`,'',question.answer,'');
    contact();
  } else if(parts[0]==='projets' && parts[1]) {
    const project=projects.find(project=>project.slug===parts[1]);
    if(!project) return null;
    if(parts[2]==='appartements') {
      const lot=project.lots.find(lot=>lot.ref===parts[3]);
      if(!lot) return null;
      lines.push(`# ${lot.code} · ${project.name}`,'',project.address[locale],project.description[locale],'',...lotLines(project,lot));
    } else {
      lines.push(`# ${project.name}`,'',project.description[locale],'',project.address[locale],dict.projects.status[project.status],'');
      for(const highlight of project.highlights) lines.push(`- ${highlight[locale]}`);
      for(const spec of project.specs) lines.push(`- ${spec.label[locale]}: ${spec.value[locale]}`);
      lines.push('',`## ${copy.available}`,'');
      for(const lot of project.lots.filter(lot=>lot.status==='available')) lines.push(...lotLines(project,lot));
    }
    contact();
  } else {
    lines.push(`# ${dict.projects.title}`,'',dict.projects.subtitle,'');
    for(const project of projects) lines.push(`## ${link(project.name,projectPath(project,locale))}`,'',project.description[locale],project.address[locale],dict.projects.status[project.status],'');
  }
  lines.push('',agentCautionsByLocale[locale],'');
  return lines.join('\n');
}
