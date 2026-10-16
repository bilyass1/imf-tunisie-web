import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const paths=['/fr','/en','/ar','/fr/projets','/en/projets','/ar/projets','/fr/recherche','/en/recherche','/ar/recherche','/fr/contact','/en/contact','/ar/contact','/fr/connexion','/fr/projets/residence-la-gloire'];
for(const path of paths)test(`WCAG AA ${path}`,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(path);
 await expect(page.locator('main').first()).toBeVisible();
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
 expect(result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))}))).toEqual([]);
});
test('native language selector preserves URL and supports keyboard',async({page})=>{
 await page.goto('/fr/recherche?status=reserved#main-content');
 const language=page.getByRole('combobox',{name:'Langue du site'});
 await language.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
 await expect(page).toHaveURL(/\/en\/recherche\?status=reserved#main-content$/);
 await expect(page.locator('html')).toHaveAttribute('lang',/^en/);
 await page.getByRole('combobox',{name:'Site language'}).selectOption('ar');
 await expect(page.locator('html')).toHaveAttribute('dir','rtl');
});
test('mobile modal traps focus and restores it, no horizontal overflow at 320px',async({page})=>{
 await page.setViewportSize({width:320,height:800});await page.goto('/fr');
 const opener=page.getByRole('button',{name:'Menu',exact:true});await opener.click();
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 for(let i=0;i<20;i++){await page.keyboard.press('Tab');expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);}
 for(let i=0;i<20;i++){await page.keyboard.press('Shift+Tab');expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);}
 await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(opener).toBeFocused();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1?[]:Array.from(document.querySelectorAll('body *')).filter(el=>{const rect=el.getBoundingClientRect();return rect.width>0&&rect.right>window.innerWidth+1&&getComputedStyle(el).position!=='fixed';}).map(el=>({tag:el.tagName,classes:el.className})).slice(0,12));
 expect(overflow).toEqual([]);
});
test('project filters have names and announce results',async({page})=>{
 await page.goto('/fr/projets');
 await expect(page.getByRole('combobox',{name:/ville/i})).toBeVisible();
 await page.getByRole('searchbox').fill('unmatched project');
 await expect(page.getByRole('status').filter({hasText:/0/}).first()).toBeVisible();
});

test('apartment information remains available without WebGL',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(()=>{
  const original=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,...args:Parameters<typeof original>){if(String(args[0]).startsWith('webgl'))return null;return original.apply(this,args); } as typeof original;
 });
 await page.goto('/fr/projets/residence-la-gloire');
 const section=page.locator('#maquette');
 await section.getByRole('button',{name:'Ouvrir la vue interactive',exact:true}).click();
 const apartments=section.getByRole('combobox',{name:'Appartement',exact:true});
 await expect(apartments).toBeVisible();
 const options=await apartments.locator('option').allTextContents();
 expect(options.length).toBeGreaterThan(0);expect(options[0]).toContain('m²');
 await apartments.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
 await expect(section.getByRole('link',{name:/Voir la fiche appartement/})).toHaveAttribute('href',/appartements\//);
});

test('contact errors preserve values and success receives focus',async({page})=>{
 await page.setExtraHTTPHeaders({'x-real-ip':'192.0.2.90'});
 await page.goto('/fr/contact');
 const name=page.locator('#cf-name'),phone=page.locator('#cf-phone'),message=page.locator('#cf-message');
 await name.fill('Quality fixture');await phone.fill('1'.repeat(81));await message.fill('Synthetic accessibility test');
 const submit=page.locator('form').filter({has:name}).locator('button[type=submit]');
 await submit.click();await expect(page.getByRole('alert')).toBeVisible();
 await expect(name).toHaveValue('Quality fixture');await expect(message).toHaveValue('Synthetic accessibility test');
 await phone.fill('22123456');await submit.click();
 const success=page.locator('[role=status][tabindex="-1"]');await expect(success).toBeVisible();await expect(success).toBeFocused();
});

test('server property search updates its bounded result set',async({page})=>{
 await page.goto('/fr/recherche');
 const search=page.getByRole('searchbox',{name:'Ville, résidence ou référence'});
 await search.fill("no-match ' OR 1=1 --");
 await expect(page.getByRole('status').filter({hasText:'0 appartements'})).toBeVisible();
 await expect(page.getByRole('link',{name:/Voir cet appartement/})).toHaveCount(0);
 await expect(search).toHaveValue("no-match ' OR 1=1 --");
});

test('search results render before JavaScript hydration',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});
 try{const page=await context.newPage();await page.goto('/fr/recherche');await expect(page.getByText('Comparez les appartements à Tunis et Sfax selon votre budget, votre surface et vos envies.',{exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Voir cet appartement →'})).toHaveCount(24);}finally{await context.close();}
});
