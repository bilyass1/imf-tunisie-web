// Run daily as a scheduled operator job. No customers, documents or credentials affected.
const {pool}=require('./postgres-common.cjs');
(async()=>{const db=pool();try{let removed;do{removed=await db.query("DELETE FROM imf_web_vitals WHERE ctid IN (SELECT ctid FROM imf_web_vitals WHERE recorded_at<now()-interval '28 days' LIMIT 10000)");}while(removed.rowCount===10000);console.log('Expired anonymous metrics removed.');}finally{await db.end();}})().catch(error=>{console.error(error.message);process.exitCode=1;});
