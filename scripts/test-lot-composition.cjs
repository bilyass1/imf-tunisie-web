const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/lib/lot-composition.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleBox = { exports: {} };
vm.runInNewContext(compiled, { module: moduleBox, exports: moduleBox.exports, require: () => ({}) });
const { parseCompositionColumns, visibleComposition } = moduleBox.exports;

const initial = [{ id: 'salon', label: { fr: 'Séjour', en: 'Living room', ar: 'غرفة المعيشة' }, panorama: '/360/test.webp' }];
assert.equal(visibleComposition({ rooms: initial }).length, 1);
const saved = parseCompositionColumns('Séjour\nBalcon', 'Living room\nBalcony', 'غرفة المعيشة\nشرفة');
assert.equal(saved.length, 2);
assert.equal(saved[1].fr, 'Balcon');
assert.equal(visibleComposition({ rooms: initial, composition: saved }).length, 2);
assert.equal(visibleComposition({ rooms: initial, composition: [] }).length, 0);
assert.equal(parseCompositionColumns('Séjour\nBalcon', 'Living room', 'غرفة المعيشة\nشرفة'), null);
assert.equal(parseCompositionColumns('Séjour\n\nBalcon', 'Living room\nOther\nBalcony', 'غرفة المعيشة\nأخرى\nشرفة'), null);
assert.equal(parseCompositionColumns('', '', '').length, 0);
console.log('PASS: translated apartment composition overrides 360° room labels and validates aligned lines.');
