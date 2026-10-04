import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireAdminUser } from '@/lib/auth';
import { readDb } from '@/lib/db';
import { getCompanySite } from '@/lib/company';
import PortalShell from '@/components/portal/PortalShell';
import { adminNav } from '@/components/portal/clientNav';
import CommercialConsole from '@/components/admin/CommercialConsole';
import { projectPresentation } from '@/lib/project-presentation';
export default async function Management({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params; if(!isLocale(locale)) notFound();
  const user=await requireAdminUser(locale); const dict=getDictionary(locale); const db=(await readDb()); const site=(await getCompanySite());
  const sections={fr:getDictionary('fr').project,en:getDictionary('en').project,ar:getDictionary('ar').project};
  const sectionLabel=(key:'overview'|'highlights'|'specs'|'amenities'|'progress'|'gallery')=>({fr:sections.fr[key],en:sections.en[key],ar:sections.ar[key]});
  const defaultLabels={overview:sectionLabel('overview'),highlights:sectionLabel('highlights'),specs:sectionLabel('specs'),amenities:sectionLabel('amenities'),progress:sectionLabel('progress'),gallery:sectionLabel('gallery')};
  return <PortalShell locale={locale} title="Espace commercial" subtitle="Clients, documents, avancement et publications" userName={user.name} nav={adminNav(locale,dict)} active="management" backLabel={dict.auth.backToSite} logoutLabel={dict.auth.logout} accent="admin" wide>
    <CommercialConsole projects={db.projects.map(p=>{const shown=projectPresentation(p);return {slug:p.slug,name:shown.name,subtitle:shown.subtitle,address:shown.address,description:shown.description,deliveryLabel:shown.deliveryLabel,presentationLabels:shown.presentationLabels??defaultLabels,highlights:shown.highlights,specs:shown.specs,amenities:shown.amenities,gallery:shown.gallery,progressPercent:p.progressPercent,progress:p.progress,lots:p.lots.map(l=>({ref:l.ref,code:l.code,status:l.status,progressPercent:l.progressPercent,rooms:l.rooms}))};})} clients={db.users.filter(u=>u.role==='client').map(u=>({id:u.id,name:u.name,email:u.email,phone:u.phone,projectSlug:u.projectSlug,lotRef:u.lotRef,properties:u.properties,documents:u.documents??[],archivedDocuments:u.archivedDocuments??[],messages:u.messages??[]}))} company={db.company??{legalName:site.legalName,email:site.email,phone:site.office.phones[0],address:site.office.line1,city:site.office.line2,about:dict.footer.about}}/>
  </PortalShell>;
}
