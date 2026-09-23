const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const crypto = require('node:crypto');

const sources = [
  ['marassim', 'exec-617826e2-d6d9-4367-b34e-896cb80486ea.png', 'hero.jpg'],
  ['zephyr', 'exec-34405ee3-76fb-4d01-84c4-134422557cab.png', 'ext-3.jpg'],
  ['diar-al-andalous-1', 'exec-5250fbd4-7e15-4bb9-aa11-89192ed470b1.png', 'hero.jpg'],
  ['diar-al-andalous-2', 'exec-953ecde9-d664-4b89-b9cb-7232b8e3a9b3.png', 'hero.jpg'],
];
async function main() {
  const generatedDirectory = process.argv[2];
  if (!generatedDirectory) throw new Error('Pass the generated-image directory.');
  const records = [];
  await fs.mkdir('output/project-photos-20260922', { recursive: true });
  for (const [project, filename, reference] of sources) {
    const input = path.join(generatedDirectory, filename);
    const master = `output/project-photos-20260922/${project}.png`;
    const output = `public/media/${project}/facade-photo-20260922.webp`;
    await fs.copyFile(input, master);
    await sharp(input).resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 88, effort: 6 }).toFile(output);
    const { width, height } = await sharp(output).metadata();
    const bytes = await fs.readFile(output);
    records.push({ project, reference: `/media/${project}/${reference}`, generatedFile: filename, master, output, width, height, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
  }
  await fs.writeFile('docs/project-photos-20260922.json', JSON.stringify({ mode: 'built-in image_gen edit', originalsPreserved: true, images: records }, null, 2) + '\n');
  console.log(JSON.stringify(records.map(({project,width,height,bytes})=>({project,width,height,bytes}))));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
