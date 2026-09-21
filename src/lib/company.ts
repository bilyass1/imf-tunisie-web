import 'server-only';
import { SITE } from './site';
import { getPublicData } from './db';
export async function getCompanySite() {
  const company=(await getPublicData()).company;
  return {...SITE,legalName:company?.legalName??SITE.legalName,email:company?.email??SITE.email,about:company?.about,office:{...SITE.office,line1:company?.address??SITE.office.line1,line2:company?.city??SITE.office.line2,phones:company?[company.phone]:[...SITE.office.phones]}};
}
