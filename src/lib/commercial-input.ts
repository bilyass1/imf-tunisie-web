import 'server-only';
import type { Database } from './types';
export const formValue=(form:FormData,key:string)=>String(form.get(key)??'').trim();
export function requiredText(form:FormData,key:string,max=200) {
  const value=formValue(form,key);if(!value||value.length>max)throw new Error(`Champ ${key} manquant ou trop long.`);return value;
}
export function propertyTarget(db: Database, form: FormData) {
  const project=db.projects.find(p=>p.slug===formValue(form,'project'));
  if (!project) throw new Error('Résidence introuvable.');
  const ref=formValue(form,'lot'); const lot=ref ? project.lots.find(l=>l.ref===ref) : undefined;
  if (ref && !lot) throw new Error('Appartement introuvable.');
  return {project,lot};
}
