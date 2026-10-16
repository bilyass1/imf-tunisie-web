import 'server-only';
export async function boundedJson(request:Request,limit=65536):Promise<unknown>{
 if(Number(request.headers.get('content-length')??0)>limit)throw new Error('Payload too large');
 if(!request.body)throw new Error('Missing body');
 const reader=request.body.getReader(),chunks:Uint8Array[]=[];let length=0;
 try{
  for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw new Error('Payload too large');}chunks.push(value);}
 }finally{reader.releaseLock();}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
