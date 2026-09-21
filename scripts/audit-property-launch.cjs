const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const modules=new Map();
function load(file){
  const abs=path.join(root,file);if(modules.has(abs))return modules.get(abs);
  const box={exports:{}};modules.set(abs,box.exports);
  const localRequire=id=>{
    if(id.endsWith('.json'))return require(path.resolve(path.dirname(abs),id));
    if(id.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(abs),id+'.ts')));
    return require(id);
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(abs,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{module:box,exports:box.exports,require:localRequire,process,console});return box.exports;
}
const projects=load('src/lib/seed.ts').PROJECTS;
const exists=url=>url&&fs.existsSync(path.join(root,'public',url.split('?')[0]));
const assets=projects.filter(p=>p.lots.length).map(p=>({project:p.slug,apartments:p.lots.map(l=>({ref:l.ref,plan:exists(l.planImage)||false,interior:exists(`/interiors/la-gloire/${l.ref}.webp`)||false,rooms:(l.rooms??[]).map(r=>({id:r.id,url:r.panorama,available:exists(r.panorama)||false}))}))}));
fs.writeFileSync(path.join(root,'docs/apartment-media-audit.json'),JSON.stringify(assets,null,2));
console.log(JSON.stringify(assets.map(p=>({project:p.project,apartments:p.apartments.length,withPanoramas:p.apartments.filter(l=>l.rooms.some(r=>r.available)).length,missingPanoramaFiles:p.apartments.flatMap(l=>l.rooms).filter(r=>!r.available).length,withInterior:p.apartments.filter(l=>l.interior).length}))));
(async()=>{
  const origin=process.argv[2];if(!origin)return;
  const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/slow-pages-baseline.json'),'utf8'));
  const results=[];
  for(const row of baseline){
    const url=new URL(row.url);if(!url.pathname.includes('/projets/'))continue;
    const started=performance.now();const response=await fetch(origin+url.pathname+url.search,{signal:AbortSignal.timeout(30000)});
    const html=await response.text();results.push({path:url.pathname,status:response.status,baselineSeconds:row.seconds,localSeconds:Number(((performance.now()-started)/1000).toFixed(3)),htmlBytes:Buffer.byteLength(html),serverError:html.includes('Application error:')});
  }
  const sorted=results.map(r=>r.localSeconds).sort((a,b)=>a-b);
  const report={scope:'Local production HTTP full HTML response, warm process, file storage. Not an LCP or Vercel/PostgreSQL network measurement.',tested:results.length,failed:results.filter(r=>r.status!==200||r.serverError),medianSeconds:sorted[Math.floor(sorted.length/2)],p95Seconds:sorted[Math.floor(sorted.length*.95)],results};
  fs.writeFileSync(path.join(root,'docs/property-performance-check.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({tested:report.tested,failed:report.failed.length,medianSeconds:report.medianSeconds,p95Seconds:report.p95Seconds}));
  if(report.failed.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
