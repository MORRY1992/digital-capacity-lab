import {initProfiles} from './profiles.mjs';
import {media,backup,streaming,format,numeric,averageBitrate,backupFragment,readBackupFragment} from './core.mjs';
const form=document.querySelector('#calculator');
const tool=document.querySelector('main').dataset.tool;
const result=document.querySelector('#result');
const error=document.querySelector('#error');
let memo='',revision=0;
const byId=id=>document.getElementById(id);
function clearMemo(){revision++;memo='';byId('copy-result').disabled=true;byId('show-result').disabled=true;byId('memo-fallback').hidden=true;byId('memo-status').textContent='';}
const value=id=>form.elements.namedItem(id).value;
const field=(id,label,value,max)=>`<div class="field"><label for="${id}">${label}</label><input id="${id}" name="${id}" type="number" inputmode="decimal" min="0" max="${max}" step="any" value="${value}" required aria-describedby="${id}-error"><span id="${id}-error" class="field-error"></span></div>`;
function destinations(){
 const container=document.querySelector('#destinations');
 const count=Number(value('copies'));
 const previous=Array.from(container.querySelectorAll('.destination')).map((_,i)=>({capacity:value('dest'+i),unit:value('destUnit'+i)}));
 container.replaceChildren();
 for(let i=0;i<count;i++){
  const div=document.createElement('div');div.className='destination';
  // Generated index and fixed markup only; input values are assigned as properties below.
  div.innerHTML=`<h3>バックアップ先 ${i+1}</h3><div class="form-grid">${field('dest'+i,'空き容量 '+(i+1),128,1e9)}<div class="field"><label for="destUnit${i}">単位 ${i+1}</label><select name="destUnit${i}" id="destUnit${i}"><option>GB</option><option>GiB</option><option>TB</option><option>TiB</option></select></div></div>`;
  container.append(div);
  if(previous[i]){form.elements.namedItem('dest'+i).value=previous[i].capacity;form.elements.namedItem('destUnit'+i).value=previous[i].unit;}
 }
 if(count===0){const p=document.createElement('p');p.textContent='バックアップなし。元データだけの計算です。';container.append(p);}
}
function audio(){if(tool==='storage')form.elements.namedItem('audio').disabled=value('audioMode')==='included';}
function invalidate(){clearMemo();error.textContent='';result.innerHTML='<h2>条件が変更されました</h2><p>「この条件で計算する」を押すと、新しい結果を表示します。</p>';}
function validate(){let first;
 for(const input of form.querySelectorAll('input')){
  input.removeAttribute('aria-invalid');const node=document.getElementById(input.id+'-error');if(node)node.textContent='';
  if(input.disabled||input.closest('.bitrate-helper'))continue;
  try{numeric(input.value,Number(input.max),input.step==='1');}catch(e){input.setAttribute('aria-invalid','true');if(node)node.textContent=e.message;first ||= input;}
 }
 if(first){error.textContent='入力内容を確認してください。エラーのある項目を修正すると計算できます。';first.focus();return false;}return true;
}
const rows=entries=>`<dl>${entries.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
const big=(label,bytes)=>`<h2>${label}</h2><div class="big">${format(bytes)}</div><p class="secondary">同じ容量：${format(bytes,'GiB')}</p>`;
const formula=text=>`<details class="details"><summary>この結果の計算式を見る</summary><p class="formula">${text}</p></details>`;
function calculate(){
 clearMemo();
 if(!validate()){result.innerHTML='<h2>計算できませんでした</h2><p>入力欄のエラーをご確認ください。</p>';return;}
 error.textContent='';
 try{
 if(tool==='storage'){
  const v=Object.fromEntries(new FormData(form));const r=media(v);
  const share=r.total?r.video/r.total*100:0;
  result.innerHTML=big('写真＋動画の推定容量',r.total)+`<div class="bar" aria-hidden="true"><span style="width:${share}%"></span><span style="width:${r.total?100-share:0}%"></span></div>`+rows([['動画',format(r.video)],['写真',format(r.photo)],['合計ビットレート',r.totalRate.toLocaleString('ja-JP',{maximumFractionDigits:3})+' Mb/s']])+formula(`${r.totalRate} Mb/s × ${Number(v.minutes)*60}秒 × ${Number(v.count)}本 ÷ 8 ＋ 写真${Number(v.photos)}枚 × ${Number(v.size)} ${v.photoUnit}`)+`<p>固定の条件から求めた目安です。コンテナ等の追加分や実際の可変ビットレートの変動は反映しません。</p><a href="/backup/${backupFragment(r.total)}" style="color:#d7e5ff">この容量を引き継いでバックアップを計算 →</a><p>合計容量のみを次のページに引き継ぎます。</p>`;
 }else if(tool==='backup'){
  const v=Object.fromEntries(new FormData(form));v.destinations=Array.from({length:Number(v.copies)},(_,i)=>({capacity:value('dest'+i),unit:value('destUnit'+i)}));const r=backup(v);
  result.innerHTML=big('1か所あたりに確保したい容量',r.each)+rows([['元データ',format(r.original)],['追加バックアップだけ',format(r.backupOnly)],['元＋複製の実データ合計',format(r.total)],['上乗せ込みの全体確保量',format(r.planned)]])+r.destinations.map((d,i)=>`<p class="dest-status ${d.sufficient?'good':'bad'}">保存先 ${i+1}：${d.sufficient?'確保可能':'容量不足'}<br>${d.sufficient?'計画後の残り '+format(d.available):'あと '+format(-d.available)+' 必要'}</p>`).join('')+formula(`実データ合計：${format(r.original)} ×（1＋${r.copies}）<br>1か所あたり：${format(r.original)} ×（1＋${Number(v.margin)}÷100）`)+`<p>${r.copies===0?'現在はバックアップなしの計画です。':''}元データの保存場所も上乗せ込みの全体確保量に含みます。元の保存場所の空き容量は判定していません。完全コピーのみの計算です。</p>`;
 }else{
  const v=Object.fromEntries(new FormData(form));const r=streaming(v);
  result.innerHTML=big('月間の総通信量の目安',r.total)+rows([['モバイル回線',format(r.mobile)],['Wi-Fi側',format(r.wifi)],['1日あたり',format(r.daily)],['比較条件の月間総量',format(r.compare)],['現在との差',format(Math.abs(r.difference))+(r.difference<0?' 減':r.difference>0?' 増':'（同じ）')],['比較条件のモバイル回線',format(r.compare*Number(v.mobile)/100)]])+formula(`${Number(v.rate)} Mb/s × ${Number(v.hours)}時間 × 3,600 × ${Number(v.days)}日 ÷ 8 ÷ 1,000 ＝ GB`)+`<p>モバイル回線 ${Number(v.mobile)}%・Wi-Fi ${100-Number(v.mobile)}%で按分。サービスの実測値・請求量ではありません。広告や先読み等によって実際の量は変わります。</p>`;
 }
 memo=[document.querySelector('h1').textContent,'入力条件：',...Array.from(form.querySelectorAll('input,select')).filter(el=>!el.disabled&&!el.closest('.bitrate-helper')).map(el=>{const label=document.querySelector('label[for="'+el.id+'"]');return (label?.textContent||el.name)+'：'+(el.tagName==='SELECT'?el.selectedOptions[0].textContent:el.value);}), '計算結果：',result.innerText||result.textContent,'入力条件による目安。実際の容量・請求量を保証しません。'].join('\n');
 byId('copy-result').disabled=false;byId('show-result').disabled=false;
 }catch(e){error.textContent=e.message;result.innerHTML='<h2>計算できませんでした</h2><p>条件と単位をご確認ください。</p>';}
}
if(tool==='backup'){form.elements.namedItem('copies').value='2';destinations();}
if(tool==='backup'&&location.hash.startsWith('#capacity=')){const transferred=readBackupFragment(location.hash);history.replaceState(null,'',location.pathname+location.search);if(transferred){form.elements.namedItem('original').value=transferred.original;form.elements.namedItem('unit').value=transferred.unit;const p=document.createElement('p');p.className='callout';p.textContent='写真・動画の合計容量を引き継ぎました。複製数・上乗せ・保存先の空き容量は、このページで確認してください。';form.prepend(p);}else{error.textContent='引き継ぐ容量を読み込めませんでした。元データの容量を入力してください。';}}
audio();
form.addEventListener('submit',e=>{e.preventDefault();calculate();if(memo)result.focus();});
form.addEventListener('input',invalidate);
form.addEventListener('change',e=>{if(e.target.name==='copies')destinations();audio();invalidate();});
form.addEventListener('reset',()=>{setTimeout(()=>{if(tool==='backup'){document.querySelector('#destinations').replaceChildren();form.elements.namedItem('copies').value='2';destinations();}audio();calculate();},0);});
calculate();


function showMemo(){if(!memo)return;byId('memo-fallback').hidden=false;byId('memo-text').value=memo;byId('memo-text').focus();byId('memo-text').select();}
byId('show-result').addEventListener('click',showMemo);
byId('copy-result').addEventListener('click',async()=>{if(!memo)return;const current=revision,text=memo;byId('copy-result').disabled=true;let ok=false;try{await navigator.clipboard.writeText(text);ok=true;}catch{}if(revision!==current)return;byId('copy-result').disabled=false;byId('memo-status').textContent=ok?'条件と結果をコピーしました。共有前に内容をご確認ください。':'自動コピーができません。下のメモを選択してコピーしてください。';if(!ok)showMemo();});
if(tool==='storage')byId('apply-bitrate').addEventListener('click',()=>{invalidate();try{const rate=averageBitrate(value('sampleSize'),value('sampleUnit'),value('sampleMinutes'));form.elements.namedItem('rate').value=rate.toLocaleString('en-US',{useGrouping:false,maximumSignificantDigits:21});form.elements.namedItem('minutes').value=value('sampleMinutes');form.elements.namedItem('audioMode').value='included';audio();byId('bitrate-status').textContent=rate.toLocaleString('ja-JP',{maximumFractionDigits:6})+' Mb/sを反映しました。1本の長さも反映済みです。本数・写真枚数を確認して計算してください。';}catch(e){byId('bitrate-status').textContent=e.message;}});

initProfiles({tool,form,byId,validate,rebuild:destinations,audio,calculate});
