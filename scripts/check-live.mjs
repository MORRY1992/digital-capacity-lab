import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const origin=process.env.SITE_URL?.replace(/\/$/,'');
if(!origin||!/^https:\/\/[a-z0-9.-]+$/.test(origin))throw new Error('検証済みSITE_URL（https originのみ）を設定してください。');
const paths=['/','/storage/','/backup/','/streaming/','/units/','/video-guide/','/backup-guide/','/streaming-guide/','/guide/','/about/','/privacy/','/terms/','/contact/','/robots.txt','/sitemap.xml','/ads.txt','/core.mjs','/app.mjs','/profiles.mjs','/style.css','/favicon.svg'];
const errors=[];const hash=s=>createHash('sha256').update(s).digest('hex');
for(const path of paths){try{
 const response=await fetch(origin+path,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'DigitalCapacityLab-HealthCheck/1.0'}});
 assert.equal(response.status,200,`HTTP ${response.status}`);assert.equal(new URL(response.url).origin,origin,'unexpected origin redirect');
 const text=await response.text();
 if(path.endsWith('/')){assert.match(response.headers.get('content-type')||'',/text\/html/);assert.match(text,/<html lang="ja">/);assert.doesNotMatch(text,/制作確認版|公開前の設定待ち|noindex/);assert.ok(text.includes(`rel="canonical" href="${origin}${path}"`),'canonical mismatch');}
 if(path==='/robots.txt')assert.ok(text.includes(`Sitemap: ${origin}/sitemap.xml`));
 if(path==='/sitemap.xml')for(const p of paths.filter(x=>x.endsWith('/')))assert.ok(text.includes(`<loc>${origin}${p}</loc>`));
 if(['/core.mjs','/app.mjs','/profiles.mjs','/style.css'].includes(path)){
  assert.match(response.headers.get('content-type')||'',path.endsWith('.mjs')?/(?:java|ecma)script/:/text\/css/,'asset content type mismatch');
  assert.equal(hash(text),hash(fs.readFileSync(new URL('../src'+path,import.meta.url),'utf8')),'deployed asset differs from tested source: '+path);
 }
 if(path==='/ads.txt'&&process.env.ADSENSE_VERIFIED_PUBLISHER)assert.ok(text.includes(process.env.ADSENSE_VERIFIED_PUBLISHER.replace('ca-','')));
 console.log(`PASS ${path}`);
}catch(e){errors.push(`${path}: ${e.message}`);console.error(`FAIL ${path}: ${e.message}`);}}
const summary=`## 稼働確認\n${new Date().toISOString()}\n\n${paths.length-errors.length}/${paths.length} endpoints passed.\n\n${errors.join('\n')}\n\nHTTPと配信計算・画面・条件保存・CSSのソース一致を確認。ブラウザー操作検証は別途必要です。広告スクリプトの実行・広告クリックは行いません。\n`;
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary);
if(errors.length)process.exitCode=1;
