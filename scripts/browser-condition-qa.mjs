import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(path.resolve(process.env.DCL_PLAYWRIGHT_DIR||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'package.json'));
const {chromium}=require('playwright');
const origin=process.env.SITE_URL?.replace(/\/$/,'');
assert.match(origin,/^https:\/\/[a-z0-9.-]+$/);
const production=process.argv.includes('--production');
if(!production)assert.notEqual(origin,'https://digital-capacity-lab.pages.dev','fault injection is preview-only');
const out=path.resolve('qa-results');fs.mkdirSync(out,{recursive:true});
const results=[],errors=[];
const record=(name,details={})=>{results.push({name,...details});console.log('PASS '+name+' '+JSON.stringify(details));};
const hash=s=>createHash('sha256').update(s).digest('hex');
for(let attempt=0;;attempt++){
 try{
  for(const asset of ['core.mjs','app.mjs','profiles.mjs','style.css']){
   const r=await fetch(origin+'/'+asset);assert.equal(r.status,200);
   assert.equal(hash(await r.text()),hash(fs.readFileSync('src/'+asset,'utf8')),asset+' source match');
  }
  const r=await fetch(origin+'/');assert.equal(r.status,200);assert.match(await r.text(),/og:site_name/);
  break;
 }catch(e){if(attempt>=29)throw e;await new Promise(r=>setTimeout(r,2000));}
}
record('deployed modules match tested sources; latest-main site metadata present',{origin});
const browser=await chromium.launch({headless:true});
const cases={
 storage:{values:{photos:'321'},field:'photos',mutated:'77',expected:'3.534 GB'},
 backup:{values:{original:'200',copies:'3',margin:'20',dest0:'100',destUnit0:'GB',dest1:'1',destUnit1:'TiB',dest2:'2',destUnit2:'TB'},field:'original',mutated:'77',expected:'240 GB'},
 streaming:{values:{rate:'8',compareRate:'4',hours:'2',days:'30',mobile:'25'},field:'rate',mutated:'7',expected:'216 GB'}
};
const open=async(page,tool)=>{await page.goto(origin+'/'+tool+'/',{waitUntil:'networkidle'});await page.locator('#result .big').waitFor();await page.locator('.profile-controls summary').click();};
const submit=page=>page.locator('button[type=submit]').click();
const values=page=>page.locator('#calculator input,#calculator select').evaluateAll(els=>els.filter(e=>e.name&&!e.closest('.bitrate-helper')).map(e=>[e.name,e.value]));
const snapshot=async page=>({values:await values(page),result:await page.locator('#result').innerHTML(),copyDisabled:await page.locator('#copy-result').isDisabled()});
const setValues=async(page,vals)=>{
 for(const [key,value]of Object.entries(vals)){
  const el=page.locator('#'+key);if(await el.evaluate(e=>e.tagName)==='SELECT')await el.selectOption(value);else await el.fill(value);
 }
};
const status=page=>page.locator('#profile-status').textContent();
const assertStatus=async(page,pattern)=>assert.match(await status(page),pattern);
const layout=async(page,width)=>{
 const d=await page.evaluate(()=>({innerWidth,scroll:document.documentElement.scrollWidth,buttons:[...document.querySelectorAll('.profile-controls button')].map(b=>{const r=b.getBoundingClientRect();return {id:b.id,left:r.left,right:r.right,width:r.width,height:r.height};})}));
 assert.equal(d.innerWidth,width);assert.ok(d.scroll<=width,'no horizontal overflow: '+JSON.stringify(d));
 for(const b of d.buttons){assert.ok(b.left>=0&&b.right<=width,b.id+' in viewport');assert.ok(b.height>=44,b.id+' touch height');}
 return d;
};
try{
 // Each context is disposable and separate from any user browser profile.
 for(const width of [1280,360,390]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500,deviceScaleFactor:width<500?2:1});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  for(const[tool,c]of Object.entries(cases)){
   await open(page,tool);await setValues(page,c.values);await submit(page);
   assert.equal(await page.locator('#result .big').innerText(),c.expected);
   const savedValues=await values(page);
   await page.locator('#save-profile').click();await assertStatus(page,/保存しました/);
   await setValues(page,{[c.field]:c.mutated});await submit(page);const current=await snapshot(page);
   await page.locator('#load-profile').click();await assertStatus(page,/呼び出して再計算/);
   assert.deepEqual(await values(page),savedValues);assert.equal(await page.locator('#result .big').innerText(),c.expected);
   await page.reload({waitUntil:'networkidle'});await page.locator('#result .big').waitFor();
   assert.notEqual((await values(page)).find(([k])=>k===c.field)[1],c.values[c.field],'no automatic restoration');
   await page.locator('.profile-controls summary').click();await page.locator('#load-profile').click();
   assert.deepEqual(await values(page),savedValues);assert.equal(await page.locator('#result .big').innerText(),c.expected);
   await submit(page);assert.equal(await page.locator('#result .big').innerText(),c.expected);
   if(width<500){await page.locator('.profile-controls summary').click();assert.equal(await page.locator('.profile-controls').evaluate(e=>e.open),false);await page.locator('.profile-controls summary').click();const details=await layout(page,width);record(`${width}px ${tool} layout`,details);await page.locator('.profile-controls').screenshot({path:`${out}/${width}-${tool}-controls.png`});await page.locator('#result').screenshot({path:`${out}/${width}-${tool}-result.png`});}
   record(`${width}px ${tool} explicit save/load/reload/recalculate`,{expected:c.expected});
  }
  // Verify persistence in a different tab with the same disposable browser context.
  const revisit=await context.newPage();revisit.on('pageerror',e=>errors.push(e.message));await page.close();
  await open(revisit,'streaming');await revisit.locator('#load-profile').click();assert.equal(await revisit.locator('#result .big').innerText(),cases.streaming.expected);
  const saved=await revisit.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));
  for(const tool of ['storage','backup','streaming']){
   await open(revisit,tool);await revisit.locator('#load-profile').click();const before=await snapshot(revisit);
   await revisit.locator('#delete-profile').click();await assertStatus(revisit,/削除しました/);assert.deepEqual(await snapshot(revisit),before);
   const remaining=await revisit.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));
   delete saved['dcl-conditions-v1:'+tool];assert.deepEqual(remaining,saved);
   for(const other of Object.keys(saved)){
    const otherTool=other.split(':')[1];await open(revisit,otherTool);await revisit.locator('#load-profile').click();assert.equal(await revisit.locator('#result .big').innerText(),cases[otherTool].expected);
   }
  }
  record(`${width}px tab-close persistence and independent deletion`);
  await context.close();
 }
 if(!production){
  const context=await browser.newContext();const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  for(const[tool,c]of Object.entries(cases)){
   await open(page,tool);await setValues(page,c.values);await submit(page);await page.locator('#save-profile').click();
   const key='dcl-conditions-v1:'+tool,valid=await page.evaluate(key=>localStorage.getItem(key),key),profile=JSON.parse(valid);
   await setValues(page,{[c.field]:c.mutated});await submit(page);const before=await snapshot(page);
   const corrupt=[['broken JSON','{bad'],['null JSON','null'],['array JSON','[]'],['oversized','x'.repeat(12001)],['wrong version',JSON.stringify({...profile,version:99})],['wrong calculator',JSON.stringify({...profile,tool:'unknown'})],['missing values',JSON.stringify({version:1,tool})],['values array',JSON.stringify({...profile,values:[]})]];
   const badValues={...profile.values};delete badValues[c.field];corrupt.push(['missing numeric field',JSON.stringify({...profile,values:badValues})]);
   for(const value of ['-1','NaN','Infinity','1e3',' 10 ','',null,{},'9'.repeat(129)])corrupt.push(['invalid numeric '+JSON.stringify(value),JSON.stringify({...profile,values:{...profile.values,[c.field]:value}})]);
   if(tool==='storage')for(const p of [{photoUnit:'NO_SUCH_UNIT'},{photoUnit:'GB'},{audioMode:'unknown'}])corrupt.push(['invalid select '+JSON.stringify(p),JSON.stringify({...profile,values:{...profile.values,...p}})]);
   if(tool==='backup')for(const p of [{unit:'NO_SUCH_UNIT'},{destUnit2:'NO_SUCH_UNIT'},{destUnit0:'MiB'},{copies:'2.0'},{copies:'02'},{copies:'6'},{dest2:'-1'}])corrupt.push(['invalid backup '+JSON.stringify(p),JSON.stringify({...profile,values:{...profile.values,...p}})]);
   for(const[name,raw]of corrupt){
    await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key,raw});await page.locator('#load-profile').click();
    assert.doesNotMatch(await status(page),/呼び出して再計算/);assert.deepEqual(await snapshot(page),before,name+' must be atomic');
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),raw,'rejected stored bytes are preserved');
    await submit(page);assert.deepEqual(await snapshot(page),before,name+' calculation continues');
   }
   record(tool+' corrupt data rejected without changing current values/results',{cases:corrupt.length});
   await page.evaluate(({key,valid})=>localStorage.setItem(key,valid),{key,valid});
   for(const[mode,button]of [['access','load-profile'],['getItem','load-profile'],['setItem','save-profile'],['removeItem','delete-profile']]){
    await page.evaluate(mode=>{
     if(mode==='access'){const d=Object.getOwnPropertyDescriptor(window,'localStorage');Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('QA denied','SecurityError');}});window.__restoreDclStorage=()=>Object.defineProperty(window,'localStorage',d);}
     else{const original=Storage.prototype[mode];Storage.prototype[mode]=function(){throw new DOMException('QA denied',mode==='setItem'?'QuotaExceededError':'SecurityError');};window.__restoreDclStorage=()=>{Storage.prototype[mode]=original;};}
    },mode);
    try{await page.locator('#'+button).click();await assertStatus(page,/このまま計算できます/);assert.deepEqual(await snapshot(page),before);await submit(page);assert.deepEqual(await snapshot(page),before);}
    finally{await page.evaluate(()=>{window.__restoreDclStorage();delete window.__restoreDclStorage;});}
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),valid,'storage failure keeps previous profile');
   }
   record(tool+' storage getter/read/quota/delete failure retains saved bytes and calculation');
   // A broken profile already present on page load is also ignored until explicit load.
   await page.evaluate(key=>localStorage.setItem(key,'{bad'),key);await page.reload({waitUntil:'networkidle'});await page.locator('#result .big').waitFor();const fresh=await snapshot(page);
   await page.locator('.profile-controls summary').click();await page.locator('#load-profile').click();assert.deepEqual(await snapshot(page),fresh);await submit(page);assert.deepEqual(await snapshot(page),fresh);
   await page.locator('#delete-profile').click();record(tool+' corrupt profile on initial navigation leaves default calculator usable');
  }
  for(const copies of ['0','3','5']){
   await open(page,'backup');await setValues(page,{copies});
   const custom={};for(let i=0;i<Number(copies);i++){custom['dest'+i]=String(i+1);custom['destUnit'+i]=['GB','GiB','TB','TiB','GB'][i];}
   await setValues(page,custom);await submit(page);const before=await snapshot(page);await page.locator('#save-profile').click();await assertStatus(page,/保存しました/);
   await page.reload({waitUntil:'networkidle'});await page.locator('#result .big').waitFor();await page.locator('.profile-controls summary').click();await page.locator('#load-profile').click();assert.deepEqual(await snapshot(page),before);
   assert.equal(await page.locator('.destination').count(),Number(copies));record('backup restores '+copies+' destinations including their units');
  }
  await context.close();
 }
 assert.deepEqual(errors,[],'no uncaught browser exceptions');record('no uncaught browser exceptions');
}catch(e){console.error(e);results.push({failure:e.stack});process.exitCode=1;}
finally{fs.writeFileSync(out+'/summary.json',JSON.stringify({origin,production,engine:await browser.version(),androidPhysicalDevice:false,checks:results,errors},null,2));await browser.close();}
