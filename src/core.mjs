export const UNITS = Object.freeze({ MB:1e6, MiB:2**20, GB:1e9, GiB:2**30, TB:1e12, TiB:2**40 });
export function numeric(value, max=1e9, integer=false) {
  if((typeof value!=='number' && typeof value!=='string') || (typeof value==='string' && !/^\d+(?:\.\d+)?$/.test(value.trim()))) throw new Error('0以上の数値を入力してください。空欄・指数表記・記号は使えません。');
  const n=Number(value);
  if(!Number.isFinite(n)||n<0||n>max||(integer&&!Number.isInteger(n))) throw new Error(`0〜${max.toLocaleString('ja-JP')}の${integer?'整数':'数値'}を入力してください。`);
  return n;
}
export function bytes(value,unit){ if(!Object.hasOwn(UNITS,unit))throw new Error('単位を確認してください。');return numeric(value)*UNITS[unit]; }
export function media(v){
  const minutes=numeric(v.minutes,1440),count=numeric(v.count,1e6,true),rate=numeric(v.rate,10000),photos=numeric(v.photos,1e7,true),size=numeric(v.size,1e5);
  if(!['included','separate'].includes(v.audioMode))throw new Error('音声の扱いを確認してください。');
  const audio=v.audioMode==='separate'?numeric(v.audio,10000)/1000:0;
  const totalRate=rate+audio;
  const video=totalRate*1e6*minutes*60*count/8,photo=bytes(size,v.photoUnit)*photos;
  return {video,photo,total:video+photo,totalRate};
}
export function backup(v){
  const original=bytes(v.original,v.unit),copies=numeric(v.copies,5,true),margin=numeric(v.margin,100);
  if(!Array.isArray(v.destinations)||v.destinations.length!==copies)throw new Error('複製数と保存先の数を合わせてください。');
  const each=original*(1+margin/100);
  const destinations=v.destinations.map(d=>{const capacity=bytes(d.capacity,d.unit);return{capacity,available:capacity-each,sufficient:capacity>=each};});
  return {original,each,copies,total:original*(1+copies),backupOnly:original*copies,planned:each*(1+copies),destinations};
}
export function streaming(v){
  const rate=numeric(v.rate,10000),hours=numeric(v.hours,24),days=numeric(v.days,31,true),mobile=numeric(v.mobile,100),compareRate=numeric(v.compareRate,10000);
  const daily=rate*1e6*hours*3600/8,total=daily*days,compare=compareRate*1e6*hours*3600*days/8;
  return {daily,total,mobile:total*mobile/100,wifi:total*(1-mobile/100),compare,difference:compare-total};
}
export function format(value,unit='GB'){if(!Object.hasOwn(UNITS,unit)||!Number.isFinite(value)||value<0)throw new Error('表示値を確認してください。');const n=value/UNITS[unit];return (n>0&&n<0.001?'< 0.001':n.toLocaleString('ja-JP',{maximumFractionDigits:3}))+' '+unit;}


export function averageBitrate(size,unit,minutes){
 const seconds=numeric(minutes,1440)*60;if(seconds===0)throw new Error('再生時間は0より大きい値を入力してください。');
 const rate=bytes(size,unit)*8/seconds/1e6;
 if(rate>10000)throw new Error('逆算値が10,000 Mb/sを超えています。容量・時間・単位を確認してください。');
 return rate;
}
export function backupFragment(total){
 if(!Number.isFinite(total)||total<0||total>1e21)throw new Error('引き継げる容量の範囲外です。');
 return '#capacity='+total.toLocaleString('en-US',{useGrouping:false,maximumSignificantDigits:21});
}
export function readBackupFragment(hash){
 if(!/^#capacity=\d+(?:\.\d+)?(?:e\+?\d+)?$/.test(hash))return null;
 const total=Number(hash.slice(10));if(!Number.isFinite(total)||total<0||total>1e21)return null;
 const unit=total<=1e18?'GB':'TB';return {original:(total/UNITS[unit]).toLocaleString('en-US',{useGrouping:false,maximumSignificantDigits:21}),unit};
}
