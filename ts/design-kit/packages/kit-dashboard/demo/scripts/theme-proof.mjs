// Run after building the workspace and starting the demo on :5198.
// PLAYWRIGHT_MODULE may point to an isolated playwright-core installation.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright-core')
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { COLOR_TOKENS, TEXT_SCALE } from '../../../design-tokens/dist/index.js'
const consumer = process.env.PROOF_APP === 'ops-chat'
const output = resolve(process.env.PROOF_OUTPUT ?? 'docs/screenshots')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true})
const page = await browser.newPage({ viewport:{width:1440,height:1200}, colorScheme:'dark' })
const pageErrors=[]
page.on('pageerror',e=>pageErrors.push(e.message))
if (consumer) {
  const session = { id: 'appearance-proof', title: 'Appearance proof', provider: 'Fixture', model: 'local', last_activity: '2026-10-01T18:00:00Z', created_at: '2026-10-01T18:00:00Z', updated_at: '2026-10-01T18:00:00Z' }
  await page.route('**/api/**', route => {
    const detail = new URL(route.request().url()).pathname.endsWith('/appearance-proof')
    const body = detail ? { session, messages: [
      { id: 'u', session_id: session.id, role: 'user', content: 'Show the current theme.', created_at: session.created_at },
      { id: 'a', session_id: session.id, role: 'assistant', content: '## Shared appearance\n\n**Light and dark** use the same base, sidebar and chat tokens.\n\n- Preferences survive reload\n- System mode follows the OS', created_at: session.created_at },
    ] } : [session]
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
  })
}
await page.goto(process.env.PROOF_URL ?? 'http://127.0.0.1:5198/themes')
if (consumer) {
  await page.getByRole('button', { name: 'Appearance proof' }).click()
  await page.getByText('Shared appearance', { exact: true }).waitFor()
} else await page.getByTestId('theme-gallery').waitFor()
const themes = await page.getByLabel('Theme',{exact:true}).locator('option').evaluateAll(options=>options.map(o=>o.value))
const measure = ({tokens,selector}) => {
  const ctx=document.createElement('canvas').getContext('2d')
  function rgba(color) { ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data].map((v,i)=>i===3?v/255:v) }
  function blend(top,bottom) { return top.slice(0,3).map((v,i)=>v*top[3]+bottom[i]*(1-top[3])).concat(1) }
  function background(el) { return el?blend(rgba(getComputedStyle(el).backgroundColor),background(el.parentElement)):[255,255,255,1] }
  function lum(c) { return c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0) }
  function ratio(a,b) { const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05) }
  const failures=[]
  const root=getComputedStyle(document.documentElement)
  const undefinedTokens=tokens.filter(token=>{
    const value=root.getPropertyValue('--hl-'+token).trim()
    return !value || !CSS.supports('color',value)
  })
  for(const el of document.querySelectorAll(selector+' *')) {
   if(![...el.childNodes].some(n=>n.nodeType===3 && n.textContent.trim()) || !el.getBoundingClientRect().width)continue
   const style=getComputedStyle(el)
   const bg=background(el)
   const fg=blend(rgba(style.color),bg)
   const r=ratio(fg,bg)
   const large=parseFloat(style.fontSize)>=24 || parseFloat(style.fontSize)>=18.66 && +style.fontWeight>=700
   if(r<(large?3:4.5) && !el.closest('button:disabled'))failures.push({text:el.textContent.slice(0,65),classes:el.className,color:style.color,bg,ratio:+r.toFixed(2)})
  }
  return {failures,undefinedTokens,body:getComputedStyle(document.body).backgroundColor}
 }
