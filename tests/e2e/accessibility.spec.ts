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
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('project filters have names and announce results',async({page})=>{
 await page.goto('/fr/projets');
 await expect(page.getByRole('combobox',{name:/ville/i})).toBeVisible();
 await page.getByRole('searchbox').fill('unmatched project');
 await expect(page.getByRole('status').filter({hasText:/0/}).first()).toBeVisible();
});
