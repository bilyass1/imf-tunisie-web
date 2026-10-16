// Gate the standalone SAST artifact while GitHub's existing default setup owns alerts.
const fs=require('node:fs'),path=require('node:path');
const folder=process.argv[2]??'sarif';
const files=fs.readdirSync(folder).filter(file=>file.endsWith('.sarif'));if(!files.length)throw new Error('Rapport SARIF manquant');
let high=0,total=0;
for(const file of files)for(const run of JSON.parse(fs.readFileSync(path.join(folder,file),'utf8')).runs??[]){
 const rules=new Map((run.tool?.driver?.rules??[]).map(rule=>[rule.id,rule]));
 for(const result of run.results??[]){total++;const rule=rules.get(result.ruleId);if(result.level==='error'||Number(rule?.properties?.['security-severity']??0)>=7){high++;console.error('SAST finding:',result.ruleId,result.locations?.[0]?.physicalLocation?.artifactLocation?.uri??'unknown');}}
}
console.log(`SARIF: ${total} résultat(s), ${high} niveau élevé/erreur. Consulter le rapport et les alertes CodeQL du dépôt.`);if(high)process.exitCode=1;
