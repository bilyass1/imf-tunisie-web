import 'server-only';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Présence d'un fichier de /public, résolue côté serveur.
 *
 * Évite les requêtes HEAD depuis le navigateur : celles-ci coûtaient un
 * aller-retour réseau par plan et par panoramique, et un 404 déclenchait en
 * développement la compilation de /_not-found (plus de 2 s observées).
 * Le résultat est mémorisé pour la durée du processus.
 */
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const cache = new Map<string, boolean>();

export function publicFileExists(url?: string | null): boolean {
  if (!url || !url.startsWith('/')) return false;
  const cached = cache.get(url);
  if (cached !== undefined) return cached;
  const rel = url.split('?')[0].replace(/^\/+/, '');
  const abs = path.join(PUBLIC_DIR, rel);
  const ok = abs.startsWith(PUBLIC_DIR) && fs.existsSync(abs);
  cache.set(url, ok);
  return ok;
}
