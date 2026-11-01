import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

// Run the real health checker with a deterministic HTTP boundary. No network requests.
// A healthy site must pass, while a missing/stale/mislabelled profile module must fail.
const harness=`
import fs from 'node:fs';
const origin='https://capacity-test.invalid';
const pages=['/','/storage/','/backup/','/streaming/','/units/','/video-guide/','/backup-guide/','/streaming-guide/','/guide/','/about/','/privacy/','/terms/','/contact/'];
globalThis.fetch=async url=>{
 const path=new URL(url).pathname;let body='',type='text/plain',status=200;
 if(path.endsWith('/')){body='<html lang="ja"><link rel="canonical" href="'+origin+path+'">';type='text/html';}
 else if(path==='/robots.txt')body='Sitemap: '+origin+'/sitemap.xml';
 else if(path==='/sitemap.xml')body=pages.map(p=>'<loc>'+origin+p+'</loc>').join('');
 else if(path.endsWith('.mjs')||path.endsWith('.css')){body=fs.readFileSync('src'+path,'utf8');type=path.endsWith('.mjs')?'application/javascript':'text/css';}
 if(path==='/profiles.mjs'){
  if(process.env.PROFILE_FAULT==='missing')status=404;
  if(process.env.PROFILE_FAULT==='stale')body+='\\n// stale deployment';
  if(process.env.PROFILE_FAULT==='html')type='text/html';
 }
 const response=new Response(body,{status,headers:{'content-type':type}});
 Object.defineProperty(response,'url',{value:String(url)});return response;
};
await import('./scripts/check-live.mjs');
`;
for(const fault of ['', 'missing', 'stale', 'html'])test('live checker '+(fault?'rejects '+fault+' profile module':'accepts all matching modules'),()=>{
 const run=spawnSync(process.execPath,['--input-type=module','--eval',harness],{
  encoding:'utf8',timeout:10000,env:{...process.env,SITE_URL:'https://capacity-test.invalid',ADSENSE_VERIFIED_PUBLISHER:'',GITHUB_STEP_SUMMARY:'',PROFILE_FAULT:fault}
 });
 assert.equal(run.status,fault?1:0,run.stdout+run.stderr);
 if(fault)assert.match(run.stderr,/FAIL \/profiles\.mjs/);
 else assert.match(run.stdout,/PASS \/profiles\.mjs/);
});
