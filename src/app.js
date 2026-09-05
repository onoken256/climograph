"use strict";
const MONTHS=["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const PRESETS={
 "東京":{h:"N",T:[5.4,6.1,9.4,14.3,18.8,21.9,25.7,26.9,23.3,18.0,12.5,7.7],P:[59.7,56.5,116.0,133.7,139.7,167.8,156.2,154.7,224.9,234.8,96.3,57.9],pMax:600},
 "札幌":{h:"N",T:[-3.2,-2.7,1.1,7.3,13.0,17.0,21.1,22.3,18.6,12.1,5.2,-0.9],P:[108.4,91.9,77.6,54.6,55.5,60.4,90.7,126.8,142.2,109.9,113.8,114.5],pMax:300},
 "那覇":{h:"N",T:[17.3,17.5,19.1,21.5,24.2,27.2,29.1,29.0,27.9,25.5,22.5,19.0],P:[101.6,114.5,142.8,161.0,245.3,284.4,188.1,240.0,275.2,179.2,119.1,110.0],pMax:600},
 "シンガポール":{h:"N",T:[26.6,27.2,27.6,28.0,28.4,28.3,27.9,27.8,27.7,27.6,27.0,26.6],P:[234,112,170,155,171,136,156,165,156,156,267,314],pMax:600},
 "マナオス":{h:"S",T:[26.1,26.0,26.1,26.2,26.5,26.8,27.0,27.9,28.3,28.2,27.6,26.7],P:[260,288,314,300,256,114,88,58,83,126,184,217],pMax:600},
 "カイロ":{h:"N",T:[14.0,15.0,17.9,21.9,25.4,27.6,28.4,28.2,26.6,23.4,19.3,15.4],P:[5,4,4,1,0.4,0.1,0,0,0,0.7,4,6],pMax:300},
 "ローマ":{h:"N",T:[8.1,8.9,11.3,13.9,18.3,22.4,25.2,25.3,21.4,17.4,12.6,9.1],P:[67,73,58,81,53,34,19,37,73,113,115,81],pMax:300},
 "ロンドン":{h:"N",T:[5.2,5.3,7.6,9.9,13.3,16.4,18.7,18.5,15.7,12.0,8.0,5.5],P:[55,41,42,44,49,45,45,50,49,69,59,55],pMax:300},
 "香港":{h:"N",T:[16.3,16.8,19.4,23.0,26.0,28.0,28.6,28.4,27.6,25.4,21.7,17.7],P:[25,45,71,189,305,456,377,432,328,101,38,27],pMax:600},
 "モスクワ":{h:"N",T:[-6.5,-6.7,-1.0,6.7,13.2,17.0,19.2,17.0,11.3,5.6,-1.2,-5.2],P:[52,41,39,37,61,80,85,82,68,71,55,52],pMax:300},
 "ブエノスアイレス":{h:"S",T:[24.9,23.7,21.9,17.9,14.6,11.6,11.0,12.7,14.9,17.9,21.0,23.5],P:[138,127,140,119,92,59,65,64,72,128,118,106],pMax:300},
 "ウトキアグヴィク":{h:"N",T:[-25.0,-26.6,-24.9,-17.0,-6.3,1.4,4.8,4.0,-0.4,-8.7,-17.2,-22.6],P:[4,4,4,4,4,9,25,32,20,14,7,5],pMax:300}
};

const state={name:"東京",T:PRESETS["東京"].T.slice(),P:PRESETS["東京"].P.slice(),
 hemi:"N",tMin:-30,tMax:30,pMax:600,mode:"auto",trace:true,showValues:false,sel:0,lastPreset:"東京",
 scale:"year",N:12,labels:MONTHS.slice(),axisUnit:"月",monthOf:0,byScale:{month:{}}};
const history=[];

/* ---------- time-scale management ----------
   年間(N=12)／月間(N=その月の日数)／日毎(N=24) を切り替える。
   切り替え時は state.byScale に元の粒度のデータを退避し、戻ってきたときに復元する。
   月間はさらに「どの実月か」(state.monthOf 0〜11)ごとにデータを分けて持つ。 */
const DAYS_IN_MONTH=[31,28,31,30,31,30,31,31,30,31,30,31];
const dayLabels=n=>Array.from({length:n},(_,i)=>String(i+1));
const hourLabels=()=>Array.from({length:24},(_,i)=>String(i));

function labelUnit(i){ const l=String(state.labels[i]); return l.endsWith(state.axisUnit)?l:l+state.axisUnit; }
function labelBare(i){ const l=String(state.labels[i]); return l.endsWith(state.axisUnit)?l.slice(0,-state.axisUnit.length):l; }

function scaleShape(scale,monthOf){
  if(scale==="year") return {N:12,labels:MONTHS.slice(),axisUnit:"月"};
  if(scale==="day") return {N:24,labels:hourLabels(),axisUnit:"時"};
  const n=DAYS_IN_MONTH[monthOf];
  return {N:n,labels:dayLabels(n),axisUnit:"日"};
}
function defaultData(scale,monthOf){
  if(scale==="day"){
    const baseT=state.byScale.year?state.byScale.year.T[state.sel]:15;
    return {T:Array(24).fill(baseT),P:Array(24).fill(0),sel:0};
  }
  if(scale==="month"){
    const n=DAYS_IN_MONTH[monthOf], yr=state.byScale.year;
    const baseT=yr?yr.T[monthOf]:15, baseP=yr?Math.round(yr.P[monthOf]/n*10)/10:0;
    return {T:Array(n).fill(baseT),P:Array(n).fill(baseP),sel:0};
  }
  const preset=PRESETS[state.lastPreset];
  return {T:preset?preset.T.slice():Array(12).fill(15),P:preset?preset.P.slice():Array(12).fill(100),sel:0};
}
function cacheGet(scale,monthOf){ return scale==="month"?state.byScale.month[monthOf]:state.byScale[scale]; }
function cacheSet(scale,monthOf,data){ if(scale==="month") state.byScale.month[monthOf]=data; else state.byScale[scale]=data; }
function saveCurrentToCache(){ cacheSet(state.scale,state.monthOf,{T:state.T.slice(),P:state.P.slice(),sel:state.sel}); }
function switchScale(target,monthOf){
  if(target==="month"&&monthOf===undefined) monthOf=state.monthOf;
  if(target===state.scale&&(target!=="month"||monthOf===state.monthOf)) return;
  saveCurrentToCache();
  const shape=scaleShape(target,monthOf);
  const cached=cacheGet(target,monthOf);
  const data=cached?{T:cached.T.slice(),P:cached.P.slice(),sel:cached.sel}:defaultData(target,monthOf);
  state.scale=target; if(target==="month") state.monthOf=monthOf;
  state.N=shape.N; state.labels=shape.labels; state.axisUnit=shape.axisUnit;
  state.T=data.T; state.P=data.P; state.sel=clamp(data.sel|0,0,shape.N-1);
}

