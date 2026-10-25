import {media,backup,streaming,numeric} from './core.mjs';
const fields={storage:['minutes','count','rate','audioMode','audio','photos','size','photoUnit'],backup:['original','unit','copies','margin'],streaming:['rate','compareRate','hours','days','mobile']};
export const profileKey=tool=>{if(!Object.hasOwn(fields,tool))throw Error('計算機を確認してください。');return 'dcl-conditions-v1:'+tool;};
export function checkedConditions(tool,source){
 profileKey(tool);
 if(!source||typeof source!=='object'||Array.isArray(source))throw Error('保存条件の形式を確認してください。');
 const names=[...fields[tool]];
 if(tool==='backup'){const count=numeric(source.copies,5,true);for(let i=0;i<count;i++)names.push('dest'+i,'destUnit'+i);}
 const values={};
 for(const name of names){if(!Object.hasOwn(source,name)||typeof source[name]!=='string'||source[name].length>128)throw Error('保存条件の項目を確認してください。');values[name]=source[name];}
 if(tool==='storage'){
  if(values.audioMode==='included')values.audio='128';
  media(values);
 }else if(tool==='backup')backup({...values,destinations:Array.from({length:Number(values.copies)},(_,i)=>({capacity:values['dest'+i],unit:values['destUnit'+i]}))});
 else streaming(values);
 return values;
}
export const encodeProfile=(tool,values)=>JSON.stringify({version:1,tool,values:checkedConditions(tool,values)});
export function decodeProfile(tool,text){
 if(typeof text!=='string'||text.length>12000)throw Error('保存条件を読み込めません。削除して保存し直してください。');
 let p;try{p=JSON.parse(text);}catch{throw Error('保存条件を読み込めません。削除して保存し直してください。');}
 if(!p||p.version!==1||p.tool!==tool)throw Error('保存条件の種類・バージョンが対応していません。');
 return checkedConditions(tool,p.values);
}
export function initProfiles({tool,form,byId,validate,rebuild,audio,calculate},getStorage=()=>globalThis.localStorage){
 const status=byId('profile-status'),key=profileKey(tool);
 const failure=()=>{status.textContent='端末への保存・読み出しが利用できません。このまま計算できます。';};
 byId('save-profile').addEventListener('click',()=>{
  if(!validate()){status.textContent='保存できませんでした。入力欄のエラーを修正してください。';return;}
  let encoded;try{const values=Object.fromEntries(Array.from(form.querySelectorAll('input,select')).filter(el=>el.name&&!el.closest('.bitrate-helper')).map(el=>[el.name,el.value]));encoded=encodeProfile(tool,values);}catch(e){status.textContent=e.message;return;}
  try{getStorage().setItem(key,encoded);status.textContent='この計算機の条件を、この端末に保存しました。次回「保存条件を呼び出す」で復元できます。';}catch{failure();}
 });
 byId('load-profile').addEventListener('click',()=>{
  let text;try{text=getStorage().getItem(key);}catch{failure();return;}
  if(text===null){status.textContent='この計算機の保存条件はありません。';return;}
  let values;try{values=decodeProfile(tool,text);}catch(e){status.textContent=e.message;return;}
  if(tool==='backup'){form.elements.namedItem('copies').value=values.copies;rebuild();}
  for(const [name,v] of Object.entries(values))form.elements.namedItem(name).value=v;
  audio();calculate();status.textContent='保存条件を呼び出して再計算しました。今回の条件に合うか確認してください。';
 });
 byId('delete-profile').addEventListener('click',()=>{
  try{getStorage().removeItem(key);status.textContent='この計算機の保存条件を削除しました。画面の入力と他の計算機の保存条件は残ります。';}catch{failure();}
 });
}
