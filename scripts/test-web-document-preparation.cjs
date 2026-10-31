const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');

(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'imf-pdf-preparation-'));
  try {
    const sources = ['/documents/archive-only/full.pdf', '/documents/presentation/plan.pdf'];
    await fs.mkdir(path.join(root, 'src/lib'), { recursive: true });
    await fs.writeFile(path.join(root, 'src/lib/public-document-sources.json'), JSON.stringify(sources));
    for (const [index, source] of sources.entries()) {
      const pdf = await PDFDocument.create();
      pdf.addPage([200, 200]);
      if (index === 0) pdf.addPage([200, 200]);
      const filename = path.join(root, 'source-assets', source);
      await fs.mkdir(path.dirname(filename), { recursive: true });
      await fs.writeFile(filename, await pdf.save());
    }
    const image = path.join(root, 'public/documents/presentation/plan.webp');
    await fs.mkdir(path.dirname(image), { recursive: true });
    await sharp({ create: { width: 20, height: 20, channels: 3, background: '#abcdef' } })
      .webp().toFile(image);
    const prepare = () => execFileSync(process.execPath, [path.join(__dirname, 'prepare-web-documents.mjs')],
      { cwd: root, stdio: 'pipe' });
    prepare();
    const outputs = [];
    for (const [index, source] of sources.entries()) {
      const url = source.replace(/\.pdf$/, '.web.pdf');
      const output = await fs.readFile(path.join(root, 'public', url));
      outputs.push(output);
      assert.equal((await PDFDocument.load(output)).getPageCount(), index === 0 ? 2 : 1);
      if (index === 0) {
        assert.deepEqual(output, await fs.readFile(path.join(root, 'source-assets', source)));
      }
    }
    const manifest = JSON.parse(await fs.readFile(path.join(root, 'src/lib/public-documents.json')));
    assert.deepEqual(manifest.approved, sources.map(source => source.replace(/\.pdf$/, '.web.pdf')).sort());
    prepare();
    for (const [index, source] of sources.entries()) {
      assert.deepEqual(await fs.readFile(path.join(root, 'public', source.replace(/\.pdf$/, '.web.pdf'))), outputs[index]);
    }
    console.log('PASS: archived PDFs rebuild missing output directories, preserve all pages, and survive a repeat build.');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
