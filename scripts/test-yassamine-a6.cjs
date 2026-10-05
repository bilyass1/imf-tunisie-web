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

const { YASSAMINE_A6_LOTS, includeYassamineA6Lots } = load('src/lib/yassamine-a6.ts');
const { listedYassamineLots } = load('src/lib/yassamine-picking.ts');
assert.equal(YASSAMINE_A6_LOTS.length, 32);
assert.equal(new Set(YASSAMINE_A6_LOTS.map(lot => lot.ref)).size, 32);
assert.equal(YASSAMINE_A6_LOTS.filter(lot => lot.block === 'A6.a').length, 20);
assert.equal(YASSAMINE_A6_LOTS.filter(lot => lot.block === 'A6.b').length, 12);
assert.equal(listedYassamineLots(YASSAMINE_A6_LOTS).length, 32);

for (const lot of YASSAMINE_A6_LOTS) {
  assert.equal(lot.status, 'available');
  assert.equal(lot.price, undefined);
  assert.ok(lot.sellableArea > lot.grossArea);
  assert.ok(fs.statSync(`public${lot.planUrl}`).size > 1000, lot.planUrl);
  assert.ok(fs.statSync(`public${lot.planImage}`).size > 1000, lot.planImage);
  const floorSheet = lot.block === 'A6.a'
    ? `A6a-${lot.floor === 4 ? 4 : lot.floor === 0 ? 0 : 1}`
    : `A6b-${lot.floor <= 1 ? lot.floor : 2}`;
  assert.ok(fs.statSync(`public/models/yassamine/presentation/${floorSheet}.pdf`).size > 1000);
}

const existing = { ...YASSAMINE_A6_LOTS[0], status: 'sold', price: 155000, planUrl: '/old.pdf' };
const project = { slug: 'diar-al-yassamine', lots: [existing], blocks: [] };
includeYassamineA6Lots(project);
assert.equal(project.lots.length, 32);
assert.equal(project.blocks.length, 2);
assert.equal(existing.status, 'sold');
assert.equal(existing.price, 155000);
assert.equal(existing.planUrl, YASSAMINE_A6_LOTS[0].planUrl);
includeYassamineA6Lots(project);
assert.equal(project.lots.length, 32);
assert.equal(project.blocks.length, 2);
console.log('PASS: A6.a/A6.b have 32 unique sheets, floor plans and available default status; existing commercial data is preserved.');
