const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function compile(file, requireLocal, globals = {}) {
  const module = {exports: {}};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  }}).outputText;
  vm.runInNewContext(code, {module, exports: module.exports, require: requireLocal,
    AbortController, DOMException, setTimeout, clearTimeout, ...globals});
  return module.exports;
}

(async () => {
  let transfers = 0, stream;
  const runtime = compile('src/components/site/model-runtime.ts', () => ({publicAssetUrl: path => path}), {
    fetch: async () => {
      transfers++;
      return new Response(new ReadableStream({start(controller) {stream = controller;}}), {
        headers: {'content-length': '4'},
      });
    },
  });
  const warm = runtime.warmModelBytes('/models/test.glb');
  const first = new AbortController(), second = new AbortController(), progress = [];
  const leaving = runtime.loadModelBytes('/models/test.glb', {signal: first.signal});
  const viewing = runtime.loadModelBytes('/models/test.glb', {signal: second.signal, onProgress: p => progress.push(p)});
  first.abort();
  await assert.rejects(leaving, {name: 'AbortError'});
  stream.enqueue(new Uint8Array([1, 2, 3, 4])); stream.close();
  const bytes = await viewing; await warm;
  assert.equal(transfers, 1, 'Opening the viewer during warmup must reuse the ongoing transfer');
  assert.deepEqual(Array.from(new Uint8Array(bytes)), [1, 2, 3, 4]);
  assert(progress.includes(95), 'The viewer receives progress from the shared transfer');
  new Uint8Array(bytes)[0] = 99;
  assert.equal(new Uint8Array(await runtime.loadModelBytes('/models/test.glb', {signal: second.signal}))[0], 1);
  await assert.rejects(runtime.loadModelBytes('/models/test.glb', {signal: second.signal, maximumBytes: 2}), /large/);
  assert.equal(transfers, 1, 'A completed warmup must avoid another transfer');

  let retry = 0;
  const failures = compile('src/components/site/model-runtime.ts', () => ({publicAssetUrl: path => path}), {
    fetch: async () => ++retry === 1 ? new Response('', {status: 503}) : new Response(new Uint8Array([5])),
  });
  const failedWarmup = failures.warmModelBytes('/models/retry.glb');
  const retrying = failures.loadModelBytes('/models/retry.glb', {signal: second.signal});
  await assert.rejects(failedWarmup, /unavailable/);
  assert.equal(new Uint8Array(await retrying)[0], 5, 'A speculative failure must allow a foreground retry');

  const downloads = [], decoders = [];
  let gpu = 0;
  const preload = compile('src/components/site/gloire-preload.ts', id => {
    if (id === './model-runtime') return {warmModelBytes: path => {downloads.push(path); return Promise.resolve();}};
    if (id.startsWith('@/')) return {publicAssetUrl: path => path};
    return {WebGLRenderer: function () {gpu++;}};
  }, {fetch: async path => {decoders.push(path); return new Response(new Uint8Array([1]));}});
  await Promise.all([preload.warmGloire(), preload.warmGloire()]);
  assert.deepEqual(downloads, ['/models/la-gloire/la-gloire-web.glb', '/models/la-gloire/floor-plans.json']);
  assert.equal(decoders.length, 2, 'Model and decoder warmup only runs once across navigations');
  assert.equal(gpu, 0, 'Browsing the homepage must not create a WebGL viewer');
  const layout = fs.readFileSync('src/app/[locale]/(site)/layout.tsx', 'utf8');
  assert(layout.includes('<GloireWarmup />'), 'Warmup belongs in the shared public layout, including the homepage');
  console.log('PASS: public-page warmup, one shared transfer, progress, independent cancellation, cache isolation, size limits, foreground retry, and no background WebGL.');
})().catch(error => {console.error(error); process.exitCode = 1;});
