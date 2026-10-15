import { publicAssetUrl } from '@/lib/public-asset-url';

const binaries=new Map<string,ArrayBuffer>();
export async function loadModelBytes(path:string,options:{signal:AbortSignal;onProgress?:(percent:number)=>void;timeoutMs?:number;maximumBytes?:number}) {
  if(options.signal.aborted)throw new DOMException('Cancelled','AbortError');
  const url=publicAssetUrl(path),cached=binaries.get(url);if(cached)return cached.slice(0);
  const controller=new AbortController(),abort=()=>controller.abort();options.signal.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>controller.abort(),options.timeoutMs??45000);
  try {
    const response=await fetch(url,{signal:controller.signal,cache:'force-cache'});
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
