const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const ts = require('typescript');
const mapping = require('../src/lib/gallery-photo-refresh.json');
const box = { exports: {} };
const js = ts.transpileModule(fs.readFileSync('src/lib/project-presentation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
vm.runInNewContext(js, { module: box, exports: box.exports, require: name => name === './gallery-photo-refresh.json' ? mapping : require(name) });
const { projectPresentation } = box.exports;
const projects = [['marassim','complexe-marassim',16],['zephyr','residence-zephyr',18],['diar-al-andalous-1','diar-al-andalous-1',12],['diar-al-andalous-2','diar-al-andalous-2',12]];
async function main() {
  assert.equal(Object.keys(mapping).length, 58);
  assert.equal(new Set(Object.values(mapping).map(r => r.src)).size, 58);
  for (const [source, r] of Object.entries(mapping)) {
    assert(fs.existsSync(`public${source}`), `Missing original ${source}`);
    assert(fs.existsSync(`public${r.src}`), `Missing replacement ${r.src}`);
    const response = await fetch(`http://127.0.0.1:3107${r.src}`);
    assert.equal(response.status, 200, r.src);
    assert(response.headers.get('content-type').startsWith('image/'));
    await response.arrayBuffer();
  }
  for (const [dir, slug, count] of projects) {
    const entries = Object.keys(mapping).filter(src => src.startsWith(`/media/${dir}/`));
    assert.equal(entries.length, count);
    const custom = { src: '/uploads/admin-photo.jpg', caption: { fr:'Admin', en:'Admin', ar:'Admin' } };
    const project = { slug, heroImage:`/media/${dir}/hero.jpg`, cover:'/uploads/custom-cover.jpg', gallery:[...entries.map(src => ({ src, caption:{fr:'Vue',en:'View',ar:'مشهد'} })),custom] };
    const result = projectPresentation(project);
    assert.equal(result.gallery.length, count + 1);
    assert.equal(result.gallery.filter(r => r.src.endsWith('-20260922.webp')).length, count);
    assert.equal(JSON.stringify(result), JSON.stringify(projectPresentation(result)), 'Mapping must be idempotent');
    assert.equal(result.cover, project.cover);
    assert.equal(result.gallery.at(-1), custom);
    const response = await fetch(`http://127.0.0.1:3107/fr/projets/${slug}`);
    assert.equal(response.status, 200, slug);
    const html = await response.text();
    for (const source of entries) assert(html.includes(mapping[source].src) || html.includes(encodeURIComponent(mapping[source].src)), `Missing page image ${source}`);
  }
  console.log('58 gallery images and 4 project pages: HTTP 200; originals preserved; mapping idempotent; admin uploads unchanged.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
