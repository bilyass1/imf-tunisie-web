import type { Database, User } from './types';
export interface MediaWrite { id: string; bytes: Buffer }
export interface PostgresStore {
  read(): Promise<Database>;
  readPublic(): Promise<Pick<Database, 'projects' | 'news' | 'company'>>;
  revision(): Promise<string>;
  write(data: Database, media?: MediaWrite): Promise<void>;
  readMedia(id: string): Promise<Buffer | undefined>;
  readMediaMetadata(id: string): Promise<NonNullable<Database['uploads']>[number] | undefined>;
  consumeRateLimit(key: string, limit: number, windowMs: number, now?: number): Promise<boolean>;
  readAuthUser(field: 'id' | 'email', value: string): Promise<Pick<User, 'id' | 'email' | 'role' | 'passwordHash' | 'authVersion' | 'name'> | undefined>;
  readUserById(id: string): Promise<User | undefined>;
}
export function getStore(seedFactory?: () => Database): PostgresStore;
