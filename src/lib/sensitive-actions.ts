import 'server-only';
import bcrypt from 'bcryptjs';
import type { Database } from './types';
import { allowRequest } from './rate-limit';

/** Re-authenticate the current operator; never use a shared application secret. */
export async function verifyAdminPassword(db: Database, actorId: string, password: string): Promise<boolean> {
  if(!await allowRequest('admin-reauth',actorId,5,60000)) throw new Error('Trop de tentatives. Réessayez dans une minute.');
  const actor=db.users.find(user=>user.id===actorId && user.role==='admin');
  return !!actor && !!password && Buffer.byteLength(password)<=72 && await bcrypt.compare(password,actor.passwordHash);
}
