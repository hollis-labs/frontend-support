import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import path from 'node:path'
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright')
const output=process.env.PROOF_OUTPUT
if(!output)throw Error('Set PROOF_OUTPUT to a scratch output directory')
const baseURL=process.env.PROOF_URL??'http://127.0.0.1:4316/'
await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true})
try{
 const page=await browser.newPage({viewport:{width:1100,height:1000}})
 await page.addInitScript(()=>{window.copiedSource=null;Object.defineProperty(navigator,'clipboard',{value:{writeText:async code=>{window.copiedSource=code}},configurable:true})})
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(baseURL)
 await page.getByText('Highlighting ready',{exact:true}).waitFor()
 const themes=await page.locator('#theme option').evaluateAll(options=>options.map(x=>x.value))
 const results=[]
 for(const theme of themes)for(const mode of ['light','dark']){
  const url=new URL(baseURL);url.searchParams.set('theme',theme);url.searchParams.set('mode',mode);await page.goto(url.href)
  await page.getByText('Highlighting ready',{exact:true}).waitFor()
  const styles=await page.locator('pre').first().evaluate(el=>({foreground:getComputedStyle(el).color,background:getComputedStyle(el.closest('[data-language]')).backgroundColor,radius:getComputedStyle(el.closest('[data-language]')).borderTopLeftRadius}))
  assert.notEqual(styles.foreground,styles.background);assert.notEqual(styles.radius,'0px')
  const colors=await page.locator('pre code span[style]').evaluateAll(items=>items.map(x=>x.style.color))
  assert.ok(colors.length>0);assert.ok(colors.every(c=>c.startsWith('var(--color-')))
  await page.screenshot({path:path.join(output,`${theme}-${mode}.png`),fullPage:true})
  results.push({theme,mode,styles,tokenColors:[...new Set(colors)]})
 }
 await page.getByRole('button',{name:'Copy snippet'}).click()
 await page.getByText('Copied snippet',{exact:true}).waitFor()
 assert.equal(await page.evaluate(()=>window.copiedSource),'npm run test:run')
 const input=page.getByRole('textbox',{name:'Command'});assert.equal(await input.getAttribute('readonly'),'')
 await page.getByRole('button',{name:'Copy code'}).click();await page.getByText('Copied code',{exact:true}).waitFor()
 assert.equal(await page.evaluate(()=>window.copiedSource),'const ready: boolean = true;\nconsole.log("Hello", 42);\n')
 assert.deepEqual(errors,[])
 await writeFile(path.join(output,'browser.json'),JSON.stringify({results,copy:true,readOnly:true,errors},null,2))
 console.log(`PASS: ${results.length} theme/mode screenshots, contract colors, exact code+snippet copy, read-only input`)
}finally{await browser.close()}
