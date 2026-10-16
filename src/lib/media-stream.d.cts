export function chunkStream(read:(start:number,end:number)=>Promise<Buffer|undefined>,start:number,end:number,signal?:AbortSignal):ReadableStream<Uint8Array>;
