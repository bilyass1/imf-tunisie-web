import { redirect } from 'next/navigation';

/** Ancienne page « Demandes » — remplacée par le pipeline du CRM. */
export default async function LegacyLeadsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/admin/pipeline`);
}
