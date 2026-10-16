import 'server-only';
export function assertProductionStorage() {
  if(process.env.NODE_ENV==='production' && process.env.NEXT_PHASE!=='phase-production-build') {
    if(!process.env.DATABASE_URL) throw new Error('PostgreSQL est obligatoire en production. Exécutez les migrations avant le démarrage.');
    const secret=process.env.AUTH_SECRET;
    if(!secret || secret.length<32 || secret.startsWith('changez-')) throw new Error('AUTH_SECRET doit être fourni explicitement en production (32 caractères minimum).');
  }
}
