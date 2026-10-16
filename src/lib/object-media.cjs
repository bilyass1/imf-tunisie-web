// Server-only object storage. Buckets MUST be private; keys never reach clients.
const {S3Client,GetObjectCommand,PutObjectCommand,DeleteObjectCommand}=require('@aws-sdk/client-s3');
const {createHash}=require('node:crypto');
let instance;
function client(){
 if(!process.env.MEDIA_S3_BUCKET)throw new Error('MEDIA_S3_BUCKET manquant.');
 if(process.env.MEDIA_S3_ENDPOINT && !process.env.MEDIA_S3_ENDPOINT.startsWith('https://'))throw new Error('Le stockage objet exige HTTPS.');
 return instance??=new S3Client({region:process.env.MEDIA_S3_REGION??'us-east-1',endpoint:process.env.MEDIA_S3_ENDPOINT,forcePathStyle:process.env.MEDIA_S3_PATH_STYLE==='1'});
}
async function put(id,bytes){
 const sha256=createHash('sha256').update(bytes).digest('hex'),key=`private-media/${id}/${sha256}`;
 await client().send(new PutObjectCommand({Bucket:process.env.MEDIA_S3_BUCKET,Key:key,Body:bytes,ContentLength:bytes.length,ContentType:'application/octet-stream',ServerSideEncryption:'AES256',Metadata:{sha256}}),{abortSignal:AbortSignal.timeout(15000)});
 return {key,sha256,size:bytes.length};
}
async function read(key,start,end){
 const response=await client().send(new GetObjectCommand({Bucket:process.env.MEDIA_S3_BUCKET,Key:key,...(start!==undefined?{Range:`bytes=${start}-${end}`}:{})}),{abortSignal:AbortSignal.timeout(15000)});
 return Buffer.from(await response.Body.transformToByteArray());
}
async function remove(key){await client().send(new DeleteObjectCommand({Bucket:process.env.MEDIA_S3_BUCKET,Key:key}));}
async function drain(pool){for(const row of (await pool.query('SELECT object_key FROM imf_media_deletions ORDER BY created_at LIMIT 100')).rows){await remove(row.object_key);await pool.query('DELETE FROM imf_media_deletions WHERE object_key=$1',[row.object_key]);}}
module.exports={put,read,remove,drain};
