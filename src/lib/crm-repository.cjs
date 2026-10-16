// Authenticated server callers only. Queries never touch accounts/media/messages.
const stages=['new','contacted','visit','offer','reserved','sold','lost'];
const openStages=stages.slice(0,5);
const emptyStats=()=>({openDeals:0,openValue:0,weightedValue:0,wonThisYear:0,wonValue:0,lost:0,conversion:0,byStage:Object.fromEntries(stages.map(s=>[s,{count:0,value:0}]))});
function pageOptions(input={}){
 const limit=Number(input.limit??30);
 if(!Number.isSafeInteger(limit)||limit<1||limit>100)throw new Error('Invalid page size');
 const after=String(input.after??'');if(after.length>200)throw new Error('Invalid cursor');
 const query=String(input.query??'').trim();if(query.length>150)throw new Error('Invalid search');
 const stage=input.stage??'';if(stage&&!stages.includes(stage))throw new Error('Invalid stage');
 return {limit,after,query,stage};
}
async function stats(pool){
 const result=await pool.query(`SELECT data->>'stage' AS stage,count(*)::int AS count,
  COALESCE(sum((data->>'value')::numeric),0)::float8 AS value,
  COALESCE(sum((data->>'value')::numeric*(data->>'probability')::numeric/100),0)::float8 AS weighted
  FROM imf_records WHERE collection='deals' GROUP BY data->>'stage'`);
 const out=emptyStats();
 for(const row of result.rows){if(!stages.includes(row.stage))continue;out.byStage[row.stage]={count:row.count,value:row.value};if(openStages.includes(row.stage)){out.openDeals+=row.count;out.openValue+=row.value;out.weightedValue+=row.weighted;}}
 out.weightedValue=Math.round(out.weightedValue);out.wonThisYear=out.byStage.sold.count;out.wonValue=out.byStage.sold.value;out.lost=out.byStage.lost.count;
 out.conversion=out.wonThisYear+out.lost?Math.round(out.wonThisYear/(out.wonThisYear+out.lost)*100):0;
 return out;
}
async function list(pool,collection,input){
 if(!['contacts','deals','tasks','activities'].includes(collection))throw new Error('Invalid collection');
 const {limit,after,query,stage}=pageOptions(input);
 const rows=(await pool.query(`SELECT r.data,
  c.data->>'name' AS contact_name,c.data->>'phone' AS contact_phone,
  CASE WHEN $1='contacts' THEN (SELECT count(*)::int FROM imf_records d WHERE d.collection='deals' AND d.data->>'contactId'=r.id) END AS deal_count,
  CASE WHEN $1='contacts' THEN (SELECT COALESCE(sum((d.data->>'value')::numeric),0)::float8 FROM imf_records d WHERE d.collection='deals' AND d.data->>'contactId'=r.id) END AS deal_value
  FROM imf_records r LEFT JOIN imf_records c ON c.collection='contacts' AND c.id=r.data->>'contactId'
  WHERE r.collection=$1 AND ($2='' OR r.id>$2) AND ($3='' OR position(lower($3) in lower(concat_ws(' ',r.data->>'name',r.data->>'phone',r.data->>'email',r.data->>'title',r.data->>'city')))>0)
  AND ($4='' OR r.data->>'stage'=$4) ORDER BY r.id LIMIT $5`,[collection,after,query,stage,limit+1])).rows;
 const items=rows.slice(0,limit).map(row=>({...row.data,contactName:row.contact_name??undefined,contactPhone:row.contact_phone??undefined,...(collection==='contacts'?{dealCount:row.deal_count,dealValue:row.deal_value}:{})}));
 return {items,next:rows.length>limit?items.at(-1).id:undefined};
}
async function dashboard(pool){
 // One statement for all counters; two bounded row lists. Independent reads overlap.
 const [pipeline,summary,recent,due]=await Promise.all([
  stats(pool),
  pool.query(`SELECT
   (SELECT count(*)::int FROM imf_records WHERE collection='contacts') AS contacts,
   EXISTS(SELECT 1 FROM imf_records WHERE collection IN ('contacts','deals') AND data->>'demo'='true') AS demo,
   (SELECT count(*)::int FROM imf_lots WHERE status='available') AS available`),
  pool.query(`SELECT a.data,c.data->>'name' AS contact_name FROM imf_records a LEFT JOIN imf_records c ON c.collection='contacts' AND c.id=a.data->>'contactId' WHERE a.collection='activities' ORDER BY a.data->>'date' DESC,a.id DESC LIMIT 8`),
  pool.query(`SELECT t.data,c.data->>'name' AS contact_name FROM imf_records t LEFT JOIN imf_records c ON c.collection='contacts' AND c.id=t.data->>'contactId' WHERE t.collection='tasks' AND t.data->>'done'='false' AND t.data->>'dueDate'<=$1 ORDER BY t.data->>'dueDate',t.id LIMIT 6`,[new Date().toISOString().slice(0,10)])
 ]);
 return {stats:pipeline,contactCount:summary.rows[0].contacts,hasDemo:summary.rows[0].demo,available:summary.rows[0].available,activities:recent.rows.map(r=>({...r.data,contactName:r.contact_name})),tasks:due.rows.map(r=>({...r.data,contactName:r.contact_name}))};
}
module.exports={list,stats,dashboard,pageOptions};
