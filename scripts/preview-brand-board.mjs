// Local design QA only. Launches an isolated headless browser, not the user's Brave session.
import {openBrowser} from '@remotion/renderer';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const browser=await openBrowser('chrome',{browserExecutable:'C:/Program Files/Google/Chrome/Application/chrome.exe',logLevel:'error'});
try{
 const page=await browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});
 const url=pathToFileURL(path.resolve('docs/design/chitrabodh-brand-board.html')).href;
 await page.setViewport({width:1560,height:1400,deviceScaleFactor:1});
 await page.goto({url,timeout:20000});
 await page.evaluate(async()=>{await document.fonts.ready;});
 for(const size of [1560,390,320]){
  await page.setViewport({width:size,height:1400,deviceScaleFactor:1});
  await page.evaluate(()=>document.querySelector('[data-view="b"]').click());
  const state=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,shown:[...document.querySelectorAll('[data-direction]')].filter(x=>!x.hidden).map(x=>x.dataset.direction),selected:document.querySelector('[aria-pressed="true"]').dataset.view,fonts:document.fonts.check('16px Manrope')&&document.fonts.check('16px Space')}));
  if(state.scrollWidth>state.width||state.shown.join()!=='b'||state.selected!=='b'||!state.fonts)throw new Error(JSON.stringify(state));
  console.log(JSON.stringify(state));
  if(size===390){const image=await page._client().send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile('docs/design/chitrabodh-brand-mobile.png',Buffer.from(image.value.data,'base64'));}
 }
 await page.setViewport({width:1560,height:1400,deviceScaleFactor:1});
 await page.evaluate(()=>document.querySelector('[data-view="all"]').click());
 const shown=await page.evaluate(()=>[...document.querySelectorAll('[data-direction]')].filter(x=>!x.hidden).length);
 if(shown!==3)throw new Error('Compare mode failed');
 const image=await page._client().send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
 await writeFile('docs/design/chitrabodh-brand-comparison.png',Buffer.from(image.value.data,'base64'));
 console.log('PASS: comparison, selector, loaded fonts, and responsive widths.');
}finally{await browser.close({silent:true});}

