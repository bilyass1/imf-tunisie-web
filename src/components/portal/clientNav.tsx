import type { Dictionary } from '@/i18n/getDictionary';
import type { PortalNavItem } from './PortalShell';
import { IconChart, IconBuilding, IconCalendar, IconDoc, IconMail, IconUser, IconCheck } from '@/components/Icons';

export function clientNav(locale: string, dict: Dictionary): PortalNavItem[] {
  const base = `/${locale}/espace-client`;
  return [
    { key: 'dashboard', label: dict.client.dashboard, href: base, icon: <IconChart className="h-4 w-4" /> },
    { key: 'lot', label: dict.client.myLot, href: `${base}/mon-appartement`, icon: <IconBuilding className="h-4 w-4" /> },
    { key: 'payments', label: dict.client.payments, href: `${base}/paiements`, icon: <IconCalendar className="h-4 w-4" /> },
    { key: 'documents', label: dict.client.documents, href: `${base}/documents`, icon: <IconDoc className="h-4 w-4" /> },
    { key: 'progress', label: dict.client.progress, href: `${base}/chantier`, icon: <IconChart className="h-4 w-4" /> },
    { key: 'messages', label: dict.client.messages, href: `${base}/messages`, icon: <IconMail className="h-4 w-4" /> },
  ];
}

export function adminNav(locale: string, dict: Dictionary): PortalNavItem[] {
  const base = `/${locale}/admin`;
  return [
    { key: 'dashboard', label: dict.crm.dashboard, href: base, icon: <IconChart className="h-4 w-4" /> },
    { key: 'pipeline', label: dict.crm.pipeline, href: `${base}/pipeline`, icon: <IconMail className="h-4 w-4" /> },
    { key: 'contacts', label: dict.crm.contacts, href: `${base}/contacts`, icon: <IconUser className="h-4 w-4" /> },
    { key: 'tasks', label: dict.crm.tasks, href: `${base}/taches`, icon: <IconCheck className="h-4 w-4" /> },
    { key: 'lots', label: dict.crm.lots, href: `${base}/lots`, icon: <IconBuilding className="h-4 w-4" /> },
    { key: 'clients', label: dict.admin.clients, href: `${base}/clients`, icon: <IconDoc className="h-4 w-4" /> },
  ];
}
