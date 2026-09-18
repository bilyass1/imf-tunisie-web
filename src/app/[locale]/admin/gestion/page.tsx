import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { requireAdminUser } from '@/lib/auth';
import { readDb } from '@/lib/db';
import { getCompanySite } from '@/lib/company';
import PortalShell from '@/components/portal/PortalShell';
import { adminNav } from '@/components/portal/clientNav';
import CommercialConsole from '@/components/admin/CommercialConsole';
export default async function Management({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params; if(!isLocale(locale)) notFound();
  const user=await requireAdminUser(locale); const dict=getDictionary(locale); const db=readDb(); const site=getCompanySite();
  return <PortalShell locale={locale} title="Espace commercial" subtitle="Clients, documents, avancement et publications" userName={user.name} nav={adminNav(locale,dict)} active="management" backLabel={dict.auth.backToSite} logoutLabel={dict.auth.logout} accent="admin">
    <CommercialConsole projects={db.projects.map(p=>({slug:p.slug,name:p.name,progressPercent:p.progressPercent,lots:p.lots.map(l=>({ref:l.ref,code:l.code,status:l.status,progressPercent:l.progressPercent}))}))} clients={db.users.filter(u=>u.role==='client').map(u=>({id:u.id,name:u.name,email:u.email,phone:u.phone,projectSlug:u.projectSlug,lotRef:u.lotRef,documents:u.documents??[],archivedDocuments:u.archivedDocuments??[],messages:u.messages??[]}))} company={db.company??{legalName:site.legalName,email:site.email,phone:site.office.phones[0],address:site.office.line1,city:site.office.line2,about:dict.footer.about}}/>
  </PortalShell>;
}
