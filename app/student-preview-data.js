/* Somente leitura. Nenhuma identidade, cadastro ou registro de aluno é consultado. */
(()=>{'use strict';
window.UPStudentReadonly=true;
const product=new URLSearchParams(window.location.search).get('product');
window.UPPreview=()=>({user:{name:'Visualização do aluno',email:''},signed:true,consent:true,entitlements:{front:true,essencial:product==='essencial',kit:!['front','essencial'].includes(product)},diagnostics:[],finances:[],kitTransactions:[],kitBills:[],personalOffers:[],checkins:[],procedures:[]});
const allowed=new Set(['toggle-sidebar','close-sidebar','toggle-notifications','profile-tab','choose-script','history-diag','history-finance']);
function hydrate(){
 for(const field of document.querySelectorAll('input:not([data-tool-search]),textarea,select,button[type="submit"],button[data-score-group]')){field.disabled=true;field.title='Disponível somente na conta do aluno.';}
 for(const button of document.querySelectorAll('button[data-action]'))if(!allowed.has(button.dataset.action)){button.disabled=true;button.title='Ação indisponível nesta prévia de leitura.';}
 for(const item of document.querySelectorAll('[data-go="admin"],[data-action="logout"]'))item.hidden=true;
 const strip=document.querySelector('.demo-strip');if(strip&&strip.dataset.readonly!=='true'){strip.dataset.readonly='true';strip.textContent='PRÉVIA SOMENTE LEITURA · Sem dados de alunos e sem gravações.';}
}
document.addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation();},true);
document.addEventListener('click',event=>{
 const action=event.target.closest('[data-action]'),link=event.target.closest('a'),admin=event.target.closest('[data-go="admin"]');
 if(link||admin||(action&&!allowed.has(action.dataset.action))){event.preventDefault();event.stopImmediatePropagation();}
},true);
document.addEventListener('DOMContentLoaded',()=>{hydrate();new MutationObserver(hydrate).observe(document.documentElement,{childList:true,subtree:true});});
})();
