const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const forbidden = ['imf-' + 'immobilere', 'imf-' + 'immobilier.tn'];
const failures = [];
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) { scan(file); continue; }
    const bytes = fs.readFileSync(file);
    if (bytes.includes(0)) continue;
    let text = bytes.toString('utf8');
    if (file === 'src/lib/company.ts') text = text.replace("'contact@" + forbidden[0] + ".tn'", "''");
    if (forbidden.some(domain => text.includes(domain))) failures.push(file);
  }
}
for (const dir of ['src', 'public', 'scripts']) scan(dir);
assert.deepEqual(failures, [], `Domaines erronés : ${failures.join(', ')}`);
console.log('PASS: domaine officiel et seule exception de la liste noire.');