/* ---------- geometry ---------- */
const W=1020,H=700,PL=88,PR=924,PT=96,PB=614;
const PH=PB-PT;
const CW=()=>(PR-PL)/state.N;
const xc=i=>PL+(i+0.5)*CW();
const yT=t=>PB-(t-state.tMin)/(state.tMax-state.tMin)*PH;
const yP=p=>PB-(p/state.pMax)*PH;
const tFromY=y=>state.tMin+(PB-y)/PH*(state.tMax-state.tMin);
const pFromY=y=>(PB-y)/PH*state.pMax;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const F="'Zen Kaku Gothic New','Hiragino Sans','Noto Sans JP',sans-serif";
const FM="'IBM Plex Mono',ui-monospace,Menlo,monospace";

/* ---------- climate math ---------- */
function computeTRange(T){const tn=Math.min(...T),tx=Math.max(...T);return [tn<-25?-40:(tn>=0?0:-30), tx>30?40:30];}
function computePMax(P){const pm=Math.max(...P);return [300,600,900,1200,1800].find(v=>v>=pm)||2400;}
function summerIdx(hemi){return (hemi||state.hemi)==="N"?[3,4,5,6,7,8]:[9,10,11,0,1,2];}
function derive(T,P){
  T=T||state.T; P=P||state.P;
  const Tann=T.reduce((a,b)=>a+b,0)/T.length, Pann=P.reduce((a,b)=>a+b,0);
  const Tmax=Math.max(...T),Tmin=Math.min(...T);
  return {Tann,Pann,Tmax,Tmin,
    hotM:T.indexOf(Tmax),coldM:T.indexOf(Tmin),
    wetM:P.indexOf(Math.max(...P)),dryM:P.indexOf(Math.min(...P)),
    range:Tmax-Tmin};
}
function koppen(T,P,hemi){
  T=T||state.T; P=P||state.P; hemi=hemi||state.hemi;
  const d=derive(T,P);
  const su=summerIdx(hemi), wi=[...Array(T.length).keys()].filter(i=>!su.includes(i));
  const Psu=su.reduce((a,i)=>a+P[i],0), Pwi=wi.reduce((a,i)=>a+P[i],0);
  const r=d.Pann>0?Psu/d.Pann:0.5;
  let th, dist;
  if(r>=0.7){th=20*d.Tann+280; dist="夏に降水が集中";}
  else if(d.Pann>0&&Pwi/d.Pann>=0.7){th=20*d.Tann; dist="冬に降水が集中";}
  else{th=20*d.Tann+140; dist="降水は年中平均的";}
  const why=[];
  if(d.Pann<th){
    const arid=d.Pann<th/2, warm=d.Tann>=18;
    const code=(arid?"BW":"BS")+(warm?"h":"k");
    why.push(`年降水量 <b>${Math.round(d.Pann)}mm</b> が乾燥限界 <b>${Math.round(th)}mm</b> 未満（${dist}）→ <b>B</b>`);
    why.push(arid?`限界の半分 <b>${Math.round(th/2)}mm</b> も下回る → <b>W</b>（砂漠）`:`限界の半分は超える → <b>S</b>（ステップ）`);
    why.push(`年平均気温 <b>${d.Tann.toFixed(1)}℃</b> ${warm?"≧":"<"} 18℃ → <b>${warm?"h":"k"}</b>`);
    return {code,name:(arid?"砂漠気候":"ステップ気候")+(warm?"（低緯度）":"（中緯度）"),why};
  }
  if(d.Tmax<10){
    const ef=d.Tmax<0;
    why.push(`最暖月 <b>${d.Tmax.toFixed(1)}℃</b> < 10℃ → <b>E</b>（寒帯）`);
    why.push(ef?`最暖月が 0℃ 未満 → <b>F</b>`:`最暖月が 0〜10℃ → <b>T</b>`);
    return {code:ef?"EF":"ET",name:ef?"氷雪気候":"ツンドラ気候",why};
  }
  if(d.Tmin>=18){
    const Pdry=Math.min(...P), amLim=100-d.Pann/25;
    why.push(`最寒月 <b>${d.Tmin.toFixed(1)}℃</b> ≧ 18℃ → <b>A</b>（熱帯）`);
    if(Pdry>=60){why.push(`最少雨月 <b>${Math.round(Pdry)}mm</b> ≧ 60mm → <b>f</b>`);return{code:"Af",name:"熱帯雨林気候",why};}
    if(Pdry>=amLim){why.push(`最少雨月 <b>${Math.round(Pdry)}mm</b> は 60mm 未満だが基準 <b>${Math.round(amLim)}mm</b> 以上 → <b>m</b>`);return{code:"Am",name:"熱帯モンスーン気候",why};}
    why.push(`最少雨月 <b>${Math.round(Pdry)}mm</b> < 基準 <b>${Math.round(Math.max(amLim,0))}mm</b>、はっきりした乾季 → <b>w</b>`);
    return{code:"Aw",name:"サバナ気候",why};
  }
  const isC=d.Tmin>=-3;
  why.push(isC?`最寒月 <b>${d.Tmin.toFixed(1)}℃</b> は -3〜18℃ → <b>C</b>（温帯）`
               :`最寒月 <b>${d.Tmin.toFixed(1)}℃</b> < -3℃、最暖月は 10℃以上 → <b>D</b>（亜寒帯）`);
  const sMin=Math.min(...su.map(i=>P[i])), wMin=Math.min(...wi.map(i=>P[i]));
  const sMax=Math.max(...su.map(i=>P[i])), wMax=Math.max(...wi.map(i=>P[i]));
  let s2;
  const isS=sMin<40&&wMax>=3*sMin, isW=sMax>=10*wMin;
  if(isS&&(!isW||sMin<wMin)){s2="s";why.push(`夏の最少雨月 <b>${Math.round(sMin)}mm</b> が 40mm 未満で、冬の最多雨月の 1/3 未満 → <b>s</b>（夏に乾く）`);}
  else if(isW){s2="w";why.push(`冬の最少雨月 <b>${Math.round(wMin)}mm</b> が夏の最多雨月 <b>${Math.round(sMax)}mm</b> の 1/10 以下 → <b>w</b>（冬に乾く）`);}
  else{s2="f";why.push(`目立った乾季なし → <b>f</b>`);}
  let s3, warmCnt=T.filter(v=>v>=10).length;
  if(d.Tmax>=22){s3="a";why.push(`最暖月 <b>${d.Tmax.toFixed(1)}℃</b> ≧ 22℃ → <b>a</b>`);}
  else if(warmCnt>=4){s3="b";why.push(`最暖月 22℃未満、10℃以上の月が <b>${warmCnt}か月</b> → <b>b</b>`);}
  else{s3="c";why.push(`10℃以上の月が <b>${warmCnt}か月</b>だけ → <b>c</b>`);}
  const code=(isC?"C":"D")+s2+s3;
  const NAMES={Cs:"地中海性気候",Cw:"温暖冬季少雨気候",Cfa:"温暖湿潤気候",Cfb:"西岸海洋性気候",Cfc:"西岸海洋性気候",
    Df:"亜寒帯湿潤気候",Ds:"亜寒帯湿潤気候",Dw:"亜寒帯冬季少雨気候"};
  const name=NAMES[code]||NAMES[(isC?"C":"D")+s2]||"—";
  return {code,name,why};
}

