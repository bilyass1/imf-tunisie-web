import 'server-only';
import { redirect } from 'next/navigation';
import { getSession } from './session';
import { getUserById } from './db';
import type { User } from './types';

export async function requireClient(locale: string): Promise<User> {
  const session = await getSession();
  if (!session) redirect(`/${locale}/connexion`);
  const user = (await getUserById(session.sub));
  if (!user) redirect(`/${locale}/connexion`);
  return user;
}

export async function requireAdminUser(locale: string): Promise<User> {
  const session = await getSession();
  if (!session || session.role !== 'admin') redirect(`/${locale}/admin-connexion`);
  const user = (await getUserById(session.sub));
  if (!user || user.role !== 'admin') redirect(`/${locale}/admin-connexion`);
  return user;
}
