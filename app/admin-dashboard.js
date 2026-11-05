/* Indicadores administrativos derivados exclusivamente dos contratos existentes. */
(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={front:'Diagnóstico e Raio-X',essencial:'Kit Essencial',kit:'Kit UP Completo'};
const icon=(name,size=22)=>window.UP?.icon(name,size)||'';
const count=v=>Math.max(0,Number(v)||0).toLocaleString('pt-BR');
const day=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
function series(students,period=30,now=new Date()){
 const end=day(now),anchor=new Date(end+'T12:00:00Z'),days=Math.max(1,Math.min(90,Number(period)||30));
 const rows=Array.from({length:days},(_,i)=>{const date=new Date(anchor);date.setUTCDate(date.getUTCDate()-(days-1-i));return {date:date.toISOString().slice(0,10),count:0};});
 const byDate=new Map(rows.map(r=>[r.date,r]));
 for(const student of students||[]){if(!student.created_at||!Number.isFinite(new Date(student.created_at).getTime()))continue;const row=byDate.get(day(student.created_at));if(row)row.count++;}
 return rows;
}
function empty(title,description,ic='chart-bar'){return `<div class="staff-empty">${icon(ic,32)}<strong>${title}</strong><span>${description}</span></div>`;}
function panel(title,body,extra='',cls=''){return `<section class="staff-card ${cls}"><div class="staff-card-heading"><h2>${title}</h2>${extra}</div>${body}</section>`;}
function plot(data,period){
 if(data.studentsAvailable===false)return empty('Não foi possível carregar os cadastros','Atualize a visão geral para tentar novamente.');
 const rows=series(data.recentStudents,period),total=rows.reduce((n,r)=>n+r.count,0);
 const filter=`<label class="staff-period"><span class="screen-reader">Período dos cadastros</span><select data-staff-period aria-label="Período dos cadastros">${[7,30,90].map(p=>`<option value="${p}" ${p===period?'selected':''}>Últimos ${p} dias</option>`).join('')}</select></label>`;
 const W=680,H=235,left=35,right=18,top=18,bottom=38,max=Math.max(2,Math.ceil(Math.max(0,...rows.map(r=>r.count))/2)*2),height=H-top-bottom,width=W-left-right;
 const point=(r,i)=>[left+i*width/Math.max(1,rows.length-1),top+height-r.count/max*height];
 const points=rows.map(point),path=points.map(([x,y],i)=>(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)).join(' ');
 const grid=[0,.5,1].map(n=>`<line x1="${left}" x2="${W-right}" y1="${top+height*n}" y2="${top+height*n}"/><text x="${left-10}" y="${top+height*n+4}" text-anchor="end">${count(max*(1-n))}</text>`).join('');
 const ticks=[...new Set([0,Math.floor((rows.length-1)/4),Math.floor((rows.length-1)/2),Math.floor((rows.length-1)*.75),rows.length-1])].map(i=>`<text x="${points[i][0]}" y="${H-10}" text-anchor="${i===0?'start':i===rows.length-1?'end':'middle'}">${rows[i].date.slice(8)}/${rows[i].date.slice(5,7)}</text>`).join('');
 const marks=total?`<path class="staff-chart-area" d="${path} L${points.at(-1)[0]} ${top+height} L${left} ${top+height} Z"/><path class="staff-chart-line" d="${path}"/>${rows.filter(r=>r.count).map(r=>{const i=rows.indexOf(r),[x,y]=points[i];return `<circle cx="${x}" cy="${y}" r="4" tabindex="0"><title>${r.date}: ${r.count} cadastro(s)</title></circle>`;}).join('')}`:'';
 const chart=`<div class="staff-chart-wrap"><svg class="staff-line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${total} cadastros nos últimos ${period} dias"><g class="staff-chart-grid">${grid}${ticks}</g>${marks}</svg>${!total?'<div class="staff-chart-empty"><strong>Nenhum cadastro neste período</strong><span>Os novos alunos aparecerão aqui.</span></div>':''}</div>`;
 return panel(icon('chart-bar',21)+'Cadastros de alunos',`<div class="staff-chart-summary"><strong>${count(total)}</strong><span>novo${total===1?' aluno':'s alunos'} no período</span></div>${chart}<p class="staff-caption">${data.studentsPartial?'Carregamento limitado a 2.000 cadastros recentes. ':''}Cadastros por dia · Horário de Brasília</p><details class="staff-chart-data"><summary>Ver dados do gráfico</summary><div class="table-scroll"><table class="table"><thead><tr><th>Data</th><th>Novos alunos</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.date.split('-').reverse().join('/')}</td><td>${r.count}</td></tr>`).join('')}</tbody></table></div></details>`,filter,'staff-evolution');
}
function activity(data){
 const entries=[...(data.recentStudents||[]).map(s=>({at:s.created_at,title:'Novo aluno cadastrado',detail:s.name||s.email,ic:'user',tone:'success',tab:'students'})),...(data.recentEvents||[]).map(e=>({at:e.received_at,title:e.status==='review'?'Evento em revisão':e.status==='failed'?'Falha no evento':({order_approved:'Compra aprovada recebida',order_refunded:'Reembolso recebido',chargeback:'Chargeback recebido'}[e.event_type]||'Evento recebido (Kiwify)'),detail:'Pedido '+e.order_id,ic:e.status==='review'?'clock':e.status==='failed'?'triangle-alert':'layers',tone:e.status==='review'||e.status==='failed'?'attention':'info',tab:'events'}))].sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,5);
 return entries.length?`<div class="staff-activities">${entries.map(e=>`<button type="button" data-staff-nav="${e.tab}" class="staff-activity"><span class="staff-activity-icon ${e.tone}">${icon(e.ic,20)}</span><span class="staff-activity-copy"><strong>${esc(e.title)}</strong><small>${esc(e.detail)}</small></span><time datetime="${esc(e.at)}">${new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(e.at))}</time></button>`).join('')}</div>`:empty('Nenhuma atividade registrada','Cadastros e eventos recebidos aparecerão aqui.','history');
}
function distribution(data){
 const rows=Object.entries(names).map(([key,name])=>({key,name,value:Number(data.accesses?.find(a=>a.product_code===key)?.users||0)})),total=rows.reduce((n,r)=>n+r.value,0),stops=[];let offset=0;
 rows.forEach((r,i)=>{const start=offset;offset+=total?r.value/total*100:0;stops.push(`var(--staff-series-${i+1}) ${start}% ${offset}%`);});
 return `<div class="staff-distribution"><div class="staff-donut ${total?'':'is-empty'}" style="--staff-donut:${total?'conic-gradient('+stops.join(',')+')':'var(--staff-border)'}" role="img" aria-label="${total} concessões ativas de produtos"><div><strong>${count(total)}</strong><span>acessos ativos</span></div></div><div class="staff-product-legend">${rows.map((r,i)=>`<div><i class="staff-series-${i+1}"></i><span>${r.name}</span><strong>${total?Math.round(r.value/total*100):0}%</strong><span>${count(r.value)}</span></div>`).join('')}</div></div><p class="staff-caption">Um aluno pode ter mais de um produto. O total representa concessões, não alunos únicos.</p>`;
}
function health(data){
 const verified=(data.recentEvents||[]).length>0,failed=Number(data.jobs?.failed||0),pending=Number(data.jobs?.pending||0);
 const rows=[['Servidor',data.health?.live?'Disponível':'Não verificado',data.health?.live?'success':'muted'],['Kiwify',verified?'Recebimento confirmado':'Não verificado',verified?'success':'muted'],['Tarefas',failed?count(failed)+' com falha':pending?count(pending)+' pendente(s)':'Sem falhas registradas',failed?'attention':'success']];
 return `<div class="staff-health">${rows.map(([label,value,tone])=>`<div><span>${icon('plus',15)}${label}</span><strong class="${tone}"><i></i>${value}</strong></div>`).join('')}</div>${data.health?.live&&!data.health?.ready?'<p class="staff-caption">Prontidão indisponível. Confira os documentos publicados e a configuração da plataforma.</p>':''}<p class="staff-caption">Consulta atual · Entrega de e-mails e compras reais exigem validação própria.</p>`;
}
function render(data,period=30){
 const kpis=[['Alunos ativos',data.students,'users','warm','Contas de alunos ativas'],['Eventos recebidos',data.events?.received,'layers','info','Total de eventos registrados'],['Eventos em revisão',data.events?.review,'clock','attention','Aguardando conferência'],['Tarefas com falha',data.jobs?.failed,'triangle-alert','attention','Fila de processamento']];
 return `<div class="staff-kpis">${kpis.map(([label,value,ic,tone,note])=>`<section class="staff-kpi ${tone}" aria-label="${label}: ${Number(value)||0}"><span class="staff-kpi-icon">${icon(ic,31)}</span><div><h2>${label}</h2><strong>${count(value)}</strong><span>${note}</span></div></section>`).join('')}</div><div class="staff-dashboard-grid">${plot(data,Number(period))}${panel(icon('history',21)+'Atividades recentes',activity(data),'<button type="button" class="staff-text-button" data-staff-nav="events">Ver eventos '+icon('arrow-right',17)+'</button>','staff-recent')}${panel('Acessos por produto',distribution(data),'','staff-accesses')}${panel(icon('activity',21)+'Saúde da plataforma',health(data),'','staff-health-card')}</div>`;
}
function reports(data,period=30){return `<div class="staff-dashboard-grid reports-grid">${plot(data,Number(period))}${panel('Acessos por produto',distribution(data))}</div><p class="staff-caption">Relatório operacional de cadastros e concessões de acesso. Dados financeiros individuais dos alunos não são consultados.</p>`;}
async function load(backend){
 const overview=await backend.request('/admin/overview'),result={...overview,recentStudents:[],recentEvents:[],studentsAvailable:true,health:{},warnings:[]};
 await Promise.all([
  (async()=>{try{let offset=0;const cutoff=Date.now()-91*86400000;for(let i=0;i<20;i++){const page=await backend.request('/admin/students?limit=100&offset='+offset);result.recentStudents.push(...page.items);if(page.nextOffset===null||!page.items.length||new Date(page.items.at(-1).created_at).getTime()<cutoff)return;offset=page.nextOffset;}result.studentsPartial=true;}catch{result.studentsAvailable=false;result.warnings.push('Cadastros não carregados.');}})(),
  (async()=>{try{result.recentEvents=(await backend.request('/admin/events?limit=25&offset=0')).items;}catch{result.warnings.push('Atividades de eventos não carregadas.');}})(),
  (async()=>{for(const [key,url]of [['live','/health/live'],['ready','/health/ready']])try{const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(8000)});result.health[key]=response.ok;}catch{result.health[key]=false;}})()
 ]);
 return result;
}
window.UPAdminDashboard={series,render,reports,load,activity,distribution,health};
})();
