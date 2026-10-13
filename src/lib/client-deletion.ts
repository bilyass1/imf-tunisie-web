import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Database } from './types';

// Keep the required PIN verifier on the server; never serialize it to the UI.
const PIN_HASH = Buffer.from('7b90f96a3af47050561a50dde1f62a19de85fc97eebd043929f404cf4a8aee6e', 'hex');
const MEDIA_URL = /^\/api\/media\/([a-f0-9-]{36})(?:\?.*)?$/;

export function validClientDeletionPin(pin: string): boolean {
  if (!/^\d{8}$/.test(pin)) return false;
  return timingSafeEqual(PIN_HASH, createHash('sha256').update(`client-delete:${pin}`).digest());
}

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
