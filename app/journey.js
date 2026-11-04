/* Progresso calculado a partir das atividades salvas; sem pontuação por valor financeiro. */
(function(root){
 'use strict';
 const rows=value=>Array.isArray(value)?value:[];
 const text=value=>typeof value==='string'&&value.trim().length>0;
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function week(value){
  const day=String(value||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return null;
  const date=new Date(day+'T12:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==day)return null;
  const weekday=date.getUTCDay()||7;date.setUTCDate(date.getUTCDate()+4-weekday);
  const start=new Date(Date.UTC(date.getUTCFullYear(),0,1));return date.getUTCFullYear()+'-'+Math.ceil(((date-start)/86400000+1)/7);
 }
 function derive(state){
  const grants=state.entitlements||{},front=!!grants.front,kit=!!grants.kit,essential=kit||!!grants.essencial;
  const diagnostics=rows(state.diagnostics).filter(x=>x.id&&x.result),finances=rows(state.finances).filter(x=>x.id&&x.result);
  const checkins=rows(state.checkins).filter(x=>x.id&&Array.isArray(x.answers)&&text(x.answers[0])&&text(x.answers[4]));
  const weeks=new Set(checkins.map(x=>week(x.date||x.created)).filter(Boolean));
  const plan=state.plan||{},planKeys=['result','decision1','decision2','decision3','decision4','phase1','phase2','phase3'];
  const definitions=[
   ['diagnostic',front,'Seu ponto de partida','Conclua e salve seu primeiro Diagnóstico UP.','diagnostic','diagnostic-result','clipboard-check',100,diagnostics.length>0,'Primeiro olhar'],
   ['finance',front,'Clareza nos números','Conclua as seis etapas e salve seu Raio-X financeiro.','finance','finance-result','chart-bar',120,finances.length>0,'Números na mesa'],
   ['ledger',essential,'Organização em prática','Salve uma entrada ou saída no Controle do mês.','ledger','ledger','wallet',60,rows(state.kitTransactions).some(x=>x.id&&Number(x.value)>0),'Caixa organizado'],
   ['bills',essential,'Antecipe os compromissos','Cadastre uma conta com descrição, valor e vencimento.','ledger','ledger','calendar',40,rows(state.kitBills).some(x=>x.id&&text(x.desc)&&x.due&&Number(x.value)>0),'Olhar adiante'],
   ['plan',kit,'Uma direção para 90 dias','Salve o resultado desejado, as quatro decisões e as três fases.','plan','plan','file-text',100,planKeys.every(k=>text(plan[k])),'Rota definida'],
   ['checkin',kit,'Da intenção à revisão','Salve um check-in com seus avanços e a próxima prioridade.','plan','plan','check',60,checkins.length>0,'Primeira revisão'],
   ['offer',kit,'Sua oferta com clareza','Salve uma oferta com nome, público e problema principal.','offers','offers','message-circle',80,rows(state.personalOffers).some(x=>x.id&&['name','audience','problem'].every(k=>text(x[k]))),'Oferta no papel'],
   ['procedure',kit,'Prepare a próxima entrega','Salve um procedimento com tarefa, responsável e passos de execução.','procedures','procedures','users',80,rows(state.procedures).some(x=>x.id&&['task','owner','steps'].every(k=>text(x[k]))),'Pronto para delegar'],
   ['review',front,'Revisite seu momento','Conclua um novo diagnóstico e consulte a evolução no histórico.','diagnostic','history','history',60,new Set(diagnostics.map(x=>String(x.id))).size>=2,'Novo olhar'],
   ['rhythm',kit,'Construa uma rotina','Registre avanços e próxima prioridade em três semanas diferentes.','plan','plan','calendar',100,weeks.size>=3,'Ritmo de revisão']
  ];
  const missions=definitions.filter(x=>x[1]).map(([id,,title,description,route,reviewRoute,icon,xp,done,award])=>({id,title,description,route,reviewRoute,icon,xp,done,award}));
  const completed=missions.filter(x=>x.done),xp=completed.reduce((n,x)=>n+x.xp,0),total=missions.reduce((n,x)=>n+x.xp,0),percent=total?Math.floor(xp/total*100):0;
  const levels=['Primeiros passos','Clareza em construção','Rotina organizada','Execução em movimento','Jornada em dia'];
  const level=Math.min(4,Math.floor(percent/25)),next=missions.find(x=>!x.done);
  return {missions,completed,xp,total,percent,level:level+1,title:levels[level],next,nextTitle:levels[level+1],remaining:level<4?Math.max(0,Math.ceil(total*(level+1)/4)-xp):0,weeks:weeks.size};
 }
 function summary(state,icon=()=>'',full=false){
  const p=derive(state);if(!p.missions.length)return '';
  return `<section class="panel journey-summary ${full?'journey-summary-full':''}" aria-label="Seu progresso na jornada"><div class="journey-emblem" aria-hidden="true">${icon('crown',24)}</div><div class="journey-copy"><span class="journey-eyebrow">SUA JORNADA UP · NÍVEL ${p.level}</span><h2>${p.title}</h2><p>${p.completed.length} de ${p.missions.length} missões concluídas <span aria-hidden="true">·</span> <b>${p.xp} pontos</b></p><div class="journey-progress" role="progressbar" aria-label="Progresso das missões" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.percent}" aria-valuetext="${p.percent}% da jornada"><span style="width:${p.percent}%"></span></div><small>${p.nextTitle?`${p.remaining} pontos para ${p.nextTitle.toLowerCase()}.`:'Você concluiu as missões disponíveis. Continue revisando suas ações.'}</small></div><div class="journey-summary-action">${full?`<strong>${p.percent}%</strong><span>da jornada concluída</span>`:`<button type="button" class="btn secondary" data-go="journey">Ver minha jornada ${icon('arrow-right',16)}</button>${p.next?`<small>Próxima: ${esc(p.next.title)}</small>`:'<small>Seu progresso merece ser reconhecido.</small>'}`}</div></section>`;
 }
 function page(state,icon=()=>'' ){
  const p=derive(state);
  if(!p.missions.length)return '<section class="panel"><h2>Sua jornada está sendo preparada</h2><p>Consulte seus acessos com a equipe UP.</p><button type="button" class="btn primary" data-go="support">Falar com o suporte</button></section>';
  const next=p.next;
  return `<header class="page-head"><div><h1 class="page-title">Minha jornada</h1><p class="page-desc">Pequenas ações, avanço visível. Construa sua rotina, uma missão de cada vez.</p></div><button type="button" class="btn" data-go="dashboard">Voltar à visão geral ${icon('arrow-right',16)}</button></header>${summary(state,icon,true)}<div class="journey-layout"><div><div class="journey-section-heading"><h2>Seu caminho de evolução</h2><span>${p.missions.length} missões</span></div><ol class="journey-missions">${p.missions.map((m,i)=>`<li class="journey-mission ${m.done?'is-complete':m===next?'is-next':''}"><span class="journey-step" aria-hidden="true">${m.done?icon('check',18):String(i+1).padStart(2,'0')}</span><div class="journey-mission-copy"><div class="journey-mission-meta"><span>${m.done?'CONCLUÍDA':m===next?'PRÓXIMO PASSO':'NO SEU RITMO'}</span><b>+${m.xp} pontos</b></div><h3>${esc(m.title)}</h3><p>${esc(m.description)}</p><button type="button" class="btn ${m===next?'primary':''} small" data-go="${m.done?m.reviewRoute:m.route}" aria-label="${m.done?'Rever':'Iniciar'} missão: ${esc(m.title)}">${m.done?'Rever atividade':'Ir para a atividade'} ${icon('arrow-right',14)}</button></div></li>`).join('')}</ol></div><aside class="journey-aside"><section class="panel journey-next"><span class="journey-eyebrow">${next?'SUA PRÓXIMA MISSÃO':'CAMINHO PERCORRIDO'}</span><span class="square-icon orange">${icon(next?.icon||'crown',23)}</span><h2>${next?esc(next.title):'Jornada em dia!'}</h2><p>${next?esc(next.description):'A organização continua na prática. Revise seu plano e registre seus próximos avanços.'}</p><button type="button" class="btn primary" data-go="${next?.route||(state.entitlements?.kit?'plan':'history')}">${next?'Começar missão':'Revisar meu caminho'} ${icon('arrow-right',16)}</button></section><section class="panel journey-awards"><div class="journey-section-heading"><h2>Conquistas</h2><span>${p.completed.length}/${p.missions.length}</span></div><ul>${p.missions.map(m=>`<li class="journey-award ${m.done?'is-earned':''}"><span class="journey-award-icon" aria-hidden="true">${icon(m.done?m.icon:'lock',18)}</span><span><b>${esc(m.award)}</b><small>${m.done?'Conquistada':esc(m.title)}</small></span>${m.done?icon('check',14):''}</li>`).join('')}</ul></section><details class="panel journey-rules"><summary>Como funciona o progresso?</summary><p>Os pontos vêm das atividades salvas nas ferramentas do seu acesso. Cada missão conta uma vez, mesmo ao repetir ou editar a atividade.</p><p>O progresso reflete os registros disponíveis na sua conta. As conquistas são reconhecimentos visuais dentro do UP.</p><p>As três semanas da missão de revisão podem ser espaçadas. Avance no seu ritmo.</p></details></aside></div>`;
 }
 let account,seen=new Set(),timer;
 function hydrate(state){
  const key=state.user?.id||state.user?.email||'preview';
  const current=derive(state).completed;
  if(account!==key){account=key;seen=new Set(current.map(x=>x.id));document.querySelector('#journey-celebration')?.remove();return;}
  const earned=current.filter(x=>!seen.has(x.id));for(const m of current)seen.add(m.id);
  if(!earned.length)return;
  document.querySelector('#journey-celebration')?.remove();clearTimeout(timer);
  const notice=document.createElement('div');notice.id='journey-celebration';notice.className='journey-celebration';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
  notice.innerHTML=`<span class="journey-celebration-star" aria-hidden="true">✓</span><div><small>MISSÃO CONCLUÍDA · +${earned.reduce((n,m)=>n+m.xp,0)} PONTOS</small><strong>${esc(earned[0].award)}${earned.length>1?' e mais '+(earned.length-1):''}</strong><button type="button" data-go="journey">Ver minha jornada →</button></div><button type="button" class="journey-dismiss" aria-label="Fechar conquista">×</button>`;
  notice.querySelector('.journey-dismiss').addEventListener('click',()=>notice.remove());
  document.body.appendChild(notice);timer=setTimeout(()=>notice.remove(),9000);
 }
 function reset(){account=undefined;seen=new Set();clearTimeout(timer);document.querySelector('#journey-celebration')?.remove();}
 const api={derive,summary,page,hydrate,reset};root.UPJourney=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
