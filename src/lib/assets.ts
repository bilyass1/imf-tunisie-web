import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import bundledAssets from './public-assets.json';

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
const bundled = new Set(bundledAssets);

export function publicFileExists(url?: string | null): boolean {
  if (!url || !url.startsWith('/')) return false;
  if (bundled.has(url.split('?')[0])) return true;
  const cached = cache.get(url);
  if (cached !== undefined) return cached;
  const rel = url.split('?')[0].replace(/^\/+/, '');
  const abs = path.join(PUBLIC_DIR, rel);
  const ok = abs.startsWith(PUBLIC_DIR + path.sep) && fs.existsSync(abs);
  cache.set(url, ok);
  return ok;
}

/** Serve a 4K web derivative first; retain masters without loading PNGs on mobile. */
export function panoramaAssets(url?: string) {
  if (!url) return { panorama: undefined, available: false };
  // Commercial uploads are stored outside /public and served by the guarded
  // media route. A valid media URL is already backed by a committed upload.
  if (/^\/api\/media\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(url)) return { panorama: url, available: true };
  const stem = url.replace(/\.[^.]+$/, '');
  const source = `${stem}.source.png`;
  const optimized = `${stem}.optimized.webp`;
  const panorama = publicFileExists(optimized) ? optimized : publicFileExists(url) ? url : source;
  const highResolution = [`${stem}.8k.jpg`, `${stem}.4k.jpg`].find(publicFileExists);
  return { panorama, available: publicFileExists(panorama), highResolution };
}