/* ---------- chart ---------- */
function svgMarkup(forExport){
  const d=derive(), k=state.scale==="year"?koppen():null, o=[];
  const tStep=10, pStep=state.pMax/6;
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(state.name)}の雨温図">`);
  o.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#fbfcfa"/>`);

  // header block
  const headStat=state.scale==="year"
    ?`年平均気温 ${d.Tann.toFixed(1)}℃ ／ 年降水量 ${d.Pann.toFixed(1)}mm ／ 気温年較差 ${d.range.toFixed(1)}℃`
    :`平均気温 ${d.Tann.toFixed(1)}℃ ／ 合計降水量 ${d.Pann.toFixed(1)}mm ／ 気温差 ${d.range.toFixed(1)}℃`;
  o.push(`<text x="${PL}" y="48" font-family="${F}" font-size="30" font-weight="700" fill="#1e242a">${esc(state.name||"　")}</text>`);
  o.push(`<text x="${PL}" y="74" font-family="${FM}" font-size="14.5" fill="#66737c">${headStat}</text>`);
  if(k){
    o.push(`<text x="${PR}" y="44" text-anchor="end" font-family="${FM}" font-size="27" font-weight="600" fill="#2b6ca3">${esc(k.code)}</text>`);
    o.push(`<text x="${PR}" y="70" text-anchor="end" font-family="${F}" font-size="14.5" fill="#66737c">${esc(k.name)}・${state.hemi==="N"?"北半球":"南半球"}</text>`);
  }

  // selected column band
  const cw=CW();
  o.push(`<rect x="${(PL+state.sel*cw).toFixed(1)}" y="${PT}" width="${cw.toFixed(1)}" height="${PH}" fill="#2b6ca3" opacity="0.055"/>`);

  // column separators
  for(let i=1;i<state.N;i++) o.push(`<line x1="${(PL+i*cw).toFixed(1)}" y1="${PT}" x2="${(PL+i*cw).toFixed(1)}" y2="${PB}" stroke="#e4eae7" stroke-width="1"/>`);

  // horizontal grid on temperature ticks
  for(let t=state.tMin;t<=state.tMax+.001;t+=tStep){
    const y=yT(t), zero=Math.abs(t)<.001;
    o.push(`<line x1="${PL}" y1="${y.toFixed(1)}" x2="${PR}" y2="${y.toFixed(1)}" stroke="${zero?"#b3bfc4":"#ccd6d2"}" stroke-width="${zero?1.6:1}"${zero?"":' stroke-dasharray="1 0"'}/>`);
    o.push(`<text x="${PL-14}" y="${(y+5).toFixed(1)}" text-anchor="end" font-family="${FM}" font-size="15" fill="#c9432c">${t}</text>`);
  }
  // right axis ticks
  for(let p=0;p<=state.pMax+.001;p+=pStep){
    const y=yP(p);
    o.push(`<line x1="${PR}" y1="${y.toFixed(1)}" x2="${PR+8}" y2="${y.toFixed(1)}" stroke="#9fb3bd" stroke-width="1.4"/>`);
    o.push(`<text x="${PR+15}" y="${(y+5).toFixed(1)}" font-family="${FM}" font-size="15" fill="#2b6ca3">${Math.round(p)}</text>`);
  }
  // frame
  o.push(`<rect x="${PL}" y="${PT}" width="${PR-PL}" height="${PH}" fill="none" stroke="#9fb3bd" stroke-width="1.6"/>`);

  // bars
  const bw=Math.min(42,cw*0.66);
  for(let i=0;i<state.N;i++){
    const v=clamp(state.P[i],0,state.pMax), over=state.P[i]>state.pMax;
    const y=yP(v), h=Math.max(0,PB-y);
    if(h>0.4){
      o.push(`<rect x="${(xc(i)-bw/2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" fill="#2b6ca3" opacity="0.86"/>`);
      o.push(`<rect x="${(xc(i)-bw/2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw}" height="3" fill="#1d5687"/>`);
    }
    if(over) o.push(`<path d="M${(xc(i)-bw/2).toFixed(1)} ${PT+9} l${bw/4} -7 l${bw/4} 7 l${bw/4} -7 l${bw/4} 7" fill="none" stroke="#fbfcfa" stroke-width="4"/>`);
  }

  // temperature line
  const pts=state.T.map((t,i)=>`${xc(i).toFixed(1)},${clamp(yT(t),PT-40,PB+40).toFixed(1)}`).join(" ");
  o.push(`<polyline points="${pts}" fill="none" stroke="#c9432c" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round"/>`);
  for(let i=0;i<state.N;i++){
    const y=clamp(yT(state.T[i]),PT-40,PB+40), r=(i===state.sel&&!forExport)?11:8;
    o.push(`<circle cx="${xc(i).toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="#fbfcfa" stroke="#c9432c" stroke-width="3.4"/>`);
  }

  // value labels
  for(let i=0;i<state.N;i++){
    if(!state.showValues && !(i===state.sel && !forExport)) continue;
    const pv=state.P[i], py=yP(clamp(pv,0,state.pMax)), tall=PB-py>34;
    o.push(`<text x="${xc(i).toFixed(1)}" y="${(tall?py+22:py-10).toFixed(1)}" text-anchor="middle" font-family="${FM}" font-size="14" font-weight="600" fill="${tall?"#ffffff":"#2b6ca3"}">${pv.toFixed(1)}</text>`);
    const ty=clamp(yT(state.T[i]),PT,PB), above=ty>PT+40;
    o.push(`<text x="${xc(i).toFixed(1)}" y="${(above?ty-19:ty+29).toFixed(1)}" text-anchor="middle" font-family="${FM}" font-size="14" font-weight="600" fill="#c9432c" stroke="#fbfcfa" stroke-width="3.5" paint-order="stroke">${state.T[i].toFixed(1)}</text>`);
  }

  // column labels（項目数が多いときは間引く。ただし最初・最後・選択中は必ず出す）
  const showLabel=i=>state.N<24||i===0||i===state.N-1||i===state.sel||i%5===0;
  for(let i=0;i<state.N;i++){
    if(!showLabel(i)) continue;
    const on=i===state.sel;
    o.push(`<text x="${xc(i).toFixed(1)}" y="${PB+30}" text-anchor="middle" font-family="${F}" font-size="16" font-weight="${on?700:400}" fill="${on?"#1e242a":"#66737c"}">${esc(labelBare(i))}</text>`);
  }
  o.push(`<text x="${PL-14}" y="${PB+30}" text-anchor="end" font-family="${F}" font-size="13" fill="#8896a0">${esc(state.axisUnit)}</text>`);

  // axis titles + legend
  o.push(`<text transform="translate(28,${(PT+PH/2).toFixed(1)}) rotate(-90)" text-anchor="middle" font-family="${F}" font-size="15" font-weight="500" fill="#c9432c">気温 (℃)</text>`);
  o.push(`<text transform="translate(${W-22},${(PT+PH/2).toFixed(1)}) rotate(90)" text-anchor="middle" font-family="${F}" font-size="15" font-weight="500" fill="#2b6ca3">降水量 (mm)</text>`);
  const ly=PB+64;
  o.push(`<line x1="${PL}" y1="${ly-5}" x2="${PL+26}" y2="${ly-5}" stroke="#c9432c" stroke-width="3.6"/><circle cx="${PL+13}" cy="${ly-5}" r="6.5" fill="#fbfcfa" stroke="#c9432c" stroke-width="3"/>`);
  o.push(`<text x="${PL+34}" y="${ly}" font-family="${F}" font-size="14" fill="#525f68">気温</text>`);
  o.push(`<rect x="${PL+90}" y="${ly-14}" width="20" height="16" fill="#2b6ca3" opacity="0.86"/>`);
  o.push(`<text x="${PL+118}" y="${ly}" font-family="${F}" font-size="14" fill="#525f68">降水量</text>`);
  o.push(`</svg>`);
  return o.join("");
}

