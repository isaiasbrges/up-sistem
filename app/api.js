(()=>{'use strict';
if(!window.UP_CONFIG?.api||window.UP_CONFIG.apiVersion===1)return;
const groups={front:['diagnostics','finances','diagnosticDraft','financeDraft'],essencial:['kitTransactions','kitBills'],kit:['personalOffers','plan','checkins','procedures']};
async function request(url,body,method){
 const response=await fetch('/api'+url,{method:method||(body?'POST':'GET'),credentials:'same-origin',signal:AbortSignal.timeout(15000),headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
 const data=await response.json();if(!response.ok){const error=Error(data.error||'Não foi possível concluir.');error.status=response.status;throw error;}return data;
}
let pending=null,inFlight=null,timer;
const status=(message,error=false)=>window.dispatchEvent(new CustomEvent('up-sync',{detail:{message,error}}));
async function flush(){
 if(inFlight)await inFlight;
 if(!pending)return;
 const payload=pending;pending=null;
 inFlight=(async()=>{try{await request('/state',payload,'PUT');if(!pending)status('Dados salvos no servidor.');}catch(error){if(!pending)pending=payload;status('Não foi possível salvar. Mantenha esta página aberta e tente novamente.',true);}finally{inFlight=null;if(pending)timer=setTimeout(flush,5000);}})();
 await inFlight;
}
window.UPBackend={request,async flush(){clearTimeout(timer);await flush();if(pending)throw Error('Não foi possível confirmar o salvamento. Tente novamente.');},async load(){const me=await request('/me');const data=await request('/state');return {...data,...me,signed:true};},save(state){const payload={};for(const [group,keys]of Object.entries(groups))if(state.entitlements[group]||(group==='essencial'&&state.entitlements.kit))for(const key of keys)payload[key]=structuredClone(state[key]);pending=payload;status('Salvando alterações…');clearTimeout(timer);timer=setTimeout(flush,500);},async logout(){clearTimeout(timer);await flush();if(pending)throw Error('Há alterações não salvas. Aguarde antes de sair.');await request('/auth/logout',{});}};
window.addEventListener('beforeunload',event=>{if(pending||inFlight){event.preventDefault();event.returnValue='';}});
})();
