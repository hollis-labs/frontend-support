import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE)
const output = process.env.RADIUS_OUTPUT
mkdirSync(output, {recursive:true})
const browser = await chromium.launch({executablePath:process.env.CHROME})
const results=[]
try {
for (const width of [1440,390]) for (const [theme,mode] of [['sysop-p4-white','dark'],['dir-b','light']]) {
 const cell=[]
 for (const surface of ['observeError','observeTachyonError','chatCards','chatComposer','chatComposerBusy']) {
  const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:'reduce'})
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto(`${process.env.RADIUS_URL}/?surface=${surface}&theme=${theme}&mode=${mode}`)
  await page.waitForSelector('#root > *')
  if(surface==='observeTachyonError')await page.getByLabel('App',{exact:true}).selectOption('tachyon')
  if(surface.startsWith('observe'))await page.getByLabel('Observation',{exact:true}).selectOption('refresh-error')
  await page.addStyleTag({content:'*{transition:none!important;animation:none!important}'})
  await page.waitForTimeout(300)
  for(const button of await page.locator('button').all()) {
   const detail=await button.evaluate(el=>({label:el.getAttribute('aria-label')||el.textContent.trim().replace(/\s+/g,' '),context:el.closest('[data-review]')?.getAttribute('data-review'),classes:el.className,radius:getComputedStyle(el).borderTopLeftRadius}))
   if(!detail.classes.includes('rounded-control')||detail.label==='Reset fixture')continue
   await button.scrollIntoViewIfNeeded()
   const box=await button.boundingBox()
   if(!box)continue
   const crop=await page.screenshot({clip:{x:Math.max(0,box.x-8),y:Math.max(0,box.y-8),width:Math.min(width-Math.max(0,box.x-8),box.width+16),height:box.height+16}})
   cell.push({surface,...detail,image:crop.toString('base64')})
  }
  if(errors.length)throw new Error(errors.join('\n'))
  await page.close()
 }
 results.push({width,theme,mode,controls:cell})
}
}finally{await browser.close()}
writeFileSync(output+'/crops.json',JSON.stringify(results,null,2)+'\n')
console.log('Cropped controls in '+results.length+' cells')
