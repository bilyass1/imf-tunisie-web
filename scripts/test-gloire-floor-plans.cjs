const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const THREE = require('three');
const sharp = require('sharp');
function load(name) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(`src/lib/${name}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => id.startsWith('./') ? load(id.slice(2)) : require(id) });
  return module.exports;
}
const { gloireFloorGeometry } = load('gloire-floor-plans');
const { gloireModelPlan, gloireSalesPlan, gloireFloorHeight } = load('la-gloire-registration');
const data = JSON.parse(fs.readFileSync('public/models/la-gloire/floor-plans.json', 'utf8'));
const hash = path => crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
function contains(t, x, y) {
  for (let i = 0; i < t.length; i += 6) {
    const cross = (a, b) => (t[b] - t[a]) * (y - t[a + 1]) - (t[b + 1] - t[a + 1]) * (x - t[a]);
    const signs = [cross(i, i + 2), cross(i + 2, i + 4), cross(i + 4, i)];
    if (signs.every(s => s >= -1e-5) || signs.every(s => s <= 1e-5)) return true;
  }
  return false;
}
(async () => {
  assert.equal(data.sourceSha256, hash('public/models/la-gloire/la-gloire-web.glb'));
  assert.equal(data.floors.map(f => f.floor).join(','), '0,1,2,3,4,5');
  for (const floor of data.floors) {
    assert.equal(floor.slabZ, gloireFloorHeight(floor.floor));
    assert.equal(floor.capZ, floor.slabZ + 2.9);
    assert(!contains(floor.triangles, 111, 125), 'Courtyard must remain open');
    assert(!contains(floor.triangles, 98, 124), 'Garden must not become a floor-plan plane');
    assert(contains(floor.triangles, 135, 140), 'Actual architect slab must remain covered');
    const geometry = gloireFloorGeometry(THREE, floor, data.bounds);
    const uv = geometry.getAttribute('uv'), position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
    assert.equal(position.count, floor.triangles.length / 2);
    for (let i = 0; i < uv.count; i++) {
      assert(uv.getX(i) >= 0 && uv.getX(i) <= 1 && uv.getY(i) >= 0 && uv.getY(i) <= 1);
      assert(Math.abs(position.getZ(i) - floor.capZ - .01) < .00001);
      assert(normal.getZ(i) > .999, 'Cap must face upward after the architect-model rotation');
    }
    geometry.dispose();
    const image = await sharp(`public${floor.texture}`).metadata();
    assert.equal(image.format, 'webp'); assert.equal(image.width, 3072); assert.equal(image.height, 3072);
    assert.equal(data.sources[floor.floor].sha256, hash(`public/plans/la-gloire/ensemble/${data.sources[floor.floor].file}.webp`));
  }
  const north = gloireModelPlan(-25.55, -24.29), south = gloireModelPlan(20.97, 23.17);
  assert(north[1] > south[1], 'Source image north must map to SketchUp +Y');
  for (const point of [[-25.55, -24.29], [20.97, 23.17], [0, 0]]) {
    const roundtrip = gloireSalesPlan(...gloireModelPlan(...point));
    point.forEach((value, i) => assert(Math.abs(value - roundtrip[i]) < 1e-8));
  }
  console.log('PASS: six architect-derived 3D floor caps, source hashes, original slab heights, courtyard/garden exclusion, upward triangles, UV registration and WebP textures.');
})().catch(error => { console.error(error); process.exitCode = 1; });
