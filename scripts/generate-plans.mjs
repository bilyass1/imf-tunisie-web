#!/usr/bin/env node
/**
 * Convertit les plans de vente PDF (export AutoCAD) en images web.
 *
 *   public/plans/<projet>/A11.pdf   →   public/plans/<projet>/A11.webp
 *
 * Utilisation :
 *   1. Copier les PDF de vente dans public/plans/la-gloire/ et
 *      public/plans/diar-al-yassamine/ en gardant le nom du lot (A11.pdf…).
 *   2. npm run plans
 *
 * Prérequis : Poppler (pdftoppm) ou ImageMagick.
 *   Windows  : https://github.com/oschwartz10612/poppler-windows/releases
 *              puis ajouter le dossier bin\ au PATH
 *   macOS    : brew install poppler
 *   Linux    : sudo apt install poppler-utils
 */

import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.resolve(process.cwd(), 'public', 'plans');
const DPI = process.env.PLAN_DPI ?? '160';

function has(cmd) {
  try {
    execSync(process.platform === 'win32' ? `where ${cmd}` : `command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const hasPdftoppm = has('pdftoppm');
const magick = has('magick') ? 'magick' : has('convert') ? 'convert' : null;

if (!hasPdftoppm && !magick) {
  console.error('\n✖ Ni pdftoppm (Poppler) ni ImageMagick n’ont été trouvés.');
  console.error('  Installez Poppler puis relancez : npm run plans');
  console.error('  Windows : https://github.com/oschwartz10612/poppler-windows/releases\n');
  process.exit(1);
}

if (!fs.existsSync(ROOT)) {
  console.error(`✖ Dossier introuvable : ${ROOT}`);
  console.error('  Créez-le et déposez-y les PDF, par projet : public/plans/la-gloire/A11.pdf');
  process.exit(1);
}

let converted = 0;
let skipped = 0;

for (const project of fs.readdirSync(ROOT)) {
  const dir = path.join(ROOT, project);
  if (!fs.statSync(dir).isDirectory()) continue;

  const pdfs = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf'));
  if (pdfs.length === 0) continue;

  console.log(`\n▸ ${project} — ${pdfs.length} plan(s)`);

  for (const file of pdfs) {
    const name = path.basename(file, path.extname(file));
    const out = path.join(dir, `${name}.webp`);

    if (fs.existsSync(out)) {
      skipped += 1;
      continue;
    }

    const src = path.join(dir, file);
    const tmp = path.join(os.tmpdir(), `imf-plan-${name}`);

    try {
      if (hasPdftoppm) {
        execFileSync('pdftoppm', ['-png', '-r', DPI, '-f', '1', '-l', '1', src, tmp], { stdio: 'ignore' });
        const png = `${tmp}-1.png`;
        if (magick) {
          execFileSync(magick, [png, '-trim', '+repage', '-resize', '2200x2200>', '-quality', '86', out], {
            stdio: 'ignore',
          });
          fs.rmSync(png, { force: true });
        } else {
          // Pas d'ImageMagick : on garde le PNG sous l'extension attendue
          fs.renameSync(png, path.join(dir, `${name}.png`));
          console.log(`   ${name} → ${name}.png (installez ImageMagick pour le WebP)`);
          converted += 1;
          continue;
        }
      } else {
        execFileSync(magick, [
          '-density',
          DPI,
          `${src}[0]`,
          '-trim',
          '+repage',
          '-resize',
          '2200x2200>',
          '-quality',
          '86',
          out,
        ], { stdio: 'ignore' });
      }

      converted += 1;
      process.stdout.write(`   ${name} ✓\n`);
    } catch (err) {
      console.error(`   ${name} ✖ ${err.message.split('\n')[0]}`);
    }
  }
}

console.log(`\n✔ ${converted} plan(s) converti(s), ${skipped} déjà présent(s).`);
console.log('  Les fiches appartement affichent désormais le plan directement dans la page.\n');
