'use client';
import { useState } from 'react';
import PasswordField from '@/components/auth/PasswordField';

export type LotOwner = { id: string; name: string; email: string };
export const saleStatusLabels = {available:'Disponible',reserved:'Réservé',sold:'Vendu',unconfirmed:'À confirmer'};

export function StatusPinField() {
  return <label className="block text-sm">Code PIN pour modifier un appartement vendu
    <input name="statusPin" type="password" inputMode="numeric" pattern="[0-9]{8}" minLength={8} maxLength={8} autoComplete="off" required className="field mt-2"/>
  </label>;
}

export default function LotStatusFields({ currentStatus, note, owner, clients = [], limited = false }: {
  currentStatus: string; note?: string; owner?: LotOwner; clients?: LotOwner[]; limited?: boolean;
}) {
  const [status,setStatus]=useState(limited?'reserved':currentStatus);
  const [mode,setMode]=useState('new');
  const [reservationNote,setReservationNote]=useState(note??'');
  return <div className="min-w-56 space-y-3">
    <label className="block text-sm">Statut<select name="status" className="field mt-2" value={status} onChange={event=>setStatus(event.target.value)} required>
      {Object.entries(saleStatusLabels).filter(([value])=>!limited || value==='reserved'||value==='sold').map(([value,label])=><option key={value} value={value}>{label}</option>)}
    </select></label>
    {status==='reserved' && <label className="block text-sm">Note de réservation (administration)<textarea name="reservationNote" rows={3} maxLength={2000} value={reservationNote} onChange={event=>setReservationNote(event.target.value)} className="field mt-2"/></label>}
    {currentStatus==='sold' && status!=='sold' && <StatusPinField/>}
    {owner && <p className="text-sm text-ink/65">Compte lié : {owner.name} · {owner.email}</p>}
    {status==='sold' && !owner && !limited && <fieldset className="space-y-3 rounded-xl border border-gold-300 p-3">
      <legend className="px-1 text-sm font-semibold">Compte client obligatoire</legend>
      <label className="block text-sm">Rattachement<select name="clientMode" value={mode} onChange={event=>setMode(event.target.value)} className="field mt-2"><option value="new">Créer un compte client</option><option value="existing">Sélectionner un compte existant</option></select></label>
      {mode==='existing'?<label className="block text-sm">Client<select name="client" className="field mt-2" required defaultValue=""><option value="">Sélectionner un client</option>{clients.map(client=><option key={client.id} value={client.id}>{client.name} · {client.email}</option>)}</select></label>:<>
        <label className="block text-sm">Nom complet<input name="name" required maxLength={200} className="field mt-2"/></label>
        <label className="block text-sm">E-mail de connexion<input name="email" type="email" required maxLength={200} className="field mt-2"/></label>
        <label className="block text-sm">Téléphone<input name="phone" maxLength={80} className="field mt-2"/></label>
        <PasswordField label="Mot de passe initial (12 caractères minimum)" name="password"/>
      </>}
    </fieldset>}
  </div>;
}
