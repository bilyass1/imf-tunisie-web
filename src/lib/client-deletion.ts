import 'server-only';
import type { Database } from './types';

const MEDIA_URL = /^\/api\/media\/([a-f0-9-]{36})(?:\?.*)?$/;

function mediaReferences(value: unknown, result = new Set<string>()): Set<string> {
  if (typeof value === 'string') {
    const match = MEDIA_URL.exec(value);
    if (match) result.add(match[1]);
  } else if (value && typeof value === 'object') {
    for (const child of Object.values(value)) mediaReferences(child, result);
  }
  return result;
}

export function deleteClientDossier(db: Database, clientId: string): void {
  const client = db.users.find(user => user.id === clientId && user.role === 'client');
  if (!client) throw new Error('Compte client introuvable.');
  const ownedReferences = mediaReferences(client);
  const candidates = new Set((db.uploads ?? []).filter(file => !file.public && (file.clientId === client.id || !file.clientId && ownedReferences.has(file.id))).map(file => file.id));
  db.users = db.users.filter(user => user.id !== client.id);
  const sharedReferences = mediaReferences({ users: db.users, projects: db.projects, news: db.news, company: db.company });
  if (db.uploads) db.uploads = db.uploads.filter(file => !candidates.has(file.id) || sharedReferences.has(file.id));
}
