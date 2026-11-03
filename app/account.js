/* Documentos publicados, recibos de aceite e solicitações do titular. */
(()=>{'use strict';
const backend=window.UPBackend;if(backend?.version!==1)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let context,displayedPair;
const when=value=>value?new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
const documentView=(key,doc)=>`<details class="legal-document" open><summary>${esc(doc.title)} <span class="badge">Versão ${esc(doc.version)}</span></summary><div class="legal-copy" role="document" aria-label="${esc(doc.title)}">${esc(doc.body)}</div></details>`;
function legal(state,{head,panel}){
  const current=state.legal||{};
  const pair=state.user.id+':'+current.documents?.terms.version+':'+current.documents?.terms.digest+':'+current.documents?.privacy.version+':'+current.documents?.privacy.digest;
  if(pair!==displayedPair){window.UPForms?.clear('legal-consent-form');displayedPair=pair;}
  const body=current.available?`${documentView('terms',current.documents.terms)}${documentView('privacy',current.documents.privacy)}${current.accepted?`<p class="form-feedback success">${current.required?'Aceite registrado em '+when(current.acceptedAt)+'.':'Documentos publicados disponíveis para consulta.'}</p><button type="button" class="btn primary" data-go="${state.user.role==='aluno'?'dashboard':'profile'}">${state.user.role==='aluno'?'Continuar para o sistema':'Voltar à minha conta'}</button>`:`<form id="legal-consent-form"><label class="form-checkbox"><input id="legal-terms" name="termsAccepted" type="checkbox" required> Li e aceito os termos de uso acima.</label><label class="form-checkbox"><input id="legal-privacy" name="privacyAccepted" type="checkbox" required> Li e aceito a política de privacidade acima.</label><div class="form-actions"><button type="submit" class="btn primary">Aceitar e continuar</button><button type="button" class="btn secondary" data-go="profile">Gerenciar meus dados</button></div></form>`}`:'<p class="panel-sub">Os documentos de acesso estão sendo preparados pela UP. Consulte o suporte para acompanhar a liberação.</p><button type="button" class="btn secondary" data-go="support">Falar com o suporte</button>';
  return `${head('Termos e privacidade','Leia os documentos que orientam seu acesso e o uso dos seus dados.')}<div class="account-area">${panel('Documentos de acesso',body)}</div>`;
}
function panel(state,h){
  const pending=(state.privacy?.requests||[]).find(r=>r.kind==='delete'&&['pending','processing'].includes(r.status));
  const requests=state.privacy?.requests||[];
  const labels={pending:'Pendente',processing:'Em atendimento',done:'Concluída',rejected:'Encerrada',cancelled:'Cancelada'};
  const personal=`<p class="panel-sub">Baixe seus registros completos, incluindo histórico, rascunhos salvos e recibos de aceite.</p><div class="form-actions"><button type="button" class="btn secondary" data-action="export-json">Exportar todos os meus dados</button></div>${state.user.role==='aluno'?`<div class="divider"></div>${pending?`<p class="alert-inline">Solicitação de exclusão ${pending.status==='pending'?'registrada':'em atendimento'} em ${when(pending.created_at)}.</p>${pending.status==='pending'?`<button class="btn secondary" type="button" data-account-action="cancel" data-id="${pending.id}">Cancelar solicitação</button>`:'<p class="panel-sub">A equipe UP está atendendo sua solicitação. Acompanhe pelo canal de suporte.</p>'}`:`<details><summary>Solicitar exclusão dos meus dados</summary><p class="panel-sub">Sua solicitação será analisada pela equipe UP. Você poderá cancelá-la enquanto estiver pendente.</p><form id="privacy-delete-form"><div class="field"><label for="privacy-reason">Motivo (opcional)</label><textarea id="privacy-reason" name="reason" maxlength="1000"></textarea></div><label class="form-checkbox"><input id="privacy-confirmed" name="confirmed" type="checkbox" required> Confirmo que quero solicitar a exclusão dos meus dados e da minha conta.</label><div class="form-actions"><button class="btn danger" type="submit">Registrar solicitação de exclusão</button></div></form></details>`}`:''}`;
  const legalState=state.legal||{};
  const receipts=legalState.available?`<p class="panel-sub">Termos: ${esc(legalState.documents.terms.version)} · Privacidade: ${esc(legalState.documents.privacy.version)}</p><p>${!legalState.required?'Documentos publicados disponíveis para consulta.':legalState.accepted?'Aceite registrado em '+when(legalState.acceptedAt):'Aceite das versões atuais pendente.'}</p><button type="button" class="btn secondary" data-go="legal">Ler documentos</button>`:'<p class="panel-sub">Os documentos de acesso estão em preparação.</p>';
  return `<div class="layout-grid account-panels"><div class="c7">${h.panel('Privacidade e dados',personal)}</div><div class="c5">${h.panel('Termos e transparência',receipts)}</div>${requests.length?`<div class="c12">${h.panel('Minhas solicitações',`<div class="table-scroll"><table class="table"><thead><tr><th>Data</th><th>Solicitação</th><th>Situação</th><th>Atendimento</th></tr></thead><tbody>${requests.map(r=>`<tr><td>${when(r.created_at)}</td><td>${r.kind==='delete'?'Exclusão de dados':'Exportação'}</td><td>${labels[r.status]||esc(r.status)}</td><td>${esc(r.resolution_note||'—')}</td></tr>`).join('')}</tbody></table></div>`)}</div>`:''}</div>`;
}
async function submit(form,o){
  const current=context;
  if(form.id==='legal-consent-form'){
    const docs=current.state.legal.documents;
    await backend.request('/legal/accept',{termsVersion:docs.terms.version,privacyVersion:docs.privacy.version,termsAccepted:o.termsAccepted==='on',privacyAccepted:o.privacyAccepted==='on'});
    window.UPForms?.clear(form.id);if(context?.state.signed&&context.state.user.id===current.state.user.id)await context.accepted();return true;
  }
  if(form.id==='privacy-delete-form'){
    await backend.request('/privacy/deletion-requests',{confirmed:o.confirmed==='on',reason:o.reason||''});
    window.UPForms?.clear(form.id);if(context?.state.signed&&context.state.user.id===current.state.user.id){const data=await backend.request('/privacy');if(context?.state.user.id===current.state.user.id){context.state.privacy=data;context.render();context.flash('Solicitação registrada. A equipe UP poderá iniciar o atendimento.');}}return true;
  }
  return false;
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-account-action]');if(!button||!context||button.disabled)return;
  const current=context;button.disabled=true;
  (async()=>{try{await backend.request('/privacy/deletion-requests/'+encodeURIComponent(button.dataset.id)+'/cancel',{});if(context?.state.signed&&context.state.user.id===current.state.user.id){const data=await backend.request('/privacy');if(context?.state.user.id===current.state.user.id){context.state.privacy=data;context.render();context.flash('Solicitação cancelada.');}}}
  catch(error){current.flash(error.message);}finally{button.disabled=false;}})();
});
window.UPAccount={legal,panel,submit,mount(value){context=value;},reset(){context=null;displayedPair=null;}};
})();
