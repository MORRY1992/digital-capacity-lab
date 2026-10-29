import test from 'node:test';import assert from 'node:assert/strict';
import {encodeProfile,decodeProfile,profileKey} from '../src/profiles.mjs';
const storage={minutes:'10',count:'2',rate:'10',audioMode:'included',audio:'',photos:'100',size:'4',photoUnit:'MB'};
test('saved conditions are versioned, per tool, and exclude extraneous fields',()=>{
 const encoded=encodeProfile('storage',{...storage,sampleSize:'secret-not-saved',unexpected:'not-saved'});
 assert.doesNotMatch(encoded,/secret|unexpected/);const decoded=decodeProfile('storage',encoded);
 assert.equal(decoded.minutes,'10');assert.equal(decoded.audio,'128');
 assert.notEqual(profileKey('storage'),profileKey('streaming'));assert.throws(()=>profileKey('__proto__'));
});
test('all three calculators validate saved conditions, including 0 and 5 backup copies',()=>{
 const streaming={rate:'5',compareRate:'2.5',hours:'1',days:'30',mobile:'50'};
 assert.deepEqual(decodeProfile('streaming',encodeProfile('streaming',streaming)),streaming);
 for(const copies of [0,5]){const v={original:'100',unit:'GB',copies:String(copies),margin:'20'};for(let i=0;i<copies;i++){v['dest'+i]='128';v['destUnit'+i]=i%2?'GiB':'GB';}assert.deepEqual(decodeProfile('backup',encodeProfile('backup',v)),v);}
});
test('corrupt, oversized, mismatched, and invalid saved values are rejected before restoration',()=>{
 for(const text of ['',null,'{','null','[]','x'.repeat(12001),JSON.stringify({version:2,tool:'storage',values:storage}),encodeProfile('streaming',{rate:'5',compareRate:'2.5',hours:'1',days:'30',mobile:'50'})])assert.throws(()=>decodeProfile('storage',text));
 for(const v of [{...storage,rate:'<img>'},{...storage,count:'0.5'},{...storage,minutes:'-1'},{...storage,photoUnit:'bogus'},{...storage,audioMode:'separate',audio:''}])assert.throws(()=>encodeProfile('storage',v));
 assert.throws(()=>encodeProfile('backup',{original:'1',unit:'GB',copies:'6',margin:'0'}));
 assert.throws(()=>encodeProfile('backup',{original:'1',unit:'GB',copies:'1',margin:'0'}));
});
test('saved values must fit the actual number inputs and select options before any restoration',()=>{
 const b={original:'100',unit:'GB',copies:'2',margin:'20',dest0:'128',destUnit0:'GB',dest1:'1',destUnit1:'TB'};
 for(const values of [{...storage,minutes:' 10 '},{...storage,photoUnit:'GB'},{...storage,photoUnit:'TB'}])
  assert.throws(()=>decodeProfile('storage',JSON.stringify({version:1,tool:'storage',values})));
 for(const values of [{...b,copies:'2.0'},{...b,copies:'02'},{...b,unit:'MB'},{...b,destUnit0:'MiB'},{...b,dest0:' 128 '}])
  assert.throws(()=>decodeProfile('backup',JSON.stringify({version:1,tool:'backup',values})));
});
