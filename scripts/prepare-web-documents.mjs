import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

const root=path.resolve('public'),archive=path.resolve('source-assets');
const policy=JSON.parse(await fs.readFile('src/lib/public-document-sources.json','utf8'));
const approved=[],redirects={},report=[];
for(const source of policy) {
  const original=path.join(root,source),image=original.replace(/\.pdf$/,'.webp'),target=original.replace(/\.pdf$/,'.web.pdf');
  const input=await fs.readFile(original).catch(()=>fs.readFile(path.join(archive,source)));
  await fs.mkdir(path.dirname(target),{recursive:true});
  const pdf=await PDFDocument.load(input);
  const fresh=await fs.stat(target).then(async target=>target.mtimeMs>=(await fs.stat(image)).mtimeMs).catch(()=>false);
  if(fresh) { /* Reuse deterministic build derivatives. */ }
  else if(pdf.getPageCount()===1 && await fs.stat(image).catch(()=>false)) {
    const pixels=await sharp(image).resize({width:4000,height:4000,fit:'inside',withoutEnlargement:true}).jpeg({quality:88,mozjpeg:true}).toBuffer();
    const doc=await PDFDocument.create(),embedded=await doc.embedJpg(pixels),size=pdf.getPage(0).getSize(),page=doc.addPage([size.width,size.height]);
    page.drawImage(embedded,{x:0,y:0,width:size.width,height:size.height});
    await fs.writeFile(target,await doc.save());
  } else await fs.writeFile(target,input); // Never drop pages from a multi-page PDF.
  const url='/'+path.relative(root,target).replaceAll('\\','/');approved.push(url);redirects[source]=url;redirects[source.replace('/presentation/','/')]=url;
  report.push({source,beforeBytes:input.length,webBytes:(await fs.stat(target)).size,pages:pdf.getPageCount()});
}
async function walk(folder){return (await Promise.all((await fs.readdir(folder,{withFileTypes:true})).map(item=>item.isDirectory()?walk(path.join(folder,item.name)):[path.join(folder,item.name)]))).flat();}
const files=await walk(root);
for(const image of files.filter(file=>file.includes('/presentation/')&&file.endsWith('.webp')&&!file.endsWith('.preview.webp'))) {
  const output=image.replace(/\.webp$/,'.preview.webp');
  if(await fs.stat(output).then(async stat=>stat.mtimeMs>=(await fs.stat(image)).mtimeMs).catch(()=>false))continue;
  await sharp(image).resize({width:1800,height:1800,fit:'inside',withoutEnlargement:true}).webp({quality:82,effort:4}).toFile(image.replace(/\.webp$/,'.preview.webp'));
}
// Preserve source masters outside deployed /public; only approved web PDFs are published.
for(const file of files.filter(file=>/\.(pdf|dwg|skp)$/i.test(file)&&!approved.includes('/'+path.relative(root,file).replaceAll('\\','/')))) {
  const target=path.join(archive,path.relative(root,file));await fs.mkdir(path.dirname(target),{recursive:true});await fs.rename(file,target);
}
await fs.writeFile('src/lib/public-documents.json',JSON.stringify({approved:approved.sort(),redirects},null,2)+'\n');
await fs.writeFile('src/lib/public-assets.json',JSON.stringify((await walk(root)).filter(file=>/\.(webp|png|jpg|jpeg|avif|pdf|glb)$/i.test(file)).map(file=>'/'+path.relative(root,file).replaceAll('\\','/')).sort()));
await fs.mkdir('docs',{recursive:true});await fs.writeFile('docs/pdf-web-optimization.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({documents:report.length,sourceBytes:report.reduce((n,row)=>n+row.beforeBytes,0),webBytes:report.reduce((n,row)=>n+row.webBytes,0)}));
