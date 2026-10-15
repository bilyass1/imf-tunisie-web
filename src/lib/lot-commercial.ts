import 'server-only';
import type { Database, Lot, LotStatus, User } from './types';
import { clientProperties, setClientProperties } from './client-properties';

export function lotClient(db: Database, projectSlug: string, lotRef: string): User | undefined {
  return db.users.find(user => user.role === 'client' && clientProperties(user).some(property => property.projectSlug === projectSlug && property.lotRef === lotRef));
}

export function attachClientLot(db: Database, client: User, projectSlug: string, lotRef: string) {
  const owner = lotClient(db, projectSlug, lotRef);
  if (owner && owner.id !== client.id) throw new Error('Cet appartement possède déjà un autre compte client.');
  const properties = clientProperties(client);
  if (!properties.some(property => property.projectSlug === projectSlug && property.lotRef === lotRef)) {
    setClientProperties(client, [...properties, { projectSlug, lotRef }]);
  }
}

/** All admin entry points use the lot as the single source of sale status. */
export function changeLotStatus(db: Database, projectSlug: string, lot: Lot, rawStatus: string, authorized: boolean, note?: string) {
  if (!['available', 'reserved', 'sold', 'unconfirmed'].includes(rawStatus)) throw new Error('Statut invalide.');
  const status = rawStatus as LotStatus;
  if (lot.status === 'sold' && status !== 'sold' && authorized !== true) {
    throw new Error('Mot de passe administrateur requis pour modifier un appartement vendu.');
  }
  if (status === 'sold' && !lotClient(db, projectSlug, lot.ref)) throw new Error('Créez ou rattachez un compte client avant de marquer cet appartement vendu.');
  if (note !== undefined && note.length > 2000) throw new Error('La note de réservation est limitée à 2 000 caractères.');
  lot.status = status;
  if (status !== 'reserved') delete lot.reservationNote;
  else if (note !== undefined) lot.reservationNote = note.trim() || undefined;
}
