import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
function setup(tool,hash=''){
 const html=fs.readFileSync(`dist/${tool}/index.html`,'utf8'),nodes=new Map(),inputs=new Map(),labels=new Map();let focused='',replaced='';
 const get=id=>{if(!nodes.has(id))nodes.set(id,{id,value:'',handlers:{},children:[],hidden:false,addEventListener(t,f){(this.handlers[t]??=[]).push(f);},async fire(t,target=this){for(const f of this.handlers[t]||[])await f({target,preventDefault(){}});},focus(){focused=id;},select(){},setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];},closest(s){return s==='.bitrate-helper'&&id.startsWith('sample')?{}:null;},replaceChildren(){this.children=[];},append(el){this.children.push(el);},prepend(){},querySelectorAll(selector){return selector==='.destination'?this.children:[];},set innerHTML(s){this.html=s;this.textContent=s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');if(this.className==='destination')parse(s);},get innerHTML(){return this.html||'';},get innerText(){return this.textContent||'';},get selectedOptions(){return[{textContent:this.options?.get(String(this.value))??this.value}];}});return nodes.get(id);};
 function parse(markup){for(const m of markup.matchAll(/<label for="([^"]+)">([^<]*)<\/label>/g))labels.set(m[1],{textContent:m[2]});for(const original of markup.matchAll(/<(input)\b([^>]+)>|<(select)\b([^>]+)>([\s\S]*?)<\/select>/g)){const m=original[1]?[original[0],original[1],original[2],'']:[original[0],original[3],original[4],original[5]];
  const a=Object.fromEntries([...m[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(x=>[x[1],x[2]]));if(!a.id)continue;const el=get(a.id);Object.assign(el,a,{tagName:m[1].toUpperCase()});
  if(m[1]==='select'){el.options=new Map([...m[3].matchAll(/<option(?: value="([^"]*)")?>([^<]*)<\/option>/g)].map(x=>[x[1]??x[2],x[2]]));el.value=el.options.keys().next().value;}
  inputs.set(a.name,el);
 }}
 parse(html.slice(html.indexOf('<form'),html.indexOf('</form>')));
 const form=get('calculator');form.elements={namedItem:id=>inputs.get(id)};form.querySelectorAll=selector=>selector==='input'?[...inputs.values()].filter(el=>el.tagName==='INPUT'):[...inputs.values()];
 const result=get('result');get('main').dataset={tool};get('title').textContent=tool;
 globalThis.document={getElementById:get,createElement:()=>({set innerHTML(s){this.html=s;parse(s);},className:'',textContent:''}),querySelector:s=>s==='main'?get('main'):s==='h1'?get('title'):s.startsWith('label')?labels.get(s.match(/for="([^"]+)"/)[1]):get(s.slice(1))};
 globalThis.FormData=class{constructor(){this.entries=[...inputs.values()].filter(el=>!el.disabled).map(el=>[el.name,el.value]);}[Symbol.iterator](){return this.entries[Symbol.iterator]();}};
 globalThis.location={hash,pathname:`/${tool}/`,search:''};globalThis.history={replaceState(a,b,url){replaced=url;}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async()=>{throw Error('denied');}}}});
 return {get,form,result,inputs,focused:()=>focused,replaced:()=>replaced};
}
test('storage reverse bitrate, successful result, manual copy fallback, invalidation, and backup handoff',async()=>{
 const saved=globalThis.FormData;
 const e=setup('storage');await import('../src/app.mjs?storage-workflow');
 assert.equal(e.get('error').textContent,'',JSON.stringify([...e.inputs].map(([k,v])=>[k,v.value,v.name])));assert.match(e.result.innerHTML,/8.25 GB/);assert.match(e.result.innerHTML,/\/backup\/#capacity=8250000000/);
 await e.get('apply-bitrate').fire('click');assert.equal(e.inputs.get('rate').value,'10');assert.equal(e.inputs.get('minutes').value,'10');assert.equal(e.inputs.get('audio').disabled,true);
 await e.form.fire('submit');assert.match(e.result.innerHTML,/6.75 GB/);
 await e.get('copy-result').fire('click');assert.equal(e.get('memo-fallback').hidden,false);assert.match(e.get('memo-text').value,/平均ビットレート/);assert.match(e.get('memo-text').value,/6.75 GB/);
 e.inputs.get('rate').value='';await e.form.fire('input');assert.equal(e.get('copy-result').disabled,true);assert.equal(e.get('memo-fallback').hidden,true);
 await e.form.fire('submit');assert.match(e.result.innerHTML,/計算できません/);assert.equal(e.focused(),'rate');
 const b=setup('backup','#capacity=8250000000');await import('../src/app.mjs?backup-workflow');
 assert.equal(b.inputs.get('original').value,'8.25');assert.equal(b.replaced(),'/backup/');assert.match(b.result.innerHTML,/9.9 GB/);assert.match(b.result.innerHTML,/確保可能/);
 globalThis.FormData=saved;for(const name of ['document','location','history','navigator'])delete globalThis[name];
});
