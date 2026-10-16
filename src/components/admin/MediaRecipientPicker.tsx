'use client';

import { useState } from 'react';
import { clientProperties } from '@/lib/client-properties';
import type { User } from '@/lib/types';

type Recipient = Pick<User, 'id' | 'name' | 'email' | 'properties' | 'projectSlug' | 'lotRef'>;
type Project = { slug: string; name: string; lots: { ref: string; code: string }[] };

export default function MediaRecipientPicker({ clients, projects, kind }: { clients: Recipient[]; projects: Project[]; kind: 'contract' | 'construction' }) {
  const [clientId, setClientId] = useState('');
  const client = clients.find(item => item.id === clientId);
  const properties = clientProperties(client ?? {});
  return <div className="space-y-4">
    <label className="block text-sm">Client destinataire<select className="field mt-2" name="client" value={clientId} required onChange={event => setClientId(event.target.value)}>
      <option value="">Sélectionner un client</option>
      {clients.map(item => <option key={item.id} value={item.id}>{item.name} · {item.email} · {clientProperties(item).length} appartement(s)</option>)}
    </select></label>
    {client && (properties.length > 0 || kind === 'construction') && <label className="block text-sm">{kind === 'contract' ? 'Appartement concerné par le contrat' : 'Destination de la photo chez ce client'}
      <select key={`${clientId}/${kind}`} className="field mt-2" name={kind === 'contract' ? 'contractProperty' : 'constructionProperty'} defaultValue={properties.length ? '0' : 'all'} required>
        {kind === 'construction' && <option value="all">Dossier général du client · Tous ses appartements</option>}
        {properties.map((property, index) => {
          const project = projects.find(item => item.slug === property.projectSlug);
          const lot = project?.lots.find(item => item.ref === property.lotRef);
          return <option key={`${property.projectSlug}/${property.lotRef}`} value={index}>{project?.name ?? property.projectSlug} · {lot?.code ?? property.lotRef}</option>;
        })}
      </select>
    </label>}
    {kind === 'construction' && <p className="text-sm text-muted">La photo sera visible dans la rubrique Chantier du client sélectionné. Choisissez un appartement ou le dossier général de ce client.</p>}
  </div>;
}
