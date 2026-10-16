/** Pull-based, bounded reads; never fetch ahead of the HTTP consumer. */
function chunkStream(read, start, end, signal) {
 let cursor=start,cancelled=false;
 return new ReadableStream({
  async pull(controller){
   if(cancelled||signal?.aborted){controller.error(new Error('Download aborted'));return;}
   const last=Math.min(end,cursor+256*1024-1);
   try{
    const bytes=await read(cursor,last);
    if(cancelled)return;
    if(!bytes||bytes.length!==last-cursor+1)throw new Error('Media changed during download');
    controller.enqueue(new Uint8Array(bytes));cursor=last+1;
    if(cursor>end)controller.close();
   }catch(error){if(!cancelled)controller.error(error);}
  },
  cancel(){cancelled=true;}
 },{highWaterMark:0});
}
module.exports={chunkStream};
