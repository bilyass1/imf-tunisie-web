import 'server-only';
import { SITE } from './site';
import { getPublicData } from './db';
export async function getCompanySite() {
  const company=(await getPublicData()).company;
  const email = !company?.email || company.email.toLowerCase() === 'info@imf-tunisie.com.tn' ? SITE.email : company.email;
  return {...SITE,legalName:company?.legalName??SITE.legalName,email,about:company?.about,office:{...SITE.office,line1:company?.address??SITE.office.line1,line2:company?.city??SITE.office.line2,phones:company?[company.phone]:[...SITE.office.phones]}};
}
