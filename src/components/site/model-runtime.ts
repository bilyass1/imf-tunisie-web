import { publicAssetUrl } from '@/lib/public-asset-url';

const binaries=new Map<string,ArrayBuffer>();
type ModelOptions = {signal:AbortSignal;onProgress?:(percent:number)=>void;timeoutMs?:number;maximumBytes?:number;priority?:RequestPriority};
type WarmDownload = {promise:Promise<ArrayBuffer>;progress:number;listeners:Set<(percent:number)=>void>};
const warming=new Map<string,WarmDownload>();

/** Share a public background download with the viewer, including an in-flight transfer. */
export function warmModelBytes(path:string,options:{timeoutMs?:number;maximumBytes?:number}={}) {
  const url=publicAssetUrl(path);
  if(binaries.has(url))return Promise.resolve();
  const existing=warming.get(url);if(existing)return existing.promise.then(()=>{});
  const entry:WarmDownload={promise:Promise.resolve(new ArrayBuffer(0)),progress:0,listeners:new Set()};
  entry.promise=downloadModelBytes(path,{...options,signal:new AbortController().signal,priority:'low',onProgress:percent=>{
    entry.progress=percent;entry.listeners.forEach(listener=>listener(percent));
  }});
  warming.set(url,entry);
  const forget=()=>{if(warming.get(url)===entry)warming.delete(url);};
  entry.promise.then(forget,forget);
  return entry.promise.then(()=>{});
}

export async function loadModelBytes(path:string,options:ModelOptions) {
  if(options.signal.aborted)throw new DOMException('Cancelled','AbortError');
  const entry=warming.get(publicAssetUrl(path));
  if(!entry)return downloadModelBytes(path,options);
  const onProgress=options.onProgress;
  if(onProgress){entry.listeners.add(onProgress);onProgress(entry.progress);}
  let abort=()=>{};
  let timer:ReturnType<typeof setTimeout>|undefined;
  try {
    const cancelled=new Promise<never>((_,reject)=>{
      abort=()=>reject(new DOMException('Cancelled','AbortError'));
      options.signal.addEventListener('abort',abort,{once:true});
      timer=setTimeout(()=>reject(new DOMException('Timed out','TimeoutError')),options.timeoutMs??45000);
    });
    let bytes:ArrayBuffer;
    try{bytes=await Promise.race([entry.promise,cancelled]);}
    catch(error){
      if(options.signal.aborted || (error instanceof DOMException && error.name==='TimeoutError'))throw error;
      // A speculative failure must not prevent a normal foreground retry.
      return await downloadModelBytes(path,options);
    }
    if(bytes.byteLength>(options.maximumBytes??64*1024*1024))throw new Error('Model too large');
    return bytes.slice(0);
  } finally {
    clearTimeout(timer);options.signal.removeEventListener('abort',abort);
    if(onProgress)entry.listeners.delete(onProgress);
  }
}

async function downloadModelBytes(path:string,options:ModelOptions) {
  if(options.signal.aborted)throw new DOMException('Cancelled','AbortError');
  const url=publicAssetUrl(path),cached=binaries.get(url);if(cached){if(cached.byteLength>(options.maximumBytes??64*1024*1024))throw new Error('Model too large');return cached.slice(0);}
  const controller=new AbortController(),abort=()=>controller.abort();options.signal.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>controller.abort(),options.timeoutMs??45000);
  try {
    const response=await fetch(url,{signal:controller.signal,cache:'force-cache',priority:options.priority??'auto'});
    if(!response.ok)throw new Error('Model unavailable');
    const maximum=options.maximumBytes??64*1024*1024,total=Number(response.headers.get('content-length')??0);
    if(total>maximum)throw new Error('Model too large');
    const reader=response.body?.getReader();if(!reader)throw new Error('Streaming unavailable');
    const chunks:Uint8Array[]=[];let length=0;
    while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>maximum){await reader.cancel();throw new Error('Model too large');}chunks.push(value);if(total)options.onProgress?.(Math.min(95,Math.round(length/total*95)));}
    const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    if(!length)throw new Error('Empty model');if(binaries.size>=2)binaries.delete(binaries.keys().next().value!);binaries.set(url,bytes.buffer);return bytes.buffer.slice(0);
  } finally {controller.abort();clearTimeout(timer);options.signal.removeEventListener('abort',abort);}
}
export function modelPixelRatio(width:number,height:number) {
  const lowPower=(navigator.hardwareConcurrency??4)<=4 || window.matchMedia('(pointer: coarse)').matches;
  return Math.min(window.devicePixelRatio||1,lowPower?1.25:1.5,Math.sqrt(1400000/Math.max(1,width*height)));
}
