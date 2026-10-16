const {execFileSync}=require('node:child_process');
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const forbidden=files.filter(file=>file.startsWith('source-assets/')||/\.(?:pdf|dwg|dxf|skp|rvt|ifc|blend)$/i.test(file));
if(forbidden.length){console.error('Masters techniques interdits dans Git. Archiver et vérifier les checksums dans le stockage privé.');console.error(forbidden.join('\n'));process.exitCode=1;}else console.log('PASS: aucun master technique PDF/CAD suivi dans la révision courante.');
