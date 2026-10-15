import type { Contact, ContactSource, Project } from './types';

export function parseContactInput(form: FormData, projects: Pick<Project,'slug'|'lots'>[]): Omit<Contact,'id'|'createdAt'> {
  const value=(key:string)=>String(form.get(key)??'').trim();
  const name=value('name'), phone=value('phone'), email=value('email'), city=value('city'), source=value('source')||'phone';
  const notes=value('notes'), budget=value('budget'), projectSlug=value('project'), lotRef=value('lot');
  if(!name || name.length>200 || !phone || phone.length>80) throw new Error('Renseignez un nom et un téléphone valides.');
  if(email && (email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error('Adresse e-mail invalide.');
  if(city.length>160 || budget.length>200 || notes.length>4000 || value('tags').length>1000) throw new Error('Un champ du contact dépasse la longueur autorisée.');
  if(!['website','phone','walk-in','referral','facebook','salon','other'].includes(source)) throw new Error('Source de contact invalide.');
  const tags=[...new Set(value('tags').split(',').map(tag=>tag.trim()).filter(Boolean))];
  if(tags.length>20 || tags.some(tag=>tag.length>80)) throw new Error('Saisissez au maximum 20 étiquettes de 80 caractères.');
  const project=projects.find(project=>project.slug===projectSlug);
  if(projectSlug && !project || lotRef && !project?.lots.some(lot=>lot.ref===lotRef)) throw new Error('Choisissez un projet et un appartement valides.');
  return {name,phone,email:email||undefined,city:city||undefined,source:source as ContactSource,tags,notes:notes||undefined,budget:budget||undefined,projectSlug:projectSlug||undefined,lotRef:lotRef||undefined};
}