/* ---------- render ---------- */
let raf=0;
function render(){ if(raf) return; raf=requestAnimationFrame(()=>{raf=0;draw();}); }
function draw(){
  document.getElementById("chart").innerHTML=svgMarkup(false);
  const d=derive();
  document.getElementById("pickHeading").textContent=`えらんだ${state.axisUnit}をこまかく`;
  document.getElementById("mLabel").textContent=labelUnit(state.sel);
  document.getElementById("vT").innerHTML=`${state.T[state.sel].toFixed(1)}<small>℃</small>`;
  document.getElementById("vP").innerHTML=`${state.P[state.sel].toFixed(1)}<small>mm</small>`;

  const koppenCard=document.getElementById("koppenCard");
  if(state.scale==="year"){
    koppenCard.hidden=false;
    const k=koppen();
    const su=summerIdx(), Psu=su.reduce((a,i)=>a+state.P[i],0);
    const ratio=d.Pann>0?Math.round(Psu/d.Pann*100):0;
    const S=[["年平均気温",d.Tann.toFixed(1),"℃"],["年降水量",d.Pann.toFixed(1),"mm"],
      ["最暖月",`${d.hotM+1}月 ${d.Tmax.toFixed(1)}`,"℃"],["最寒月",`${d.coldM+1}月 ${d.Tmin.toFixed(1)}`,"℃"],
      ["気温年較差",d.range.toFixed(1),"℃"],["夏半年の降水",ratio,"%"],
      ["最多雨月",`${d.wetM+1}月 ${Math.max(...state.P).toFixed(1)}`,"mm"],
      ["最少雨月",`${d.dryM+1}月 ${Math.min(...state.P).toFixed(1)}`,"mm"]];
    document.getElementById("stats").innerHTML=S.map(([a,b,c])=>
      `<div><dt>${a}</dt><dd class="mono">${b}<small>${c}</small></dd></div>`).join("");
    document.getElementById("verdict").innerHTML=
      `<div class="code">${esc(k.code)}</div><div class="jp">${esc(k.name)}</div><div class="why">${k.why.map(w=>"・"+w).join("<br>")}</div>`;
  }else{
    koppenCard.hidden=true;
    const sumP=state.P.reduce((a,b)=>a+b,0);
    const G=[["最高気温",`${labelUnit(d.hotM)} ${d.Tmax.toFixed(1)}`,"℃"],
      ["最低気温",`${labelUnit(d.coldM)} ${d.Tmin.toFixed(1)}`,"℃"],
      ["平均気温",d.Tann.toFixed(1),"℃"],
      ["合計降水量",sumP.toFixed(1),"mm"]];
    document.getElementById("stats").innerHTML=G.map(([a,b,c])=>
      `<div><dt>${a}</dt><dd class="mono">${b}<small>${c}</small></dd></div>`).join("");
  }
  document.getElementById("undo").disabled=history.length===0;
  save();
}
function buildTable(){
  const cells=n=>state.labels.map((_,i)=>`<td><input type="number" inputmode="decimal" data-k="${n}" data-i="${i}" step="0.1" value="${(n==='T'?state.T[i]:state.P[i]).toFixed(1)}" aria-label="${labelUnit(i)}の${n==='T'?'気温':'降水量'}"></td>`).join("");
  document.getElementById("tblwrap").innerHTML=
    `<table class="grid"><thead><tr><th class="rh"></th>${state.labels.map((_,i)=>`<th>${esc(labelUnit(i))}</th>`).join("")}</tr></thead>
     <tbody><tr><th class="rh">気温 ℃</th>${cells("T")}</tr><tr><th class="rh">降水量 mm</th>${cells("P")}</tr></tbody></table>`;
}

