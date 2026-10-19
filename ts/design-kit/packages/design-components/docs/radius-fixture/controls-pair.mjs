import { readFileSync, mkdirSync } from 'node:fs'
const { chromium }=await import(process.env.PLAYWRIGHT_MODULE)
const [beforeDir, afterDir, out] = process.argv.slice(2)
if (!out) throw new Error('Usage: controls-pair.mjs BEFORE AFTER OUTPUT')
const before=JSON.parse(readFileSync(beforeDir + '/crops.json'))
const after=JSON.parse(readFileSync(afterDir + '/crops.json'))
mkdirSync(out,{recursive:true})
const browser=await chromium.launch({executablePath:process.env.CHROME})
try {
 for(let k=0;k<before.length;k++) {
  const b=before[k],a=after[k]
  if(b.controls.length!==a.controls.length)throw Error('Crop identity mismatch')
  const page=await browser.newPage({viewport:{width:1000,height:Math.max(1100,b.controls.length*86+70)}})
  const rows=b.controls.map((x,i)=> {
   const y=a.controls[i]
   if(x.surface!==y.surface||x.label!==y.label||x.context!==y.context)throw Error('Crop identity mismatch')
   if(x.radius===y.radius)return ''
   return `<tr><td>${x.surface}<br>${x.context||''} ${x.label}</td><td>${x.radius}<br><img src="data:image/png;base64,${x.image}"></td><td>${y.radius}<br><img src="data:image/png;base64,${y.image}"></td></tr>`
  }).join('')
  await page.setContent(`<style>body{margin:12px;font:14px sans-serif;background:#fff;color:#111}table{border-collapse:collapse;width:100%}td,th{padding:8px;border:1px solid #bbb;text-align:left;height:66px}img{display:block;max-width:300px}</style><h3>${b.width}px / ${b.theme} ${b.mode}: added controls, cause (a)</h3><table><thead><tr><th>Instance</th><th>BEFORE: current main</th><th>AFTER: option A</th></tr></thead><tbody>${rows}</tbody></table>`)
  await page.locator('img').evaluateAll(xs=>Promise.all(xs.map(x=>x.decode())))
  await page.screenshot({path:`${out}/new-controls-${b.width}-${b.theme}-${b.mode}.png`,fullPage:true})
  await page.close()
 }
}finally{await browser.close()}
