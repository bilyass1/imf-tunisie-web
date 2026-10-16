// Explicit staging/local target only. Never discovers or logs customer credentials.
import http from 'k6/http';
import {check,sleep,fail} from 'k6';
const match=/^(https?):\/\/([a-zA-Z0-9.-]+)(:\d+)?\/?$/.exec(__ENV.TARGET_URL||'http://localhost:3100');
if(!match)throw new Error('A bare staging/local origin is required');
const target={protocol:match[1]+':',hostname:match[2],origin:match[0].replace(/\/$/,''),username:'',password:''};
if(!['http:','https:'].includes(target.protocol)||target.username||target.password)throw new Error('Invalid target URL');
const allowed=target.hostname==='localhost'||target.hostname==='127.0.0.1'||(__ENV.STAGING_ALLOWED_HOST&&target.hostname===__ENV.STAGING_ALLOWED_HOST&&__ENV.CONFIRM_STAGING==='yes');
if(!allowed)throw new Error('Only localhost or an explicitly confirmed staging host is allowed');
const profile=__ENV.PROFILE||'smoke';
const levels={smoke:[5,10],pilot:[20,100],full:[100,500,1000]};
if(!levels[profile])throw new Error('Unknown profile');
export const options={stages:[...levels[profile].map(target=>({duration:profile==='full'?'10m':'2m',target})),{duration:'1m',target:0}],thresholds:{http_req_failed:['rate<0.005'],http_req_duration:['p(95)<800'],'http_req_duration{kind:signal}':['p(95)<300']}};
const routes=['/fr','/en','/ar','/fr/projets','/fr/recherche?status=available','/fr/contact','/api/public-revision'];
export default function(){
 const route=routes[Math.floor(Math.random()*routes.length)];
 const response=http.get(target.origin+route,{tags:{kind:route.startsWith('/api')?'signal':'public'}});
 check(response,{'200/304':r=>r.status===200||r.status===304});
 // Use only short-lived synthetic staging sessions provisioned by the operator.
 if(__ENV.CLIENT_TEST_COOKIE&&Math.random()<0.1){
  if(!__ENV.STAGING_ALLOWED_HOST&&target.hostname!=='localhost')fail('Private scenario needs staging');
  const privateResponse=http.get(target.origin+'/api/client-revision',{headers:{Cookie:__ENV.CLIENT_TEST_COOKIE},tags:{kind:'private'}});
  check(privateResponse,{'client remains authenticated':r=>r.status===200,'private response never cached publicly':r=>String(r.headers['Cache-Control']).includes('no-store')});
 }
 sleep(1+Math.random()*3);
}
