const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1360,height:900},hasTouch:true});
 const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith((process.env.BASE_URL || 'http://127.0.0.1:4183'))&&!r.url().startsWith('data:'))external.push(r.url())});
 await page.goto((process.env.BASE_URL || 'http://127.0.0.1:4183'));
 const trigger=page.getByRole('button',{name:'Choose model',exact:true});
 await trigger.focus();await page.keyboard.press('Enter');
 const dialog=page.getByRole('dialog',{name:'Choose a model',exact:true});await dialog.waitFor();
 const input=dialog.getByRole('combobox',{name:'Search models'});await input.waitFor();
 if(!await input.evaluate(el=>el===document.activeElement))throw Error('Input not focused');
 const links=await dialog.evaluate(el=>({title:el.querySelector('#'+CSS.escape(el.getAttribute('aria-labelledby')))?.textContent,description:el.querySelector('#'+CSS.escape(el.getAttribute('aria-describedby')))?.textContent}));
 if(links.title!=='Choose a model'||!links.description)throw Error('Title/description not inside popup');
 await input.fill('reasoning');await dialog.getByRole('option',{name:/Hosted large/}).waitFor();
 if(await dialog.getByRole('option',{name:/Local small/}).count())throw Error('Filtering failed');
 await input.fill('missing');await dialog.getByText('No matching models').waitFor();
 await input.fill('');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
 await dialog.waitFor({state:'hidden'});await page.getByRole('status').filter({hasText:'Selected: Hosted large'}).waitFor();
 if(!await trigger.evaluate(el=>el===document.activeElement))throw Error('Selection did not restore trigger focus');
 await trigger.tap();await dialog.waitFor();
 const dir=process.env.TMPDIR+'/model-selector-screenshots';fs.mkdirSync(dir,{recursive:true});
 const themes=['nanite-default','dir-a','dir-b','dir-d','dir-e','dir-f','sysop-p4-white','sysop-green-phosphor','sysop-amber-phosphor','sysop-hi-contrast'];
 for(const theme of themes)for(const mode of ['light','dark']){
  await page.evaluate(({theme,mode})=>{document.documentElement.dataset.theme=theme;document.documentElement.dataset.mode=mode},{theme,mode});
  await page.screenshot({path:dir+'/'+theme+'-'+mode+'.png',animations:'disabled'});
 }
 await dialog.getByRole('option',{name:'Unavailable'}).tap({force:true});if(!await dialog.isVisible())throw Error('Disabled option closed dialog');
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 if(!await trigger.evaluate(el=>el===document.activeElement))throw Error('Escape focus not restored');
 await page.getByRole('button',{name:'Open quick selector'}).click();
 const quick=page.getByRole('dialog',{name:'Quick model selector'});await quick.waitFor();
 if(await quick.getAttribute('aria-describedby'))throw Error('Undescribed convenience dialog has dangling description');
 await quick.getByRole('option',{name:/Local small/}).tap();await quick.waitFor({state:'hidden'});
 await page.getByRole('status').filter({hasText:'Selected: Local small'}).waitFor();
 if(errors.length||external.length)throw Error(JSON.stringify({errors,external}));
 const result={themes,screenshots:20,keyboardOpen:true,inputFocus:true,titleDescriptionInsidePopup:links,filtering:true,emptyState:true,keyboardHostSelection:true,selectionFocusReturn:true,touchOpenSelect:true,disabledInert:true,escapeFocusReturn:true,convenienceDialog:true,externalRequests:external,pageErrors:errors};
 fs.writeFileSync(process.env.TMPDIR+'/model-selector-browser-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