/* ---------- history & storage ---------- */
function push(){
  history.push({scale:state.scale,monthOf:state.monthOf,N:state.N,labels:state.labels.slice(),axisUnit:state.axisUnit,
    T:state.T.slice(),P:state.P.slice(),name:state.name,sel:state.sel});
  if(history.length>50)history.shift();
}
function save(){
  saveCurrentToCache();
  try{
    localStorage.setItem("climograph-v2",JSON.stringify({
      scale:state.scale,monthOf:state.monthOf,byScale:state.byScale,
      name:state.name,hemi:state.hemi,tMin:state.tMin,tMax:state.tMax,pMax:state.pMax,
      mode:state.mode,trace:state.trace,showValues:state.showValues,lastPreset:state.lastPreset,sel:state.sel
    }));
  }catch(e){}
}
function load(){
  try{
    const raw=localStorage.getItem("climograph-v2");
    if(raw){
      const s=JSON.parse(raw);
      if(s&&s.byScale){
        state.byScale=s.byScale; state.monthOf=s.monthOf|0;
        state.name=s.name??state.name; state.hemi=s.hemi||state.hemi;
        state.tMin=s.tMin??state.tMin; state.tMax=s.tMax??state.tMax; state.pMax=s.pMax??state.pMax;
        state.mode=s.mode||state.mode; state.trace=s.trace??state.trace; state.showValues=s.showValues??state.showValues;
        state.lastPreset=s.lastPreset||state.lastPreset;
        const scale=s.scale||"year", shape=scaleShape(scale,state.monthOf);
        const cached=cacheGet(scale,state.monthOf)||defaultData(scale,state.monthOf);
        state.scale=scale; state.N=shape.N; state.labels=shape.labels; state.axisUnit=shape.axisUnit;
        state.T=cached.T.slice(); state.P=cached.P.slice(); state.sel=clamp(s.sel|0,0,shape.N-1);
        return;
      }
    }
    const v1=JSON.parse(localStorage.getItem("climograph-v1")||"null");
    if(v1&&Array.isArray(v1.T)&&v1.T.length===12&&Array.isArray(v1.P)&&v1.P.length===12){
      state.byScale.year={T:v1.T.slice(),P:v1.P.slice(),sel:clamp(v1.sel|0,0,11)};
      state.name=v1.name??state.name; state.hemi=v1.hemi||state.hemi;
      state.tMin=v1.tMin??state.tMin; state.tMax=v1.tMax??state.tMax; state.pMax=v1.pMax??state.pMax;
      state.mode=v1.mode||state.mode; state.trace=v1.trace??state.trace; state.showValues=v1.showValues??state.showValues;
      state.lastPreset=v1.lastPreset||state.lastPreset;
      state.scale="year"; state.N=12; state.labels=MONTHS.slice(); state.axisUnit="月";
      state.T=state.byScale.year.T.slice(); state.P=state.byScale.year.P.slice(); state.sel=state.byScale.year.sel;
    }
  }catch(e){}
}

/* ---------- touch editing ---------- */
const wrap=document.getElementById("chart");
let drag=null;
function local(e){
  const svg=wrap.querySelector("svg"); if(!svg) return null;
  const r=svg.getBoundingClientRect();
  const sc=Math.min(r.width/W,r.height/H);
  return {x:(e.clientX-r.left-(r.width-W*sc)/2)/sc, y:(e.clientY-r.top-(r.height-H*sc)/2)/sc};
}
function apply(kind,i,y){
  if(kind==="temp") state.T[i]=Math.round(clamp(tFromY(y),state.tMin,state.tMax)*10)/10;
  else state.P[i]=Math.round(clamp(pFromY(y),0,state.pMax)*10)/10;
}
wrap.addEventListener("pointerdown",e=>{
  if(drag) return;
  const p=local(e); if(!p) return;
  if(p.x<PL-24||p.x>PR+24||p.y<PT-40||p.y>PB+46) return;
  const i=clamp(Math.floor((p.x-PL)/CW()),0,state.N-1);
  let kind=state.mode;
  if(kind==="auto"){
    const dT=Math.hypot(p.x-xc(i),p.y-clamp(yT(state.T[i]),PT,PB));
    const barTop=yP(clamp(state.P[i],0,state.pMax));
    const dP=(p.y>=barTop&&p.y<=PB)?0:Math.abs(p.y-barTop);
    kind=(dT<=34||dT<dP)?"temp":"prec";
  }
  push(); state.sel=i; drag={kind,last:i};
  apply(kind,i,p.y); render();
  wrap.setPointerCapture(e.pointerId); e.preventDefault();
},{passive:false});
wrap.addEventListener("pointermove",e=>{
  if(!drag) return;
  const p=local(e); if(!p) return;
  const i=clamp(Math.floor((p.x-PL)/CW()),0,state.N-1);
  if(state.trace&&i!==drag.last){
    const step=i>drag.last?1:-1;
    for(let j=drag.last+step;j!==i+step;j+=step) apply(drag.kind,j,p.y);
    drag.last=i; state.sel=i;
  }else{
    apply(drag.kind,drag.last,p.y);
  }
  render(); e.preventDefault();
},{passive:false});
const endDrag=()=>{ if(drag){drag=null; buildTable(); render();} };
wrap.addEventListener("pointerup",endDrag);
wrap.addEventListener("pointercancel",endDrag);

