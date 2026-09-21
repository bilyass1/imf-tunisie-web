import type { Database } from './types';
export interface MediaWrite { id: string; bytes: Buffer }
export interface PostgresStore {
  read(): Promise<Database>;
  readPublic(): Promise<Pick<Database, 'projects' | 'news' | 'company'>>;
  write(data: Database, media?: MediaWrite): Promise<void>;
  readMedia(id: string): Promise<Buffer | undefined>;
}
export function getStore(seedFactory?: () => Database): PostgresStore;
