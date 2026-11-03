/* Contratos por recurso; o salvamento automático cuida somente dos rascunhos. */
(()=>{'use strict';
if(!window.UP_CONFIG?.api||window.UP_CONFIG.apiVersion!==1)return;
const paths={diagnostics:'/diagnostics',finances:'/finance/snapshots',kitTransactions:'/kit/transactions',kitBills:'/kit/bills',kitDebts:'/kit/debts',personalOffers:'/kit/offers',plan:'/kit/plans',checkins:'/kit/checkins',procedures:'/kit/procedures'};
const status=(message,error=false)=>window.dispatchEvent(new CustomEvent('up-sync',{detail:{message,error}}));
const pages={},draftVersions={diagnostic:0,finance:0},savedDrafts={};
let pending=null,inFlight=null,timer,lastError=null,currentUserId=null;
const has=(grants,key)=>!!(grants[key]||(key==='essencial'&&grants.kit));
function pathFor(key){if(!paths[key])throw Error('Recurso desconhecido.');return paths[key];}
async function request(url,body,method,headers={}) {
  const response=await fetch('/api/v1'+url,{method:method||(body?'POST':'GET'),credentials:'same-origin',signal:AbortSignal.timeout(20000),
    headers:{...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
  let data;try{data=await response.json();}catch{throw Object.assign(Error('O servidor não respondeu como esperado. Tente novamente.'),{status:response.status});}
  if(!response.ok){if(['CONSENT_REQUIRED','LEGAL_UNAVAILABLE','LEGAL_VERSION_CHANGED'].includes(data.code))window.dispatchEvent(new CustomEvent('up-legal-required'));throw Object.assign(Error(data.error||'Não foi possível concluir.'),{status:response.status,code:data.code,fields:data.fields});}
  return data;
}
function currentMonth(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).formatToParts(new Date());return parts.find(p=>p.type==='year').value+'-'+parts.find(p=>p.type==='month').value;}
async function list(key,options={}) {
  const query=new URLSearchParams();for(const [name,value]of Object.entries(options))if(value!==null&&value!==undefined)query.set(name,String(value));
  return request(pathFor(key)+(query.size?'?'+query:''));
}
async function load() {
  const me=await request('/me'),data={...me,signed:true,diagnostics:[],finances:[],kitTransactions:[],kitBills:[],kitDebts:[],personalOffers:[],plan:{},checkins:[],procedures:[],_pages:pages};
  if(currentUserId!==me.user.id){clearTimeout(timer);pending=null;lastError=null;window.UPForms?.reset();window.UPAdmin?.reset();window.UPAccount?.reset();}
  currentUserId=me.user.id;
  for(const key of Object.keys(pages))delete pages[key];
  for(const key of Object.keys(savedDrafts))delete savedDrafts[key];
  draftVersions.diagnostic=0;draftVersions.finance=0;
  const jobs=[];
  jobs.push((async()=>{data.platform=await request('/platform');data.admin={productIds:{front:'',essencial:'',kit:''},kitLink:data.platform.kitPurchaseUrl};})());
  jobs.push((async()=>{data.privacy=await request('/privacy');})());
  if(me.legal?.required&&!me.legal.accepted){await Promise.all(jobs);return data;}
  const loadList=(key,options={})=>jobs.push((async()=>{const page=await list(key,options);pages[key]={nextCursor:page.nextCursor,options};
    data[key]=key==='plan'?(page.items[0]||{}):key==='diagnostics'||key==='finances'?page.items.slice().reverse():page.items;})());
  if(has(me.entitlements,'front')){
    loadList('diagnostics');loadList('finances');
    jobs.push((async()=>{const initial=await request('/diagnostics/initial');data._initialDiagnostic=initial;})());
    jobs.push((async()=>{const drafts=await request('/drafts');for(const resource of ['diagnostic','finance']){
      draftVersions[resource]=drafts[resource].version;savedDrafts[resource]=JSON.stringify({data:drafts[resource].data,step:drafts[resource].step});
      data[resource==='diagnostic'?'diagnosticDraft':'financeDraft']=drafts[resource].data;
      data[resource==='diagnostic'?'diagStep':'finStep']=drafts[resource].step;
    }})());
  }
  if(has(me.entitlements,'essencial')){
    const month=currentMonth();data.financeViewMonth=month;loadList('kitTransactions',{month});loadList('kitBills');loadList('kitDebts');
    jobs.push((async()=>{data.ledgerSummary=await request('/kit/summary?month='+month);})());
  }
  if(has(me.entitlements,'kit'))for(const key of ['personalOffers','plan','checkins','procedures'])loadList(key);
  await Promise.all(jobs);
  if(data._initialDiagnostic&&!data.diagnostics.some(row=>row.id===data._initialDiagnostic.id))data.diagnostics.unshift(data._initialDiagnostic);
  pending=null;lastError=null;return data;
}
function save(state) {
  if(!has(state.entitlements,'front')||(state.legal?.required&&!state.legal.accepted))return;
  pending={diagnostic:{data:structuredClone(state.diagnosticDraft),step:state.diagStep},finance:{data:structuredClone(state.financeDraft),step:state.finStep}};
  lastError=null;clearTimeout(timer);timer=setTimeout(()=>flush().catch(()=>{}),500);
}
async function flush() {
  clearTimeout(timer);
  while(inFlight){try{await inFlight;}catch{}}
  if(!pending){if(lastError)throw lastError;return;}
  const snapshot=pending;pending=null;
  inFlight=(async()=>{
    try{
      for(const resource of ['diagnostic','finance']){
        const value=snapshot[resource],signature=JSON.stringify(value);
        if(signature===savedDrafts[resource])continue;
        status('Salvando rascunho…');
        const result=await request('/drafts/'+resource,{...value,version:draftVersions[resource]},'PUT');
        draftVersions[resource]=result.version;savedDrafts[resource]=signature;
      }
      lastError=null;status('Dados salvos no servidor.');
    }catch(error){
      if(!pending)pending=snapshot;lastError=error;status(error.message||'Não foi possível salvar o rascunho.',true);
      if(!error.status||error.status>=500)timer=setTimeout(()=>flush().catch(()=>{}),5000);
      throw error;
    }
  })();
  const task=inFlight;try{await task;}finally{if(inFlight===task)inFlight=null;}if(pending)await flush();
}
async function create(key,data,mutationKey){return request(pathFor(key),data,'POST',{'Idempotency-Key':mutationKey});}
async function update(key,record,data){return request(pathFor(key)+'/'+encodeURIComponent(record.id),data,'PATCH',{'If-Match':'"'+record.version+'"'});}
async function remove(key,record){return request(pathFor(key)+'/'+encodeURIComponent(record.id),{},'DELETE',{'If-Match':'"'+record.version+'"'});}
async function loadMore(key){const page=pages[key];if(!page?.nextCursor)return {items:[],nextCursor:null};const result=await list(key,{...page.options,cursor:page.nextCursor});page.nextCursor=result.nextCursor;return result;}
async function loadLedgerMonth(month){const [page,summary]=await Promise.all([list('kitTransactions',{month}),request('/kit/summary?month='+encodeURIComponent(month))]);pages.kitTransactions={nextCursor:page.nextCursor,options:{month}};return {items:page.items,summary};}
function financeInput(draft){const {month,estimated,...input}=structuredClone(draft);input.estimates={...(input.estimates||{}),...(estimated?{general:true}:{})};return input;}
window.UPBackend={version:1,request,load,save,flush,create,update,remove,list,loadMore,loadLedgerMonth,financeInput,
  refreshSummary:month=>request('/kit/summary?month='+encodeURIComponent(month)),
  async logout(){await flush();await request('/auth/logout',{});clearTimeout(timer);pending=null;lastError=null;currentUserId=null;window.UPForms?.reset();window.UPAdmin?.reset();window.UPAccount?.reset();}
};
request('/platform').then(data=>{window.UP_CONFIG.platform=data;window.dispatchEvent(new CustomEvent('up-platform',{detail:data}));}).catch(()=>{});
window.addEventListener('beforeunload',event=>{if(pending||inFlight){event.preventDefault();event.returnValue='';}});
})();
