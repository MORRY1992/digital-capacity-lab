import test from 'node:test';import assert from 'node:assert/strict';
import {averageBitrate,media,backupFragment,readBackupFragment,bytes} from '../src/core.mjs';
test('reverse bitrate: measured file includes audio; does not count audio twice',()=>{
 assert.equal(averageBitrate(750,'MB',10),10);
 assert.equal(averageBitrate(750,'MiB',10),10.48576);
 const rate=averageBitrate(750,'MB',10);
 assert.equal(media({rate,minutes:10,count:1,photos:0,size:0,photoUnit:'MB',audioMode:'included'}).total,750e6);
 assert.throws(()=>averageBitrate(750,'MB',0));assert.throws(()=>averageBitrate(1e9,'GB',1));
 for(const bad of ['',-1,'NaN','1e3'])assert.throws(()=>averageBitrate(bad,'MB',10));
});
test('storage-to-backup transfer preserves byte value and validates hostile fragments',()=>{
 for(const total of [0,1e-10,8.25e9,100*2**30,1e18,1.1e20,1e21]){
  const parsed=readBackupFragment(backupFragment(total));assert.ok(parsed);
  const actual=bytes(parsed.original,parsed.unit);assert.ok(Math.abs(actual-total)<=Math.max(1e-25,total*1e-14));
 }
 for(const invalid of ['','#capacity=-1','#capacity=Infinity','#capacity=1e99','#capacity=1&script=alert(1)','#capacity=<svg>','#capacity='])assert.equal(readBackupFragment(invalid),null);
 for(const invalid of [NaN,Infinity,-1,1e22])assert.throws(()=>backupFragment(invalid));
});