const results=[]
for (const theme of themes) for(const mode of ['dark','light']) {
 await page.emulateMedia({ colorScheme: mode === 'dark' ? 'light' : 'dark' })
 await page.getByLabel('Theme',{exact:true}).selectOption(theme)
 if(await page.locator('html').getAttribute('data-mode') !== mode) await page.getByRole('button',{name:`Switch to ${mode} mode`}).click()
 await page.mouse.move(0,0)
 await page.waitForTimeout(350)
 const data = await page.evaluate(measure,{tokens:COLOR_TOKENS,selector:'body'})
 if(await page.locator('html').getAttribute('data-theme')!==theme || await page.locator('html').getAttribute('data-mode')!==mode) throw Error('Theme/mode did not apply')
 await page.screenshot({path:resolve(output,theme+'-'+mode+'.png'),fullPage:true})
 const interactionFailures=[]
 const names=consumer ? [`Switch to ${mode==='dark'?'light':'dark'} mode`] : ['Outline','Delete',`Switch to ${mode==='dark'?'light':'dark'} mode`]
 for(const name of names) {
   const control=page.getByRole('button',{name,exact:true})
   await control.hover()
   await page.waitForTimeout(350)
   const hover=await page.evaluate(measure,{tokens:COLOR_TOKENS,selector:'body'})
   interactionFailures.push(...hover.failures.map(f=>({...f,state:'hover: '+name})))
   await control.focus()
   await page.mouse.move(0,0)
   await page.waitForTimeout(350)
   const focus=await page.evaluate(measure,{tokens:COLOR_TOKENS,selector:'body'})
   interactionFailures.push(...focus.failures.map(f=>({...f,state:'focus: '+name})))
 }
 results.push({theme,mode,...data,interactionFailures})
}
const legacyPills=[]
if (!consumer) {
  for (const theme of ['p4-white','p1-green-phosphor','p3-amber-phosphor','hi-contrast']) {
    await page.evaluate(theme=>{ const root=document.documentElement; root.dataset.theme=theme; root.dataset.mode='dark'; root.classList.remove('light'); root.classList.add('dark'); root.style.colorScheme='dark' },theme)
    await page.waitForTimeout(350)
    const row=page.locator('section[aria-label="Base components"] > div').nth(1)
    const pills=await row.evaluate(el=>[...el.children].map(pill=>({tone:pill.textContent,size:getComputedStyle(pill).fontSize,color:getComputedStyle(pill).color,border:getComputedStyle(pill).borderColor,classes:pill.className})))
    const feedback=await page.evaluate(()=>{const s=getComputedStyle(document.documentElement);return ['success','info'].map(tone=>s.getPropertyValue('--hl-'+tone).trim())})
    if(pills.some(pill=>pill.size!==TEXT_SCALE.caption+'px') || feedback.some(value=>!value)) throw Error('Legacy Pill size or tone missing: '+theme)
    await row.screenshot({path:resolve(output,'pills-'+theme+'-after.png')})
    legacyPills.push({theme,pills,feedback})
  }
}
// Confirm explicit preference survives reload, then return to system mode.
const saved = themes.at(-1)
await page.reload()
await page.getByLabel('Theme',{exact:true}).waitFor()
if (await page.locator('html').getAttribute('data-theme')!==saved || await page.locator('html').getAttribute('data-mode')!=='light') throw Error('Preferences did not survive reload')
await page.getByRole('button',{name:'Use system',exact:true}).click()
await page.emulateMedia({ colorScheme:'dark' })
await page.waitForFunction(()=>document.documentElement.dataset.mode==='dark')
await page.emulateMedia({ colorScheme:'light' })
await page.waitForFunction(()=>document.documentElement.dataset.mode==='light')
writeFileSync(resolve(output,'contrast.json'),JSON.stringify({ browser:await browser.version(),viewport:{width:1440,height:1200}, pageErrors,legacyPills,results },null,2)+'\n')
for(const r of results) console.log(`${r.theme}/${r.mode}: ${r.failures.length} text contrast failures; ${r.interactionFailures.length} interaction failures; ${r.undefinedTokens.length} undefined tokens`)
await browser.close()
if(pageErrors.length || results.some(r=>r.failures.length || r.undefinedTokens.length || r.interactionFailures.length))process.exitCode=1
