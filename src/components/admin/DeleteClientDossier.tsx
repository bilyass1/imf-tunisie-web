'use client';

import AdminForm from './AdminForm';

export default function DeleteClientDossier({ client }: { client: { id: string; name: string; email: string } }) {
  return <details className="rounded-2xl border border-red-200 bg-red-50/40 p-4 sm:p-6">
    <summary className="cursor-pointer font-semibold text-red-800">Supprimer le compte et tout le dossier client</summary>
    <div className="mt-5"><AdminForm operation="client-delete" title="Suppression définitive du dossier">
      <input type="hidden" name="client" value={client.id} />
      <p className="text-sm text-ink/70"><strong>{client.name}</strong> · {client.email}</p>
      <p className="text-sm leading-relaxed text-ink/65">Cette action supprime le compte, ses rattachements aux appartements, ses échéanciers, ses versements, ses messages, ses documents actifs et archivés et ses photos privées. Le client perdra immédiatement l’accès à son espace.</p>
      <label className="block max-w-sm text-sm">Code PIN de suppression<input className="field mt-2" type="password" name="deletePin" inputMode="numeric" pattern="[0-9]{8}" minLength={8} maxLength={8} autoComplete="off" required /></label>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="confirm" value="yes" required className="mt-1" /><span>Je confirme la suppression définitive du compte et de tout le dossier de <strong>{client.name}</strong>.</span></label>
    </AdminForm></div>
  </details>;
}