/* ---------- controls ---------- */
const $=id=>document.getElementById(id);
$("preset").innerHTML=`<option value="">— 地点をえらぶ —</option>`+Object.keys(PRESETS).map(k=>`<option>${k}</option>`).join("");
function loadPreset(k){
  const d=PRESETS[k]; if(!d) return;
  push(); state.name=k; state.T=d.T.slice(); state.P=d.P.slice();
  state.hemi=d.h; state.pMax=d.pMax; state.lastPreset=k;
  state.tMin=Math.min(...d.T)<-25?-40:-30; state.tMax=30;
  state.scale="year"; state.N=12; state.labels=MONTHS.slice(); state.axisUnit="月"; state.monthOf=0;
  state.byScale={month:{}};
  syncInputs(); buildTable(); render();
}
$("preset").addEventListener("change",e=>{ if(e.target.value){loadPreset(e.target.value); e.target.value="";} });
$("name").addEventListener("input",e=>{state.name=e.target.value;render();});
$("hemi").addEventListener("change",e=>{state.hemi=e.target.value;render();});
$("pMax").addEventListener("change",e=>{state.pMax=+e.target.value;render();});
$("tRange").addEventListener("change",e=>{const[a,b]=e.target.value.split(",").map(Number);state.tMin=a;state.tMax=b;render();});
$("mode").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;state.mode=b.dataset.mode;syncInputs();});
$("tgTrace").addEventListener("click",()=>{state.trace=!state.trace;syncInputs();});
$("tgVals").addEventListener("click",()=>{state.showValues=!state.showValues;syncInputs();render();});
$("mPrev").addEventListener("click",()=>{state.sel=(state.sel+state.N-1)%state.N;render();});
$("mNext").addEventListener("click",()=>{state.sel=(state.sel+1)%state.N;render();});
document.querySelectorAll("[data-adj]").forEach(b=>b.addEventListener("click",()=>{
  push(); const d=+b.dataset.d;
  if(b.dataset.adj==="t") state.T[state.sel]=Math.round(clamp(state.T[state.sel]+d,-60,60)*10)/10;
  else state.P[state.sel]=Math.round(clamp(state.P[state.sel]+d,0,3000)*10)/10;
  buildTable(); render();
}));
$("scaleSeg").addEventListener("click",e=>{
  const b=e.target.closest("button"); if(!b) return;
  switchScale(b.dataset.scale); syncInputs(); buildTable(); render();
});
$("moPrev").addEventListener("click",()=>{ switchScale("month",(state.monthOf+11)%12); syncInputs(); buildTable(); render(); });
$("moNext").addEventListener("click",()=>{ switchScale("month",(state.monthOf+1)%12); syncInputs(); buildTable(); render(); });
$("autoScale").addEventListener("click",()=>{
  const [tMin,tMax]=computeTRange(state.T);
  state.pMax=computePMax(state.P); state.tMin=tMin; state.tMax=tMax;
  syncInputs(); render();
});
$("undo").addEventListener("click",()=>{ const h=history.pop(); if(!h)return; Object.assign(state,h); syncInputs(); buildTable(); render(); });
$("blank").addEventListener("click",()=>{ push(); state.T=Array(state.N).fill(0); state.P=Array(state.N).fill(0); state.name="　"; syncInputs(); buildTable(); render(); });
$("reset").addEventListener("click",()=>loadPreset(state.lastPreset));
document.addEventListener("input",e=>{
  const t=e.target; if(!t.matches("table.grid input")) return;
  const i=+t.dataset.i, v=parseFloat(t.value);
  if(Number.isNaN(v)) return;
  if(t.dataset.k==="T") state.T[i]=Math.round(clamp(v,-70,60)*10)/10; else state.P[i]=Math.round(clamp(v,0,3000)*10)/10;
  state.sel=i; render();
});
document.addEventListener("focusin",e=>{ if(e.target.matches("table.grid input")) push(); });

function exportSvgToPng(svg){
  const img=new Image(); const sc=2;
  img.onload=()=>{
    const c=document.createElement("canvas"); c.width=W*sc; c.height=H*sc;
    const g=c.getContext("2d"); g.fillStyle="#fbfcfa"; g.fillRect(0,0,c.width,c.height);
    g.drawImage(img,0,0,c.width,c.height);
    try{ $("pngImg").src=c.toDataURL("image/png"); $("modal").hidden=false; }
    catch(err){ alert("画像を作れませんでした。"); }
  };
  img.onerror=()=>alert("画像を作れませんでした。");
  img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
}
$("png").addEventListener("click",()=>exportSvgToPng(svgMarkup(true)));
$("closeModal").addEventListener("click",()=>{$("modal").hidden=true;});
$("modal").addEventListener("click",e=>{ if(e.target.id==="modal") $("modal").hidden=true; });

