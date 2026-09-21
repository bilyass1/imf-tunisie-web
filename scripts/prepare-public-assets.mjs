import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve('public');
async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]));
  return nested.flat();
}
// Web derivatives preserve projection, aspect ratio and source masters.
// Never create a panorama by stretching or duplicating another apartment.
const before = await walk(root);
const optimized = [];
for (const file of before.filter(f=>f.startsWith(path.join(root,'360')) && /\.(png|jpg)$/i.test(f) && !/\.source\.png$/i.test(f))) {
  const master = file.replace(/\.[^.]+$/,'.source.png');
  const source = await fs.stat(master).then(()=>master).catch(()=>file);
  const output = file.replace(/\.[^.]+$/,'.optimized.webp');
  const original = await sharp(source).metadata();
  const exists = await fs.stat(output).catch(()=>null);
  if (!exists || exists.mtimeMs < (await fs.stat(source)).mtimeMs) {
    await sharp(source).resize({width:Math.min(original.width,4096),withoutEnlargement:true}).webp({quality:88,effort:4}).toFile(output);
  }
  optimized.push({ url:'/'+path.relative(root,output).replaceAll('\\','/'), originalBytes:(await fs.stat(source)).size, webBytes:(await fs.stat(output)).size });
}
const files = (await walk(root)).filter(f=>/\.(webp|png|jpg|jpeg|avif|pdf|glb)$/i.test(f));
const manifest = files.map(f=>'/'+path.relative(root,f).replaceAll('\\','/')).sort();
await fs.writeFile('src/lib/public-assets.json',JSON.stringify(manifest));
await fs.mkdir('docs',{recursive:true});
await fs.writeFile('docs/media-optimization.json',JSON.stringify({ optimized, count:manifest.length },null,2));
console.log(JSON.stringify({files:manifest.length,panoramaDerivatives:optimized.length,sourceBytes:optimized.reduce((s,a)=>s+a.originalBytes,0),webBytes:optimized.reduce((s,a)=>s+a.webBytes,0)}));
