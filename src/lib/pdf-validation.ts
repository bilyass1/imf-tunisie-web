import 'server-only';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import net from 'node:net';
import tls from 'node:tls';

async function scan(bytes:Buffer) {
  const host=process.env.CLAMAV_HOST;
  if(!host) {
    if(process.env.NODE_ENV==='production' || process.env.REQUIRE_PDF_MALWARE_SCAN==='1') throw new Error('Analyse antivirus indisponible. Configurez CLAMAV_HOST pour publier de nouveaux contrats.');
    return;
  }
  await new Promise<void>((resolve,reject)=>{
    const options={host,port:Number(process.env.CLAMAV_PORT??3310)};
    const socket=process.env.CLAMAV_TLS==='1'?tls.connect(options):net.connect(options);
    let result='';const finish=(error?:Error)=>{socket.destroy();error?reject(error):resolve();};
    socket.setTimeout(15000,()=>finish(new Error('Délai antivirus dépassé.')));
    socket.once('error',()=>finish(new Error('Analyse antivirus indisponible.')));
    socket.once(process.env.CLAMAV_TLS==='1'?'secureConnect':'connect',()=>{
      socket.write('zINSTREAM\0');
      for(let offset=0;offset<bytes.length;offset+=65536){const chunk=bytes.subarray(offset,offset+65536),size=Buffer.alloc(4);size.writeUInt32BE(chunk.length);socket.write(size);socket.write(chunk);}
      socket.write(Buffer.alloc(4));
    });
    socket.on('data',chunk=>{result+=chunk.toString();if(result.length>4096)finish(new Error('Réponse antivirus invalide.'));if(result.includes('\0')||result.includes('\n'))finish(/^stream: OK[\0\r\n]/.test(result)?undefined:new Error('Fichier refusé par l’antivirus.'));});
    socket.once('end',()=>{if(!/^stream: OK/.test(result))finish(new Error('Analyse antivirus incomplète.'));});
  });
}
export async function validateContractPdf(bytes:Buffer) {
  if(bytes.length>3*1024*1024 || !/^%PDF-(?:1\.[0-7]|2\.0)/.test(bytes.subarray(0,10).toString()) || !bytes.subarray(-1024).includes(Buffer.from('%%EOF'))) throw new Error('PDF invalide ou incomplet.');
  await new Promise<void>((resolve,reject)=>{
    const worker=new Worker(path.join(process.cwd(),'src/lib/pdf-validator-worker.cjs'),{workerData:{bytes:new Uint8Array(bytes),library:path.join(process.cwd(),'node_modules/pdf-lib/cjs/index.js')},resourceLimits:{maxOldGenerationSizeMb:96,maxYoungGenerationSizeMb:16,stackSizeMb:4}});
    const timeout=setTimeout(()=>{void worker.terminate();reject(new Error('PDF trop complexe ou délai de validation dépassé.'));},10000);
    let done=false;const finish=(error?:Error)=>{if(done)return;done=true;clearTimeout(timeout);void worker.terminate();error?reject(error):resolve();};
    worker.once('message',result=>finish(result?.ok?undefined:new Error('PDF refusé : structure invalide, contenu actif ou document chiffré.')));
    worker.once('error',()=>finish(new Error('Validation PDF impossible.')));
    worker.once('exit',()=>{if(!done)finish(new Error('Validation PDF interrompue.'));});
  });
  await scan(bytes);
}
