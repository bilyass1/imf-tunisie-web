const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, imports = {}) {
  const box = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { module: box, exports: box.exports, require: id => imports[id] ?? require(id) });
  return box.exports;
}

const { YASSAMINE_A5A_LOTS } = load('src/lib/lots-la-gloire.ts');
const { applyYassamineA5aFacts } = load('src/lib/yassamine-catalog.ts', {
  './lots-la-gloire': { YASSAMINE_A5A_LOTS },
  './yassamine-available.json': [],
  './yassamine-prices': { YASSAMINE_APPROVED_PRICES: {} },
});
const source = JSON.parse(fs.readFileSync('docs/yassamine-a5a-source-files.json', 'utf8'));
const otherListedLots = JSON.parse(fs.readFileSync('src/lib/yassamine-available.json', 'utf8'));
assert.equal(YASSAMINE_A5A_LOTS.length, 20);
assert.equal(source.plans.length, 20);
assert.equal(otherListedLots.length, 7);
for (const lot of otherListedLots) {
  assert.ok(lot.grossArea > 0 && lot.sellableArea > lot.grossArea);
  assert.ok(fs.statSync(`public${lot.planImage}`).size > 1000);
}

const existing = YASSAMINE_A5A_LOTS.map(([code]) => ({
  ref: code.replace(/[.\-]/g, ''), code, block: 'A5.a', floor: Number(code[3]),
  typology: 'S+2', status: 'reserved', price: 123456,
  rooms: [{ id: 'chambre-2', label: { fr: 'Chambre 2', en: 'Bedroom 2', ar: 'غرفة نوم 2' } }, { id: 'sdb' }],
}));
const project = { slug: 'diar-al-yassamine', lots: [...existing, { ref: 'A101', block: 'A1', grossArea: 85.85, status: 'sold' }] };
applyYassamineA5aFacts(project);
for (const lot of existing) {
  assert.ok(lot.grossArea > 0 && lot.sellableArea > lot.grossArea);
  assert.equal(lot.status, 'reserved');
  assert.equal(lot.price, 123456);
  assert.equal(lot.planUrl, `/plans/diar-al-yassamine/${lot.ref}.pdf`);
  assert.equal(lot.planImage, `/plans/diar-al-yassamine/${lot.ref}.webp`);
  const record = source.plans.find(item => item.ref === lot.ref);
  assert.ok(record, `Missing source ${lot.ref}`);
  const pdf = fs.readFileSync(`public${lot.planUrl}`);
  assert.equal(crypto.createHash('sha256').update(pdf).digest('hex'), record.pdfSha256);
  assert.ok(fs.statSync(`public${lot.planImage}`).size > 1000);
}
const a504 = existing.find(lot => lot.ref === 'A504');
assert.equal(a504.typology, 'S+3');
assert.equal(a504.grossArea, 80.32);
assert.equal(a504.sellableArea, 93.06);
assert.ok(a504.rooms.some(room => room.id === 'chambre-3'));
assert.equal(project.lots.at(-1).grossArea, 85.85);
console.log('PASS: all 27 listed Yassamine lots have measured areas/plans; A504 corrected; commercial data preserved.');