function syncInputs(){
  $("name").value=state.name.trim();
  $("hemi").value=state.hemi;
  $("pMax").value=String(state.pMax);
  const tv=`${state.tMin},${state.tMax}`;
  $("tRange").value=[...$("tRange").options].some(o=>o.value===tv)?tv:$("tRange").value;
  document.querySelectorAll("#mode button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===state.mode)));
  $("tgTrace").setAttribute("aria-pressed",String(state.trace));
  $("tgVals").setAttribute("aria-pressed",String(state.showValues));
  document.querySelectorAll("#scaleSeg button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.scale===state.scale)));
  $("monthOfNav").hidden=state.scale!=="month";
  if(state.scale==="month") $("moLabel").textContent=`${MONTHS[state.monthOf]}（${DAYS_IN_MONTH[state.monthOf]}日）`;
}

/* ---------- 🔍モード: 日本 ---------- */
const JP_REGIONS=["北海道","東北","関東","中部","近畿","中国","四国","九州・沖縄"];
const explore={sel:[]}; // 選ばれた都道府県名。0番目=A(赤系)・1番目=B(青緑系)

// 地図描画はここだけ差し替えれば良いように分離してある（タイル地図等への変更にも対応できる）
function renderMap(){
  const host=document.getElementById("jpmap");
  if(!JAPAN_MAP){ host.innerHTML="<p>地図データがありません</p>"; return; }
  const [vx,vy,vw,vh]=JAPAN_MAP.viewBox;
  const o=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" role="img" aria-label="日本地図">`];
  for(const p of JAPAN_MAP.prefectures){
    const idx=explore.sel.indexOf(p.name);
    const cls=idx===0?"selA":idx===1?"selB":"";
    o.push(`<path class="pref-path ${cls}" data-pref="${esc(p.name)}" d="${p.d}"><title>${esc(p.name)}</title></path>`);
  }
  o.push("</svg>");
  host.innerHTML=o.join("");
}
function buildPrefGroups(){
  if(!JAPAN_CLIMATE){ document.getElementById("prefGroups").innerHTML=""; return; }
  const byRegion={};
  JAPAN_CLIMATE.forEach(c=>{ (byRegion[c.region]=byRegion[c.region]||[]).push(c); });
  document.getElementById("prefGroups").innerHTML=JP_REGIONS.map(region=>{
    const list=byRegion[region]||[];
    const btns=list.map(c=>`<button class="prefbtn" type="button" data-pref="${esc(c.pref)}">${esc(c.pref)}</button>`).join("");
    return `<div class="card"><h2>${esc(region)}</h2><div class="prefgrid">${btns}</div></div>`;
  }).join("");
}
function toggleJpSelect(pref){
  const i=explore.sel.indexOf(pref);
  if(i>=0) explore.sel.splice(i,1);
  else{ if(explore.sel.length>=2) explore.sel.shift(); explore.sel.push(pref); }
  syncJpSelectUI();
}
function syncJpSelectUI(){
  renderMap();
  document.querySelectorAll(".prefbtn").forEach(b=>{
    const idx=explore.sel.indexOf(b.dataset.pref);
    b.classList.toggle("selA",idx===0);
    b.classList.toggle("selB",idx===1);
  });
  const chips=explore.sel.map((pref,i)=>
    `<span class="chip ${i===0?'a':'b'}"><span class="dot"></span>${esc(pref)}<span class="x" data-removepref="${esc(pref)}" role="button" aria-label="${esc(pref)}をはずす">×</span></span>`
  ).join("");
  document.getElementById("selectedChips").innerHTML=chips||`<span class="chipempty">とどうふけんを1〜2つ えらんでください</span>`;
  $("jpDecide").disabled=explore.sel.length===0;
}
document.getElementById("jpmap").addEventListener("click",e=>{
  const el=e.target.closest(".pref-path"); if(!el) return;
  toggleJpSelect(el.dataset.pref);
});
document.getElementById("prefGroups").addEventListener("click",e=>{
  const b=e.target.closest(".prefbtn"); if(!b) return;
  toggleJpSelect(b.dataset.pref);
});
document.getElementById("selectedChips").addEventListener("click",e=>{
  const x=e.target.closest("[data-removepref]"); if(!x) return;
  toggleJpSelect(x.dataset.removepref);
});

const EXPLORE_COLOR={aT:"#c9432c",aP:"#2b6ca3",bT:"#8b3fc9",bP:"#2f9e5c"};
function exploreSvgMarkup(locs,forExport){
  const allT=locs.flatMap(l=>l.T), allP=locs.flatMap(l=>l.P);
  const [tMin,tMax]=computeTRange(allT), pMax=computePMax(allP);
  const tStep=10, pStep=pMax/6;
  const cw=(PR-PL)/12;
  const xc=i=>PL+(i+0.5)*cw;
  const yT=t=>PB-(t-tMin)/(tMax-tMin)*PH;
  const yP=p=>PB-(p/pMax)*PH;
  const o=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="雨温図（${esc(locs.map(l=>l.city).join("と"))}の比較）">`];
  o.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#fbfcfa"/>`);

  if(locs.length===1){
    const d=derive(locs[0].T,locs[0].P), k=koppen(locs[0].T,locs[0].P,locs[0].hemi);
    o.push(`<text x="${PL}" y="48" font-family="${F}" font-size="30" font-weight="700" fill="#1e242a">${esc(locs[0].city)}</text>`);
    o.push(`<text x="${PL}" y="74" font-family="${FM}" font-size="14.5" fill="#66737c">年平均気温 ${d.Tann.toFixed(1)}℃ ／ 年降水量 ${d.Pann.toFixed(1)}mm ／ 気温年較差 ${d.range.toFixed(1)}℃</text>`);
    o.push(`<text x="${PR}" y="44" text-anchor="end" font-family="${FM}" font-size="27" font-weight="600" fill="#2b6ca3">${esc(k.code)}</text>`);
    o.push(`<text x="${PR}" y="70" text-anchor="end" font-family="${F}" font-size="14.5" fill="#66737c">${esc(k.name)}・${locs[0].hemi==="N"?"北半球":"南半球"}</text>`);
  }else{
    o.push(`<text x="${PL}" y="42" font-family="${F}" font-size="23" font-weight="700" fill="${EXPLORE_COLOR.aT}">${esc(locs[0].city)}</text>`);
    o.push(`<text x="${PL}" y="72" font-family="${F}" font-size="23" font-weight="700" fill="${EXPLORE_COLOR.bT}">${esc(locs[1].city)}</text>`);
  }

  for(let i=1;i<12;i++) o.push(`<line x1="${(PL+i*cw).toFixed(1)}" y1="${PT}" x2="${(PL+i*cw).toFixed(1)}" y2="${PB}" stroke="#e4eae7" stroke-width="1"/>`);
  for(let t=tMin;t<=tMax+.001;t+=tStep){
    const y=yT(t), zero=Math.abs(t)<.001;
    o.push(`<line x1="${PL}" y1="${y.toFixed(1)}" x2="${PR}" y2="${y.toFixed(1)}" stroke="${zero?"#b3bfc4":"#ccd6d2"}" stroke-width="${zero?1.6:1}"${zero?"":' stroke-dasharray="1 0"'}/>`);
    o.push(`<text x="${PL-14}" y="${(y+5).toFixed(1)}" text-anchor="end" font-family="${FM}" font-size="15" fill="#c9432c">${t}</text>`);
  }
  for(let p=0;p<=pMax+.001;p+=pStep){
    const y=yP(p);
    o.push(`<line x1="${PR}" y1="${y.toFixed(1)}" x2="${PR+8}" y2="${y.toFixed(1)}" stroke="#9fb3bd" stroke-width="1.4"/>`);
    o.push(`<text x="${PR+15}" y="${(y+5).toFixed(1)}" font-family="${FM}" font-size="15" fill="#2b6ca3">${Math.round(p)}</text>`);
  }
  o.push(`<rect x="${PL}" y="${PT}" width="${PR-PL}" height="${PH}" fill="none" stroke="#9fb3bd" stroke-width="1.6"/>`);

  const bw=locs.length===1?Math.min(42,cw*0.66):Math.min(20,cw*0.32);
  locs.forEach((loc,li)=>{
    const barColor=li===0?EXPLORE_COLOR.aP:EXPLORE_COLOR.bP;
    for(let i=0;i<12;i++){
      const v=clamp(loc.P[i],0,pMax), over=loc.P[i]>pMax;
      const y=yP(v), h=Math.max(0,PB-y);
      const x=locs.length===1?xc(i)-bw/2:(li===0?xc(i)-bw-1:xc(i)+1);
      if(h>0.4){
        o.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" fill="${barColor}" opacity="0.86"/>`);
      }
      if(over) o.push(`<path d="M${x.toFixed(1)} ${PT+9} l${bw/4} -7 l${bw/4} 7 l${bw/4} -7 l${bw/4} 7" fill="none" stroke="#fbfcfa" stroke-width="3"/>`);
    }
  });

  locs.forEach((loc,li)=>{
    const lineColor=li===0?EXPLORE_COLOR.aT:EXPLORE_COLOR.bT;
    const pts=loc.T.map((t,i)=>`${xc(i).toFixed(1)},${clamp(yT(t),PT-40,PB+40).toFixed(1)}`).join(" ");
    o.push(`<polyline points="${pts}" fill="none" stroke="${lineColor}" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"${li===1?' stroke-dasharray="8 5"':""}/>`);
    for(let i=0;i<12;i++){
      const y=clamp(yT(loc.T[i]),PT-40,PB+40);
      if(li===0) o.push(`<circle cx="${xc(i).toFixed(1)}" cy="${y.toFixed(1)}" r="7.5" fill="#fbfcfa" stroke="${lineColor}" stroke-width="3"/>`);
      else o.push(`<rect x="${(xc(i)-6.5).toFixed(1)}" y="${(y-6.5).toFixed(1)}" width="13" height="13" fill="#fbfcfa" stroke="${lineColor}" stroke-width="3"/>`);
    }
  });

  for(let i=0;i<12;i++){
    o.push(`<text x="${xc(i).toFixed(1)}" y="${PB+30}" text-anchor="middle" font-family="${F}" font-size="16" font-weight="400" fill="#66737c">${i+1}</text>`);
  }
  o.push(`<text x="${PL-14}" y="${PB+30}" text-anchor="end" font-family="${F}" font-size="13" fill="#8896a0">月</text>`);
  o.push(`<text transform="translate(28,${(PT+PH/2).toFixed(1)}) rotate(-90)" text-anchor="middle" font-family="${F}" font-size="15" font-weight="500" fill="#c9432c">気温 (℃)</text>`);
  o.push(`<text transform="translate(${W-22},${(PT+PH/2).toFixed(1)}) rotate(90)" text-anchor="middle" font-family="${F}" font-size="15" font-weight="500" fill="#2b6ca3">降水量 (mm)</text>`);

  if(locs.length===1){
    const ly=PB+64;
    o.push(`<line x1="${PL}" y1="${ly-5}" x2="${PL+26}" y2="${ly-5}" stroke="#c9432c" stroke-width="3.6"/><circle cx="${PL+13}" cy="${ly-5}" r="6.5" fill="#fbfcfa" stroke="#c9432c" stroke-width="3"/>`);
    o.push(`<text x="${PL+34}" y="${ly}" font-family="${F}" font-size="14" fill="#525f68">気温</text>`);
    o.push(`<rect x="${PL+90}" y="${ly-14}" width="20" height="16" fill="#2b6ca3" opacity="0.86"/>`);
    o.push(`<text x="${PL+118}" y="${ly}" font-family="${F}" font-size="14" fill="#525f68">降水量</text>`);
  }else{
    [0,1].forEach(li=>{
      const ly=PB+58+li*24, tCol=li===0?EXPLORE_COLOR.aT:EXPLORE_COLOR.bT, pCol=li===0?EXPLORE_COLOR.aP:EXPLORE_COLOR.bP;
      if(li===0) o.push(`<line x1="${PL}" y1="${ly-5}" x2="${PL+26}" y2="${ly-5}" stroke="${tCol}" stroke-width="3.4"/><circle cx="${PL+13}" cy="${ly-5}" r="6" fill="#fbfcfa" stroke="${tCol}" stroke-width="2.6"/>`);
      else o.push(`<line x1="${PL}" y1="${ly-5}" x2="${PL+26}" y2="${ly-5}" stroke="${tCol}" stroke-width="3.4" stroke-dasharray="6 4"/><rect x="${PL+8}" y="${ly-11}" width="11" height="11" fill="#fbfcfa" stroke="${tCol}" stroke-width="2.6"/>`);
      o.push(`<text x="${PL+34}" y="${ly}" font-family="${F}" font-size="13" fill="#525f68">${esc(locs[li].city)} 気温</text>`);
      o.push(`<rect x="${PL+150}" y="${ly-13}" width="18" height="14" fill="${pCol}" opacity="0.86"/>`);
      o.push(`<text x="${PL+176}" y="${ly}" font-family="${F}" font-size="13" fill="#525f68">${esc(locs[li].city)} 降水量</text>`);
    });
  }
  o.push(`<text x="${PR}" y="${H-14}" text-anchor="end" font-family="${F}" font-size="11" fill="#8896a0">${esc(locs[0].source)}</text>`);
  o.push("</svg>");
  return o.join("");
}
function renderExploreStats(locs){
  const cols=locs.map((l,i)=>{
    const d=derive(l.T,l.P);
    const su=summerIdx(l.hemi), Psu=su.reduce((a,idx)=>a+l.P[idx],0);
    const ratio=d.Pann>0?Math.round(Psu/d.Pann*100):0;
    const rows=[["年平均気温",d.Tann.toFixed(1),"℃"],["年降水量",d.Pann.toFixed(1),"mm"],
      ["最暖月",`${d.hotM+1}月 ${d.Tmax.toFixed(1)}`,"℃"],["最寒月",`${d.coldM+1}月 ${d.Tmin.toFixed(1)}`,"℃"],
      ["気温年較差",d.range.toFixed(1),"℃"],["夏半年の降水",ratio,"%"]];
    return `<div class="col ${i===0?'a':'b'}"><h3>${esc(l.city)}</h3><dl>${rows.map(([a,b,c])=>`<div><dt>${a}</dt><dd class="mono">${b}<small>${c}</small></dd></div>`).join("")}</dl></div>`;
  }).join("");
  const el=document.getElementById("exploreStats");
  el.innerHTML=cols; el.classList.toggle("single",locs.length===1);
}
function renderExploreVerdict(locs){
  const cols=locs.map((l,i)=>{
    const k=koppen(l.T,l.P,l.hemi);
    return `<div class="col ${i===0?'a':'b'}"><div class="code">${esc(k.code)}</div><div class="jp">${esc(k.name)}</div><div class="why">${k.why.map(w=>"・"+w).join("<br>")}</div></div>`;
  }).join("");
  const el=document.getElementById("exploreVerdict");
  el.innerHTML=cols; el.classList.toggle("single",locs.length===1);
}
function currentJpLocs(){ return explore.sel.map(pref=>JAPAN_CLIMATE.find(c=>c.pref===pref)).filter(Boolean); }
function renderExploreResult(){
  const locs=currentJpLocs();
  document.getElementById("exploreChart").innerHTML=exploreSvgMarkup(locs,false);
  renderExploreStats(locs);
  renderExploreVerdict(locs);
}
$("explorePng").addEventListener("click",()=>exportSvgToPng(exploreSvgMarkup(currentJpLocs(),true)));

/* ---------- screens ---------- */
const SCREENS=["home","draw","explore","jp-select","jp-result","world-select"];
function showScreen(name){
  for(const s of SCREENS) document.getElementById("screen-"+s).hidden=(s!==name);
}
$("goDraw").addEventListener("click",()=>showScreen("draw"));
$("goExplore").addEventListener("click",()=>showScreen("explore"));
document.querySelectorAll("[data-home]").forEach(b=>b.addEventListener("click",()=>showScreen("home")));
$("goJapan").addEventListener("click",()=>{
  buildPrefGroups(); syncJpSelectUI();
  showScreen("jp-select");
});
$("goWorld").addEventListener("click",()=>showScreen("world-select"));
$("jpDecide").addEventListener("click",()=>{
  if(explore.sel.length===0) return;
  renderExploreResult();
  showScreen("jp-result");
});
$("backToJpSelect").addEventListener("click",()=>showScreen("jp-select"));

load(); syncInputs(); buildTable(); render();
showScreen("home");
