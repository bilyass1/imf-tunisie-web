const {spawn}=require('node:child_process'),{randomBytes}=require('node:crypto');
(async()=>{
 process.env.AUTH_SECRET=randomBytes(48).toString('base64url');process.env.APP_ORIGIN='http://localhost:3100';process.env.TRUSTED_CLIENT_IP_HEADER='x-real-ip';
 await require('../tests/e2e/fixture.cjs')();
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','localhost','--port','3100'],{stdio:'inherit',env:process.env});
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.kill(signal));
 server.on('exit',code=>{process.exitCode=code??1;});
})().catch(error=>{console.error(error);process.exitCode=1;});
