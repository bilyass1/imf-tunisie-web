const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
function load(file) {
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, Set,
    require: name => load(path.resolve(path.dirname(file), name + (name.endsWith('.json') ? '' : '.ts'))),
  });
  return module.exports;
}
async function main() {
  const photos = require('../src/lib/marassim-photos-20261022.json');
  const { projectPresentation, materializeProjectGallery } = load(path.join(root, 'src/lib/project-presentation.ts'));
  const original = { slug: 'complexe-marassim', heroImage: '/custom/hero.webp', cover: '/custom/cover.webp',
    galleryEdited: true, presentationEdited: true,
    gallery: [{ src: '/api/media/owner-photo', caption: { fr: 'Choix admin', en: 'Admin choice', ar: 'اختيار الإدارة' } }],
  };
  const presented = projectPresentation(original);
  assert.equal(original.gallery.length, 1, 'Reading must not mutate persisted records');
  assert.equal(presented.gallery.length, 62);
  assert.equal(presented.gallery[0], original.gallery[0], 'Existing admin order and captions survive');
  assert.equal(presented.cover, '/media/marassim/facade-client-20261027.webp', 'The newly supplied facade is displayed on project cards');
  assert.equal(presented.heroImage, presented.cover, 'The project page displays the same facade');
  assert.equal(original.cover, '/custom/cover.webp', 'The presentation override does not rewrite stored data');
  assert.equal(JSON.stringify(projectPresentation(presented)), JSON.stringify(presented));
  assert.equal(new Set(photos.map(p => p.src)).size, 61, 'Same original filename must not overwrite another entry');
  materializeProjectGallery(original);
  const removed = original.gallery.splice(1, 1)[0];
  original.gallery[1].caption.fr = 'Légende corrigée';
  const after = projectPresentation(JSON.parse(JSON.stringify(original)));
  assert.equal(after.gallery.length, 61, 'An admin removal must not be reimported');
  assert(!after.gallery.some(p => p.src === removed.src));
  assert.equal(after.gallery[1].caption.fr, 'Légende corrigée');
  assert.equal(projectPresentation({ ...original, slug: 'other-project' }).gallery.length, 61);
  let bytes = 0;
  for (const photo of photos) {
    const file = path.join(root, 'public', photo.src);
    const meta = await sharp(file).metadata();
    assert.equal(meta.format, 'webp');
    assert(Math.max(meta.width, meta.height) <= 2400);
    assert(!meta.exif, 'Private camera metadata must be stripped');
    assert(['works', 'interiors'].includes(photo.category));
    for (const lang of ['fr', 'en', 'ar']) assert(photo.caption[lang]);
    bytes += fs.statSync(file).size;
  }
  assert(bytes < 25 * 1024 * 1024);
  console.log(`61 WebP photos verified (${bytes} bytes); existing galleries, edits, removals and batch idempotency preserved.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
