import { defineConfig } from '@playwright/test';
import { randomBytes } from 'node:crypto';
process.env.ADMIN_PASSKEY_ENROLLMENT_TOKEN??=randomBytes(32).toString('base64url');
export default defineConfig({
 testDir:'./tests/e2e',fullyParallel:false,workers:1,timeout:60000,
 use:{baseURL:'http://localhost:3100',trace:'retain-on-failure'},
 webServer:{command:'node tests/e2e/fixture.cjs && npm start -- --hostname localhost --port 3100',url:'http://localhost:3100/fr',reuseExistingServer:false,timeout:120000,env:{NEXT_PUBLIC_WEB_VITALS_ENABLED:'1',APP_ORIGIN:'http://localhost:3100',ADMIN_PASSKEY_ENROLLMENT_TOKEN:process.env.ADMIN_PASSKEY_ENROLLMENT_TOKEN,TRUSTED_CLIENT_IP_HEADER:'x-real-ip',AUTH_SECRET:randomBytes(48).toString('base64url')}},
});
