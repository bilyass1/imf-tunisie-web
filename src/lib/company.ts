import 'server-only';
import { SITE } from './site';
import { getCompanyData } from './db';
import { cache } from 'react';
export const getCompanySite = cache(async () => {
  const company=await getCompanyData();
  const email = !company?.email || ['info@imf-tunisie.com.tn', 'contact@imf-immobilere.tn'].includes(company.email.toLowerCase()) ? SITE.email : company.email;
  return {...SITE,legalName:company?.legalName??SITE.legalName,email,about:company?.about,office:{...SITE.office,line1:company?.address??SITE.office.line1,line2:company?.city??SITE.office.line2,phones:company?[company.phone]:[...SITE.office.phones]}};
});
