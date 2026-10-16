import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { createHash } from 'node:crypto';

const root=path.resolve('public');
const policy=JSON.parse(await fs.readFile('src/lib/web-document-layouts.json','utf8'));
const approved=[],redirects={},report=[];
for(const layout of policy) {
  const {source,width,height}=layout;
  const original=path.join(root,source),image=original.replace(/\.pdf$/,'.webp'),target=original.replace(/\.pdf$/,'.web.pdf');
  // Only the already-published presentation image is needed at build time.
  // Source masters are external archive inputs, never tracked or deployed.
  if(!await fs.stat(image).catch(()=>false))throw new Error('Image de présentation approuvée manquante : '+source);
  const fresh=await fs.stat(target).then(async target=>target.mtimeMs>=(await fs.stat(image)).mtimeMs).catch(()=>false);
  if(fresh) { /* Reuse deterministic build derivatives. */ }
  else {
    const pixels=await sharp(image).resize({width:4000,height:4000,fit:'inside',withoutEnlargement:true}).jpeg({quality:88,mozjpeg:true}).toBuffer();
    const doc=await PDFDocument.create(),embedded=await doc.embedJpg(pixels),page=doc.addPage([width,height]);
    page.drawImage(embedded,{x:0,y:0,width,height});
    await fs.writeFile(target,await doc.save());
  }
  const url='/'+path.relative(root,target).replaceAll('\\','/');approved.push(url);redirects[source]=url;redirects[source.replace('/presentation/','/')]=url;
  report.push({source,sourceSha256:layout.sourceSha256,webBytes:(await fs.stat(target)).size,pages:1,webSha256:createHash('sha256').update(await fs.readFile(target)).digest('hex')});
}
async function walk(folder){return (await Promise.all((await fs.readdir(folder,{withFileTypes:true})).map(item=>item.isDirectory()?walk(path.join(folder,item.name)):[path.join(folder,item.name)]))).flat();}
const files=await walk(root);
for(const image of files.filter(file=>file.includes('/presentation/')&&file.endsWith('.webp')&&!file.endsWith('.preview.webp'))) {
  const output=image.replace(/\.webp$/,'.preview.webp');
  if(await fs.stat(output).then(async stat=>stat.mtimeMs>=(await fs.stat(image)).mtimeMs).catch(()=>false))continue;
  await sharp(image).resize({width:1800,height:1800,fit:'inside',withoutEnlargement:true}).webp({quality:82,effort:4}).toFile(image.replace(/\.webp$/,'.preview.webp'));
}
const masters=files.filter(file=>/\.(pdf|dwg|skp)$/i.test(file)&&!approved.includes('/'+path.relative(root,file).replaceAll('\\','/')));
if(masters.length)throw new Error('Master technique interdit dans public : '+masters[0]);
await fs.writeFile('src/lib/public-documents.json',JSON.stringify({approved:approved.sort(),redirects},null,2)+'\n');
await fs.writeFile('src/lib/public-assets.json',JSON.stringify((await walk(root)).filter(file=>/\.(webp|png|jpg|jpeg|avif|pdf|glb)$/i.test(file)).map(file=>'/'+path.relative(root,file).replaceAll('\\','/')).sort()));
await fs.mkdir('docs',{recursive:true});await fs.writeFile('docs/pdf-web-optimization.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({documents:report.length,webBytes:report.reduce((n,row)=>n+row.webBytes,0)}));
