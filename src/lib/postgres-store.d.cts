import type { AuditEvent } from './audit';
import type { Database, User } from './types';
export interface MediaWrite { id: string; bytes: Buffer }
export interface PostgresStore {
  conversationRevision(id:string,admin:boolean):Promise<string>;
  canReadMedia(id:string,userId:string):Promise<boolean>;
  readAudit():Promise<AuditEvent[]>;
  read(): Promise<Database>;
  readPublic(): Promise<Pick<Database, 'projects' | 'news' | 'company'>>;
  revision(): Promise<string>;
  write(data: Database, media?: MediaWrite,audit?:AuditEvent): Promise<void>;
  readMedia(id: string): Promise<Buffer | undefined>;
  readMediaMetadata(id: string): Promise<NonNullable<Database['uploads']>[number] | undefined>;
  consumeRateLimit(key: string, limit: number, windowMs: number, now?: number): Promise<boolean>;
  readAuthUser(field: 'id' | 'email', value: string): Promise<Pick<User, 'id' | 'email' | 'role' | 'passwordHash' | 'authVersion' | 'name'> | undefined>;
  readUserById(id: string): Promise<User | undefined>;
}
export function getStore(seedFactory?: () => Database): PostgresStore;
