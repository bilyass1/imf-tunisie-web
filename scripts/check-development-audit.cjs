const fs=require('node:fs'),{spawnSync}=require('node:child_process');
// No patched releases currently exist for these build-tool advisories.
// Exact, reviewed exceptions are documented in docs/QUALITY-2026-10-16.md.
const known=new Map([
 ['https://github.com/advisories/GHSA-vfj7-8cjw-p6xm','braces'],
 ['https://github.com/advisories/GHSA-jmr9-qjv8-65gv','extract-zip'],
 ['https://github.com/advisories/GHSA-7pqw-9j4j-h8q3','extract-zip'],
]);
function evaluate(report){
 if(report.error||!report.metadata?.vulnerabilities||!report.vulnerabilities)throw new Error('Dependency audit unavailable or malformed.');
 const found=new Set();
 function causes(name,seen=new Set()){
  if(seen.has(name))return [];seen.add(name);
  const node=report.vulnerabilities[name];if(!node||!Array.isArray(node.via))throw new Error('Incomplete advisory dependency graph.');
  return node.via.flatMap(value=>typeof value==='string'?causes(value,seen):[value]);
 }
 for(const [name,node] of Object.entries(report.vulnerabilities)){
  if(node.severity==='critical')throw new Error('Critical dependency advisory requires remediation: '+name);
  if(node.severity!=='high')continue;
  const advisories=causes(name).filter(a=>['high','critical'].includes(a.severity));
  if(!advisories.length)throw new Error('Missing high-severity advisory details: '+name);
  for(const advisory of advisories){
   if(advisory.severity==='critical'||known.get(advisory.url)!==advisory.name)throw new Error('New dependency advisory requires remediation: '+name+' '+advisory.url);
   found.add(advisory.url);
  }
 }
 return {counts:report.metadata.vulnerabilities,knownUnpatchedBuildAdvisories:[...found].sort()};
}
function main(){
 const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['audit','--json'],{encoding:'utf8',maxBuffer:10*1024*1024});
 if(result.error||![0,1].includes(result.status))throw new Error('Dependency audit command failed.');
 const report=JSON.parse(result.stdout);
 if(report.error||!report.metadata?.vulnerabilities||!report.vulnerabilities)throw new Error('Dependency audit unavailable or malformed.');
 fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/development-audit.json',JSON.stringify(report,null,2));
 const summary=evaluate(report);
 console.log(JSON.stringify(summary));
 if(summary.knownUnpatchedBuildAdvisories.length)console.warn('Known unpatched build-tool advisories remain; this is not a clean full npm audit. Production audit is gated separately.');
}
module.exports={evaluate};
if(require.main===module){try{main();}catch(error){console.error(error.message);process.exitCode=1;}}
