const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file) {
  const box = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, { module: box, exports: box.exports, require });
  return box.exports;
}

const { YASSAMINE_A5B_LOTS, includeYassamineA5bLots } = load('src/lib/yassamine-a5b.ts');
assert.equal(YASSAMINE_A5B_LOTS.length, 25);
assert.equal(new Set(YASSAMINE_A5B_LOTS.map(lot => lot.ref)).size, 25);
for (const lot of YASSAMINE_A5B_LOTS) {
  assert.equal(lot.status, 'available');
  assert.equal(lot.price, undefined);
  assert.ok(lot.sellableArea > lot.grossArea);
  assert.ok(fs.statSync(`public${lot.planUrl}`).size > 1000, lot.planUrl);
  assert.ok(fs.statSync(`public${lot.planImage}`).size > 1000, lot.planImage);
  const floorSheet = `A5b-${lot.floor === 0 ? 0 : 1}`;
  assert.ok(fs.statSync(`public/models/yassamine/presentation/${floorSheet}.pdf`).size > 1000);
}
assert.equal(YASSAMINE_A5B_LOTS.find(lot => lot.ref === 'A5b03').typology, 'S+1');
assert.equal(YASSAMINE_A5B_LOTS.find(lot => lot.ref === 'A5b05').terraceArea, 15.86);

const existing = { ...YASSAMINE_A5B_LOTS[0], status: 'reserved', price: 155000, planUrl: '/old.pdf' };
const project = { slug: 'diar-al-yassamine', lots: [existing], blocks: [] };
includeYassamineA5bLots(project);
assert.equal(project.lots.length, 25);
assert.equal(project.blocks.length, 1);
assert.equal(existing.status, 'reserved');
assert.equal(existing.price, 155000);
assert.equal(existing.planUrl, YASSAMINE_A5B_LOTS[0].planUrl);
includeYassamineA5bLots(project);
assert.equal(project.lots.length, 25);
console.log('PASS: A5.b has 25 unique sheets, verified areas and navigable floors; commercial changes are preserved.');
