import type { Database } from './types';
export interface MediaWrite { id: string; bytes: Buffer }
export interface PostgresStore {
  read(): Promise<Database>;
  write(data: Database, media?: MediaWrite): Promise<void>;
  readMedia(id: string): Promise<Buffer | undefined>;
}
export function getStore(): PostgresStore;
