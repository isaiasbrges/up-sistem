/* Gráficos UP: SVG responsivo, dados acessíveis e movimento reduzido. */
(function(root){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=v=>Number.isFinite(Number(v))?Number(v):0;
 const fmt=v=>number(v).toLocaleString('pt-BR',{maximumFractionDigits:1});
 const brl=v=>number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
 const colors=['primary','highlight','ink'];
 const legend=series=>`<div class="chart-legend">${series.map((s,i)=>`<span><i class="legend-dot series-${colors[i%3]}"></i>${esc(s.name)}</span>`).join('')}</div>`;
 function ring(value,label='Média do Radar'){
  const v=Math.max(0,Math.min(10,number(value)));
  return `<div class="up-chart animated-ring" role="img" aria-label="${esc(label)}: ${fmt(v)} de 10"><svg viewBox="0 0 160 160" aria-hidden="true"><circle class="ring-track" cx="80" cy="80" r="68"/><circle class="ring-value" cx="80" cy="80" r="68" pathLength="100" style="--ring-offset:${100-v*10}"/></svg><div class="ring-label"><strong>${fmt(v)}</strong><span>${esc(label)}</span><small>de 10 pontos</small></div></div>`;
 }
 function radar(items,label='Roda da Plenitude'){
  const cx=180,cy=158,r=103,n=items.length;
  if(n<3)return '';
  const point=(i,scale=1)=>{const a=-Math.PI/2+i*2*Math.PI/n;return [cx+Math.cos(a)*r*scale,cy+Math.sin(a)*r*scale];};
  const pts=scale=>items.map((_,i)=>point(i,scale).join(',')).join(' ');
  const na=x=>x.value===null||x.value===undefined||x.value==='';
  const values=items.map((x,i)=>na(x)?null:point(i,Math.max(0,Math.min(10,number(x.value)))/10).join(',')).filter(Boolean).join(' ');
  const min=Math.min(...items.filter(x=>!na(x)).map(x=>number(x.value)));
  return `<figure class="up-chart radar-chart"><svg viewBox="0 0 360 320" role="img" aria-label="${esc(label)}">${[.2,.4,.6,.8,1].map(s=>`<polygon class="radar-grid" points="${pts(s)}"/>`).join('')}${items.map((_,i)=>`<line class="radar-axis" x1="${cx}" y1="${cy}" x2="${point(i)[0]}" y2="${point(i)[1]}"/>`).join('')}<polygon class="radar-shape" points="${values}"/>${items.map((x,i)=>{const [px,py]=point(i,Math.max(0,Math.min(10,number(x.value)))/10),[tx,ty]=point(i,1.34);const words=String(x.short||x.name).split('|');return `${na(x)?'':`<circle class="radar-point ${number(x.value)===min?'attention':''}" cx="${px}" cy="${py}" r="4" style="--delay:${350+i*45}ms" tabindex="0"><title>${esc(x.name)}: ${fmt(x.value)} de 10</title></circle>`}<text class="radar-label" x="${tx}" y="${ty-5}" text-anchor="${tx<cx-15?'end':tx>cx+15?'start':'middle'}">${words.map((w,j)=>`<tspan x="${tx}" dy="${j?12:0}">${esc(w)}</tspan>`).join('')}<tspan class="radar-score${na(x)?' radar-na':''}" x="${tx}" dy="15">${na(x)?'N/A':fmt(x.value)}</tspan></text>`;}).join('')}</svg><figcaption>${esc(label)} · notas de 0 a 10</figcaption></figure>`;
 }
 function gauge(value){
  const v=Math.max(0,Math.min(10,number(value))),angle=Math.PI-v/10*Math.PI;
  const x=140+112*Math.cos(angle),y=144-112*Math.sin(angle);
  return `<figure class="up-chart overview-gauge" role="img" aria-label="Média da Roda: ${fmt(v)} de 10"><svg viewBox="0 0 280 180" aria-hidden="true"><path class="gauge-track" d="M28 144 A112 112 0 0 1 252 144"/><path class="gauge-value" d="M28 144 A112 112 0 0 1 252 144" pathLength="100" style="--gauge-offset:${100-v*10}"/><circle class="gauge-marker" cx="${x}" cy="${y}" r="8"/></svg><div class="gauge-caption"><strong>${fmt(v)}<small>/10</small></strong><span>Média das oito dimensões</span></div></figure>`;
 }
 function plot(rows,{bars=false,compact=false,profit=true}={}){
  if(!rows.length)return '<div class="chart-empty">Seus próximos registros vão aparecer aqui.</div>';
  const series=[{name:'Faturamento',key:'revenue'},{name:'Saídas',key:'expenses'}];if(bars&&profit)series.push({name:'Resultado operacional',key:'profit'});
  const W=680,H=compact?215:260,left=62,right=20,top=22,bottom=38,pw=W-left-right,ph=H-top-bottom;
  const vals=rows.flatMap(row=>series.map(s=>number(row[s.key]))),max=Math.max(1,...vals),min=Math.min(0,...vals),range=max-min||1;
  const y=v=>top+(max-number(v))/range*ph,x=i=>left+(rows.length===1?pw/2:i*pw/(rows.length-1));
  const grid=Array.from({length:4},(_,i)=>{const value=max-range*i/3;return `<line class="chart-gridline" x1="${left}" x2="${W-right}" y1="${y(value)}" y2="${y(value)}"/><text class="chart-axis-label" x="${left-10}" y="${y(value)+4}" text-anchor="end">${Math.abs(value)>=1000?fmt(value/1000)+' mil':fmt(value)}</text>`;}).join('');
  let marks='';
  if(bars){const band=pw/rows.length,bw=Math.min(22,band*.2);marks=rows.map((row,i)=>series.map((s,j)=>{const v=number(row[s.key]),zero=y(0),height=Math.max(1,Math.abs(y(v)-zero));return `<rect class="chart-bar series-${colors[j]}" x="${left+band*(i+.5)+(j-(series.length-1)/2)*bw-bw/2}" y="${Math.min(zero,y(v))}" width="${bw-3}" height="${height}" rx="8" style="--delay:${Math.min(500,i*65)+j*40}ms;--bar-origin:${v<0?'top':'bottom'}" tabindex="0"><title>${esc(row.label)} · ${s.name}: ${brl(v)}</title></rect>`;}).join('')).join('');}
  else marks=series.map((s,j)=>{const points=rows.map((row,i)=>`${x(i)},${y(row[s.key])}`).join(' ');return `<polyline class="chart-line series-${colors[j]}" points="${points}" pathLength="1" style="--delay:${j*140}ms"/>${rows.map((row,i)=>`<circle class="chart-point series-${colors[j]}" cx="${x(i)}" cy="${y(row[s.key])}" r="4" style="--delay:${200+Math.round(i/Math.max(1,rows.length-1)*650)+j*140}ms" tabindex="0"><title>${esc(row.label)} · ${s.name}: ${brl(row[s.key])}</title></circle>`).join('')}`;}).join('');
  return `<figure class="up-chart ${compact?'compact-chart':''}">${legend(series)}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${bars?'Comparação mensal de faturamento, saídas e resultado operacional':'Evolução do faturamento e das saídas'}">${grid}<line class="chart-zero" x1="${left}" x2="${W-right}" y1="${y(0)}" y2="${y(0)}"/>${marks}${rows.map((row,i)=>`<text class="chart-axis-label" x="${bars?left+pw/rows.length*(i+.5):x(i)}" y="${H-12}" text-anchor="middle">${esc(row.label)}</text>`).join('')}</svg><figcaption>Valores em reais · passe sobre os pontos para consultar</figcaption><details class="chart-data"><summary>Ver dados do gráfico</summary><div class="table-scroll"><table class="table"><caption>Valores por mês em reais</caption><thead><tr><th>Mês</th>${series.map(s=>`<th>${s.name}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr><th>${esc(row.label)}</th>${series.map(s=>`<td>${brl(row[s.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details></figure>`;
 }
 function donut(items,label='Distribuição dos diagnósticos'){
  const total=items.reduce((sum,item)=>sum+Math.max(0,number(item.value)),0);
  if(!total)return '<div class="chart-empty">Nenhum diagnóstico registrado ainda.</div>';
  let offset=0;
  return `<figure class="up-chart donut-chart"><div class="donut-layout"><div class="donut-visual"><svg viewBox="0 0 160 160" role="img" aria-label="${esc(label)}"><circle class="ring-track" cx="80" cy="80" r="62"/>${items.map((item,i)=>{const pct=Math.max(0,number(item.value))/total*100,start=offset;offset+=pct;return `<circle class="donut-segment series-${colors[i%3]}" cx="80" cy="80" r="62" pathLength="100" stroke-dasharray="${pct} ${100-pct}" stroke-dashoffset="${-start}" style="--donut-dashes:${pct} ${100-pct};--delay:${Math.min(i*120,480)}ms" tabindex="0"><title>${esc(item.name)}: ${fmt(item.value)} diagnóstico(s)</title></circle>`;}).join('')}</svg><span><strong>${fmt(total)}</strong><small>diagnósticos</small></span></div><ul>${items.map((item,i)=>`<li><i class="legend-dot series-${colors[i%3]}"></i><span>${esc(item.name)}</span><b>${fmt(item.value)}</b></li>`).join('')}</ul></div><figcaption>${esc(label)} · dados desta demonstração</figcaption></figure>`;
 }
 let observer;
 const pending=new Set();
 function reveal(el){el.classList.add('is-visible');observer?.unobserve(el);pending.delete(el);}
 function hydrate(scope){
  for(const el of pending)if(el.isConnected===false){observer?.unobserve(el);pending.delete(el);}
  const nodes=(scope||document).querySelectorAll('.up-chart:not(.is-visible)');
  const reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  for(const el of nodes){
   el.setAttribute('data-chart-ready','true');
   if(reduced||!root.IntersectionObserver){reveal(el);continue;}
   observer=observer||new root.IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)reveal(entry.target);},{threshold:.08});
   if(!pending.has(el)){pending.add(el);observer.observe(el);}
  }
 }
 const api={ring,radar,gauge,plot,donut,hydrate};root.UPCharts=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
