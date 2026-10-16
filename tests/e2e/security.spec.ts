import { test,expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { Pool } from 'pg';
async function login(page:Page,email:string,admin=false){
 await page.goto(admin?'/fr/admin-connexion':'/fr/connexion');
 await page.locator('input[name=email]').fill(email);
 await page.locator('input[name=password]').fill(JSON.parse(fs.readFileSync('qa/e2e-fixture.json','utf8')).password);
}
test('real login: passkey admin, client boundaries, media ranges and CSP',async({browser})=>{
 const adminContext=await browser.newContext({extraHTTPHeaders:{'x-real-ip':'192.0.2.10'}}),admin=await adminContext.newPage();
 const cdp=await adminContext.newCDPSession(admin);await cdp.send('WebAuthn.enable');await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});
 await login(admin,'admin@example.test',true);
 await admin.locator('details summary').click();await admin.locator('[name=enrollmentToken]').fill(process.env.ADMIN_PASSKEY_ENROLLMENT_TOKEN!);
 await admin.locator('button[type=submit]').click();await admin.getByRole('button',{name:'Inscrire une clé de sécurité',exact:true}).click();await expect(admin).toHaveURL(/\/fr\/admin$/);
 const ownerContext=await browser.newContext({extraHTTPHeaders:{'x-real-ip':'192.0.2.11'}}),owner=await ownerContext.newPage();
 let loginRequest:{url:string;headers:Record<string,string>;data:Buffer}|undefined;owner.on('request',request=>{if(request.method()==='POST'&&request.headers()['next-action'])loginRequest={url:request.url(),headers:request.headers(),data:request.postDataBuffer()!};});
 await login(owner,'a@example.test');await owner.locator('button[type=submit]').click();await expect(owner).toHaveURL(/espace-client/);
 const peerContext=await browser.newContext({extraHTTPHeaders:{'x-real-ip':'192.0.2.12'}}),peer=await peerContext.newPage();await login(peer,'b@example.test');await peer.locator('button[type=submit]').click();await expect(peer).toHaveURL(/espace-client/);
 expect(loginRequest).toBeDefined();const forged=await ownerContext.request.post(loginRequest!.url,{headers:{...loginRequest!.headers,origin:'https://attacker.example'},data:loginRequest!.data});expect(forged.status()).toBeGreaterThanOrEqual(400);
 expect((await ownerContext.request.post('/api/admin-auth',{headers:{origin:'https://attacker.example'},data:{}})).status()).toBe(403);
 const href='/api/media/'+JSON.parse(fs.readFileSync('qa/e2e-fixture.json','utf8')).id;
 expect((await ownerContext.request.get(href)).status()).toBe(200);
 const part=await ownerContext.request.get(href,{headers:{range:'bytes=0-4'}});expect(part.status()).toBe(206);expect(await part.text()).toBe('%PDF-');expect(part.headers()['cache-control']).toBe('private, no-store');
 expect((await peerContext.request.get(href,{headers:{range:'bytes=0-4'}})).status()).toBe(404);
 const db=new Pool({connectionString:process.env.DATABASE_URL});try{await db.query("UPDATE imf_documents SET archived=true WHERE client_id='e2e-client-a'");expect((await ownerContext.request.get(href,{headers:{range:'bytes=0-4'}})).status()).toBe(404);}finally{await db.end();}
 await peer.goto('/fr/admin');await expect(peer).toHaveURL(/admin-connexion/);await admin.goto('/fr/espace-client');await expect(admin).toHaveURL(/\/fr\/admin$/);
 const response=await owner.goto('/fr/espace-client/paiements'),csp=response!.headers()['content-security-policy'];expect(csp).toContain("'strict-dynamic'");expect(csp).toContain("frame-ancestors 'none'");
 const nonces=await owner.locator('script:not([type="application/ld+json"])').evaluateAll(scripts=>scripts.map(script=>(script as HTMLScriptElement).nonce));expect(nonces.length).toBeGreaterThan(0);expect(nonces.every(nonce=>nonce && csp.includes(`nonce-${nonce}`))).toBeTruthy();
 // Exercise actual browser challenge verification and cookie revocation rather than minting JWTs.
 await admin.goto('/fr/admin/securite');await admin.locator('[name=password]').fill(JSON.parse(fs.readFileSync('qa/e2e-fixture.json','utf8')).password);await Promise.all([admin.waitForResponse(response=>response.request().method()==='POST'&&!!response.request().headers()['next-action']),admin.getByRole('button',{name:'Fermer toutes les sessions administrateur'}).click()]);await admin.goto('/fr/admin');await expect(admin).toHaveURL(/admin-connexion/);
 const changedRole=new Pool({connectionString:process.env.DATABASE_URL});try{await changedRole.query("UPDATE imf_users SET role='admin' WHERE id='e2e-client-b'");await peer.goto('/fr/espace-client');await expect(peer).toHaveURL(/connexion/);}finally{await changedRole.end();}
 await adminContext.close();await ownerContext.close();await peerContext.close();
});
