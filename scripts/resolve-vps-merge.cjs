// One-time integration of PR 4 into the October 22 VPS checkout.
// Run as the owner of the candidate worktree, with the prepared repair commit.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');

const [candidate, repair] = process.argv.slice(2);
assert(candidate && /^[a-f0-9]{40}$/.test(repair), 'Usage: node resolve-vps-merge.cjs CANDIDATE REPAIR_SHA');
const root = fs.realpathSync(candidate);
const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const gitBytes = (...args) => execFileSync('git', ['-C', root, ...args], { maxBuffer: 16 * 1024 * 1024 });
const incoming = 'a2ed78e1c27494edc77840cfef529a4fcfd3cff0';
assert.equal(git('rev-parse', 'MERGE_HEAD').trim(), incoming, 'Unexpected pending merge; no files changed');
const expected = {
  'package.json': '28619b8517dd66ef4353286aef1d056aa73872f5',
  'scripts/test-commercial.cjs': 'b248e99d5e63df7dc2b8277df09e25e60b4a6baa',
  'src/components/site/GloireArchitectMaquette.tsx': '6e00667fea019af09933b0dda662c1e5b4607375',
  'src/lib/la-gloire-registration.ts': '312352654aee14ae30af1fae7f6bec1335782c0c',
  'src/lib/project-presentation.ts': '089429de8e018469fe293a335635b406299c2c92',
};
const additional = {
  'scripts/test-gloire-floor-plans.cjs': 'e320829edee8d84344d75bec0c6e558f7c39a54c',
  'src/app/[locale]/(site)/projets/[slug]/page.tsx': 'c131506ef4e9806951c922b5e241d3c4d6eb0710',
  'src/components/site/LaGloirePlanLibrary.tsx': '29bc7ce7893ed1bbaae907f64cdc72a965f52577',
  'src/components/site/YassamineFinancing.tsx': 'b4ea846c19cce3db45cbda5f55e07f5cebf3960d',
  'src/lib/public-document-sources.json': 'f4bb8f798e4016af2cac701650794e14840dda2a',
  'src/lib/public-documents.json': '244a914543ee75e1c077c2b2f4b88f4d4c6c0176',
};
const contact = 'src/app/[locale]/(site)/contact/page.tsx';
const assets = 'src/lib/public-assets.json';
const newComponent = 'src/components/site/LaGloireOverviewPlans.tsx';
const conflicts = git('diff', '--name-only', '--diff-filter=U', '-z').split('\0').filter(Boolean);
const allowed = new Set([...Object.keys(expected), contact, assets]);
assert(conflicts.every(file => allowed.has(file)), 'Unexpected conflict; no files changed');
const writes = new Map();
for (const [file, sha] of Object.entries(expected)) {
  assert.equal(git('rev-parse', `:2:${file}`).trim(), sha, `Unexpected VPS version: ${file}; no files changed`);
  const current = fs.readFileSync(path.join(root, file), 'utf8');
  assert(current.includes('<<<<<<<'), `Already edited conflict: ${file}; no files changed`);
  writes.set(file, git('show', `${repair}:${file}`));
}
for (const [file, sha] of Object.entries(additional)) {
  assert.equal(git('rev-parse', `:0:${file}`).trim(), sha, `Unexpected staged version: ${file}; no files changed`);
  assert.equal(git('hash-object', '--', file).trim(), sha, `Unstaged changes: ${file}; no files changed`);
  writes.set(file, git('show', `${repair}:${file}`));
}
assert(!fs.existsSync(path.join(root, newComponent)), 'New component already exists; no files changed');
writes.set(newComponent, git('show', `${repair}:${newComponent}`));
for (const name of ['decision-prix-2025-03-03', 'liste-projets-2025-12-18']) {
  for (const file of [`source-assets/documents/diar-al-yassamine/${name}.pdf`, `public/documents/diar-al-yassamine/${name}.web.pdf`]) {
    assert(!fs.existsSync(path.join(root, file)), `Document already exists: ${file}; no files changed`);
    writes.set(file, gitBytes('show', `${repair}:${file}`));
  }
}

// Keep the server's generated asset catalogue, including private local additions.
const assetLists = [2, 3].map(stage => JSON.parse(git('show', `:${stage}:${assets}`)));
assetLists.push(JSON.parse(git('show', `${repair}:${assets}`)));
assert(assetLists.every(list => Array.isArray(list) && list.every(item => typeof item === 'string')), 'Unexpected assets format');
writes.set(assets, JSON.stringify([...new Set(assetLists.flat())].sort()) + '\n');

// Preserve the server contact page and change only its email lines/links.
const ours = git('show', `${conflicts.includes(contact) ? ':2' : 'HEAD'}:${contact}`);
const mailStart = ours.indexOf('      Icon: IconMail,');
assert(mailStart >= 0 && mailStart === ours.lastIndexOf('      Icon: IconMail,'), 'Contact email block needs manual review; no files changed');
const mailEnd = ours.indexOf('\n    },', mailStart);
assert(mailEnd > mailStart, 'Contact email block needs manual review; no files changed');
const block = ours.slice(mailStart, mailEnd);
const lines = block.match(/lines:\s*\[([^\]\n]+)\],/);
const hrefs = block.match(/hrefs:\s*\[[^\]\n]+\],/);
assert(lines && hrefs && lines[1].includes('SITE.email') && hrefs[0].includes('mailto:'), 'Contact email format needs manual review; no files changed');
assert(!ours.includes('const vpsContactEmails'), 'Contact email variable already exists; no files changed');
const updatedBlock = block.replace(lines[0], 'lines: vpsContactEmails,')
  .replace(hrefs[0], 'hrefs: vpsContactEmails.map(email => `mailto:${email}`),');
let updatedContact = ours.slice(0, mailStart) + updatedBlock + ours.slice(mailEnd);
assert.equal((ours.match(/  const infos = \[/g) || []).length, 1, 'Contact infos need manual review; no files changed');
updatedContact = updatedContact.replace('  const infos = [',
  `  const vpsContactEmails = Array.from(new Map([${lines[1]}, SITE.infoEmail].map(email => [email.toLowerCase(), email])).values());\n\n  const infos = [`);
writes.set(contact, updatedContact);
for (const [file, contents] of writes) {
  if (typeof contents === 'string') assert(!/^(<<<<<<<|=======|>>>>>>>)/m.test(contents), `Unresolved markers in ${file}`);
}

const backup = path.join(root, 'tmp', `vps-merge-backup-${Date.now()}`);
fs.mkdirSync(backup, { recursive: true, mode: 0o700 });
fs.writeFileSync(path.join(backup, 'index.patch'), git('diff', '--cached', '--binary'), { mode: 0o600 });
for (const file of writes.keys()) {
  if (!fs.existsSync(path.join(root, file))) continue;
  const dest = path.join(backup, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(root, file), dest);
}
fs.writeFileSync(path.join(backup, 'contact-before.tsx'), ours, { mode: 0o600 });
for (const [file, contents] of writes) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), contents);
}
git('add', '--', ...[...writes.keys()].filter(file => !file.endsWith('.web.pdf')));
git('add', '-f', '--', ...[...writes.keys()].filter(file => file.endsWith('.web.pdf')));
assert.equal(git('diff', '--name-only', '--diff-filter=U').trim(), '', 'Remaining conflicts');
git('diff', '--cached', '--check');
console.log(`Conflits resolus, plans sous la maquette et PDF Yassamine relies. Sauvegarde: ${backup}`);
console.log('Aucun service redemarre. Le candidat est pret a etre compile.');
