// Run the real wrapper during SSR: automatic startup must not need a click,
// an IntersectionObserver callback or browser globals to mount its children.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const box = {exports: {}};
const source = fs.readFileSync('src/components/site/LazyMount.tsx', 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions: {
  jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
}}).outputText;
vm.runInNewContext(compiled, {module: box, exports: box.exports, require});
const LazyMount = box.exports.default;
for (const label of ['Chargement de la maquette 3D…', 'Loading the 3D model…', 'تحميل المجسم…']) {
  let mounted = 0;
  function Viewer() { mounted++; return React.createElement('canvas', {'data-real-viewer': true}); }
  const child = React.createElement(Viewer);
  const automatic = renderToStaticMarkup(React.createElement(LazyMount, {eager: true, loadingLabel: label}, child));
  assert.equal(mounted, 1);
  assert(automatic.includes('data-viewer-mounted="true"'));
  assert(automatic.includes('data-real-viewer="true"'));
  assert(!automatic.includes('<button'), 'Automatic startup must not show an activation button');
  mounted = 0;
  const deferred = renderToStaticMarkup(React.createElement(LazyMount, {loadingLabel: label}, child));
  assert.equal(mounted, 0, 'Other viewers keep their deferred initialization');
  assert(deferred.includes('data-viewer-mounted="false"'));
  assert(deferred.includes('<button'));
}

// Execute the actual server-page preload block with public-only fixtures.
const pageText = fs.readFileSync('src/app/[locale]/(site)/projets/[slug]/page.tsx', 'utf8');
const page = ts.createSourceFile('page.tsx', pageText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = page.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'ProjectPage');
const preloadBlock = component.body.statements.find(node => ts.isIfStatement(node) && node.getText(page).includes('preload('));
assert(preloadBlock, 'The page must start downloads before viewer hydration');
let activation;
function inspect(node) {
  if (ts.isJsxAttribute(node) && node.name.text === 'eager') activation = node.initializer.expression.getText(page);
  ts.forEachChild(node, inspect);
}
inspect(page);
assert(activation, 'The project page must enable automatic mounting');
const script = ts.transpileModule(preloadBlock.getText(page), {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText;
for (const project of [
  {slug: 'residence-la-gloire', massing: {}, lots: [{}]},
  {slug: 'diar-al-yassamine', massing: {}, lots: [{}]},
  {slug: 'residence-zephyr', massing: {}, lots: [{}]},
  {slug: 'residence-la-gloire', lots: [{}]},
  {slug: 'residence-la-gloire', massing: {}, lots: []},
]) {
  const calls = [];
  vm.runInNewContext(script, {project, publicAssetUrl: path => 'https://assets.example.test' + path,
    preload: (url, options) => calls.push({url, ...options})});
  const active = project.slug === 'residence-la-gloire' && project.massing && project.lots.length;
  assert.equal(vm.runInNewContext(activation, {project}), project.slug === 'residence-la-gloire');
  assert.equal(calls.length, active ? 4 : 0);
  if (active) {
    assert(calls.every(call => call.as === 'fetch' && call.crossOrigin === 'anonymous'));
    assert.equal(calls.find(call => call.url.endsWith('.glb')).fetchPriority, 'high');
    assert(calls.some(call => call.url.endsWith('draco_decoder.wasm')));
  }
}
console.log('PASS: La Gloire mounts without click/viewport in FR/EN/AR, preloads its model and decoder, and other projects remain deferred.');
