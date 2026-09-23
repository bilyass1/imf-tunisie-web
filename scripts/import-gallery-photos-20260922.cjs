const fs = require('node:fs/promises');
const sharp = require('sharp');

async function main() {
  const records = JSON.parse(await fs.readFile('docs/gallery-refresh-20260922.json', 'utf8'));
  if (records.length !== 54 || new Set(records.map(r => `${r.project}/${r.name}`)).size !== 54) throw new Error('Expected 54 unique gallery replacements');
  const previous = JSON.parse(await fs.readFile('docs/project-photos-20260922.json', 'utf8')).images;
  const mapping = {};
  const report = [];
  for (const r of records) {
    const master = `output/gallery-photos-20260922/${r.project}/${r.name}.png`;
    const output = `public/media/${r.project}/${r.name}-photo-20260922.webp`;
    await fs.mkdir(`output/gallery-photos-20260922/${r.project}`, { recursive: true });
    await fs.copyFile(r.path, master);
    await sharp(master).resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86, effort: 6 }).toFile(output);
    const { width, height } = await sharp(output).metadata();
    const source = `/media/${r.project}/${r.name}.jpg`;
    const visualization = r.project === 'marassim' || (r.project.startsWith('diar-al-andalous') && /^(hero|3d-|nuit)/.test(r.name));
    mapping[source] = { src: output.slice(6), kind: visualization ? 'visualization' : 'retouched' };
    report.push({ source, master, output, width, height, bytes: (await fs.stat(output)).size });
  }
  for (const r of previous) {
    mapping[r.reference] = { src: r.output.slice(6), kind: 'visualization' };
    report.push(r);
  }
  await fs.writeFile('src/lib/gallery-photo-refresh.json', JSON.stringify(mapping, null, 2) + '\n');
  await fs.writeFile('docs/gallery-photo-outputs-20260922.json', JSON.stringify({ mode: 'built-in image_gen edit', promptSet: 'docs/gallery-refresh-20260922.json', previousPromptSet: 'docs/project-photo-prompts-2026-09-22.json', originalsPreserved: true, images: report }, null, 2) + '\n');
  console.log(JSON.stringify({ images: report.length, bytes: report.reduce((sum, r) => sum + r.bytes, 0) }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
