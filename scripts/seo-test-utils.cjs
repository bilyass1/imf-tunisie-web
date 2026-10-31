const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, overrides = {}) {
  const box = {exports:{}};
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  function resolve(name) {
    if (name in overrides) return overrides[name];
    if (name === 'server-only') return {};
    if (name.startsWith('@/') || name.startsWith('.')) {
      const target = name.startsWith('@/') ? `src/${name.slice(2)}` : path.join(path.dirname(file), name);
      if (target.endsWith('.json')) return JSON.parse(fs.readFileSync(target,'utf8'));
      return load(target.endsWith('.ts') ? target : `${target}.ts`, overrides);
    }
    return require(name);
  }
  vm.runInNewContext(js, {module:box,exports:box.exports,require:resolve,URL,Headers,Request,Response,process,console,crypto:require('node:crypto').webcrypto,btoa}, {filename:file});
  return box.exports;
}
module.exports = {load};
