import fs from 'node:fs'
import assert from 'node:assert/strict'
const { chromium, expect } = await import(process.env.PLAYWRIGHT_MODULE ?? '@playwright/test')
const output = process.env.PROOF_OUTPUT
if (!output) throw Error('Set PROOF_OUTPUT to your own proof directory')
fs.mkdirSync(output, { recursive: true })
;(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
 const results=[];
 try {for(const [width,height] of [[1440,900],[390,844],[1440,420],[390,420]]) {
  const ctx=await browser.newContext({viewport:{width,height}}), page=await ctx.newPage();
  await page.goto(process.env.PROOF_URL ?? 'http://127.0.0.1:18821/inspection.html');
  const opener=page.getByRole('button',{name:'Inspect content',exact:true});
  for(const mode of ['long','short','empty','edit']) {
   await page.getByLabel('Content',{exact:true}).selectOption(mode);await opener.click();
   const dialog=page.getByRole('dialog',{name:'Content inspection',exact:true}), body=dialog.getByRole('region',{name:'Content scroll'});
   await expect(dialog).toBeVisible();
   await expect(mode==='edit'?page.getByLabel('Local text'):dialog.getByRole('heading')).toBeFocused();
   const box=await dialog.boundingBox();assert(box.y>=0&&box.y+box.height<=height);assert(box.x>=0&&box.x+box.width<=width);
   const geometry=await dialog.evaluate(n=>({popup:n.scrollHeight>n.clientHeight,viewport:n.closest('[data-slot="dialog-viewport"]').scrollHeight>n.closest('[data-slot="dialog-viewport"]').clientHeight,body:n.querySelector('[data-slot="inspection-body"]').clientHeight}));
   assert(!geometry.popup&&!geometry.viewport);assert(geometry.body>0);
   if(mode==='long') {await body.focus();await page.keyboard.press('PageDown');await expect.poll(()=>body.evaluate(n=>n.scrollTop)).toBeGreaterThan(0);await body.evaluate(n=>n.scrollTop=n.scrollHeight);await expect(dialog.getByText('Paragraph 80:',{exact:false})).toBeVisible();}
   if(mode==='short'||mode==='empty')assert.equal(await body.evaluate(n=>n.scrollHeight>n.clientHeight),false);
   if(mode==='edit'){await page.getByLabel('Local text').pressSequentially('local draft');await expect(page.getByLabel('Local text')).toHaveValue('local draft');await expect(dialog.getByRole('status')).toContainText('Key');}
   await body.dispatchEvent('compositionstart',{data:'x'});await expect(dialog.getByRole('status')).toHaveText('Composition started');await body.dispatchEvent('compositionend',{data:'x'});await expect(dialog.getByRole('status')).toHaveText('Composition ended');
   await dialog.getByRole('button',{name:'Open child overlay'}).click();const child=page.getByRole('dialog',{name:'Child overlay',exact:true});await expect(child).toBeVisible();await page.keyboard.press('Escape');await expect(child).toHaveCount(0);await expect(dialog).toBeVisible();
   for(let i=0;i<8;i++){await page.keyboard.press(i<4?'Tab':'Shift+Tab');await expect.poll(()=>dialog.evaluate(n=>n.contains(document.activeElement))).toBe(true);}
   await page.screenshot({path:`${output}/arbitrary-${width}x${height}-${mode}.png`});
   await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
   results.push({width,height,mode,box,geometry,focus:true,nestedEscape:true,composition:'synthetic'});
  }
  await ctx.close();console.log('PASS arbitrary',width,height);
 }fs.writeFileSync(`${output}/arbitrary.json`,JSON.stringify(results,null,2));}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
