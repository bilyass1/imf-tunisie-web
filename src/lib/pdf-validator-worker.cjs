const {parentPort,workerData}=require('node:worker_threads');
const {PDFDocument,PDFDict,PDFArray,PDFName}=require(workerData.library);
(async()=>{
  const doc=await PDFDocument.load(workerData.bytes,{ignoreEncryption:false,throwOnInvalidObject:true,updateMetadata:false});
  if(doc.getPageCount()<1 || doc.getPageCount()>500) throw new Error('Nombre de pages non autorisé.');
  const seen=new Set();let count=0;
  const blocked=new Set(['JS','JavaScript','AA','OpenAction','Launch','RichMedia','EmbeddedFiles','EF','XFA','SubmitForm','ImportData','Rendition','Movie','Sound','GoToR']);
  function inspect(object){
    if(!object || seen.has(object))return;seen.add(object);
    if(++count>100000)throw new Error('Document trop complexe.');
    if(object instanceof PDFDict)for(const[key,value]of object.entries()){
      if(blocked.has(key.decodeText()) || (key.decodeText()==='S'&&value instanceof PDFName&&blocked.has(value.decodeText())))throw new Error('Contenu actif non autorisé.');
      inspect(value);
    }
    if(object instanceof PDFArray)for(const value of object.asArray())inspect(value);
  }
  for(const[,object]of doc.context.enumerateIndirectObjects())inspect(object);
  parentPort.postMessage({ok:true});
})().catch(()=>parentPort.postMessage({ok:false}));
