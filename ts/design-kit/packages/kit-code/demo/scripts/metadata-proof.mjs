import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import path from 'node:path'
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright')
const output=process.env.PROOF_OUTPUT;if(!output)throw Error('Set PROOF_OUTPUT')
const baseURL=process.env.PROOF_URL??'http://127.0.0.1:4316/'
await mkdir(output,{recursive:true});const browser=await chromium.launch({headless:true})
try{
 const page=await browser.newPage({viewport:{width:1100,height:1300}});const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>{window.copiedSource=value}},configurable:true}))
 const initial=new URL(baseURL);initial.searchParams.set('view','metadata');await page.goto(initial.href);await page.getByRole('heading',{name:'Commit and agent metadata'}).waitFor()
 const themes=await page.locator('#theme option').evaluateAll(options=>options.map(x=>x.value));const results=[]
 for(const theme of themes)for(const mode of ['light','dark']){
  const url=new URL(initial);url.searchParams.set('theme',theme);url.searchParams.set('mode',mode);await page.goto(url.href)
  await page.getByRole('button',{name:'Read a file'}).waitFor()
  const styles=await page.locator('[data-metadata]').evaluate(el=>{const panel=el.querySelector('[aria-label="Commit details"] [data-slot="collapsible"]'),added=el.querySelector('[aria-label="added"]'),deleted=el.querySelector('[aria-label="deleted"]'),key=el.querySelector('.text-syntax-key');return{foreground:getComputedStyle(panel).color,background:getComputedStyle(panel).backgroundColor,radius:getComputedStyle(panel).borderTopLeftRadius,added:getComputedStyle(added).color,deleted:getComputedStyle(deleted).color,key:getComputedStyle(key).color}})
  assert.notEqual(styles.foreground,styles.background);assert.notEqual(styles.radius,'0px');assert.notEqual(styles.added,styles.deleted)
  assert.equal(await page.locator('[data-metadata] script,[data-metadata] img,button button').count(),0)
  await page.screenshot({path:path.join(output,`${theme}-${mode}.png`),fullPage:true});results.push({theme,mode,styles})
 }
 const commit=page.getByRole('button',{name:'Show commit files'});await commit.focus();await page.keyboard.press('Space');assert.equal(await commit.getAttribute('aria-expanded'),'false');await page.keyboard.press('Enter');assert.equal(await commit.getAttribute('aria-expanded'),'true')
 await page.getByRole('button',{name:'Copy commit hash'}).click();await page.getByText('Copied commit hash',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.copiedSource),'6a9d5b1822ffb10bba4bd97175f01edd7d8651cd');assert.equal(await commit.getAttribute('aria-expanded'),'true')
 const read=page.getByRole('button',{name:'Read a file'}),search=page.getByRole('button',{name:'Search files'});await search.focus();await page.keyboard.press('Enter');assert.equal(await search.getAttribute('aria-expanded'),'true');assert.equal(await read.getAttribute('aria-expanded'),'true')
 assert.equal(await page.getByText('Unknown date',{exact:true}).getAttribute('datetime'),null)
 assert.equal(await page.locator('[data-metadata] code').first().textContent().then(x=>x.includes('<img src=x onerror=alert(1)>')),true)
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await read.locator('svg').evaluate(el=>getComputedStyle(el).transitionProperty),'none')
 assert.deepEqual(errors,[]);await writeFile(path.join(output,'browser.json'),JSON.stringify({results,nativeKeyboard:true,independentTools:true,siblingActions:true,exactHashCopy:true,invalidDate:true,inertSchemaAndInstructions:true,reducedMotion:true,errors},null,2));console.log(`PASS: ${results.length} theme/mode screenshots, native commit/tool keyboard, independent tools, exact copy, inert data, invalid dates`)
}finally{await browser.close()}
