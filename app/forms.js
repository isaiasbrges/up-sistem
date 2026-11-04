/* Validação acessível, rascunhos e retorno junto ao formulário. */
(()=>{
 'use strict';
 const preview=!!window.UPPreview;
 let drafts={};
 if(preview)try{drafts=JSON.parse(localStorage.getItem('up-preview-drafts-v1')||'{}');}catch{}
 function persist(){if(preview)try{localStorage.setItem('up-preview-drafts-v1',JSON.stringify(drafts));}catch{}}
 function capture(form){
  if(!form?.id||['login-form','verify-form'].includes(form.id))return;
  const data={};for(const field of form.elements)if(field.name&&!field.readOnly)data[field.name]=field.type==='checkbox'?field.checked:field.value;
  drafts[form.id]=data;persist();
  const status=form.querySelector('.form-feedback');if(status){status.textContent=preview?'Rascunho preservado neste navegador.':'Alterações ainda não salvas.';status.className='form-feedback pending';}
 }
 function clear(id){delete drafts[id];delete stepAt[id];persist();}
 function error(field,message){
  field.setAttribute('aria-invalid','true');
  const wrapper=field.closest('.field')||field.parentElement;
  let note=wrapper.querySelector('.input-error');
  if(!note){note=document.createElement('span');note.className='input-error';note.id=field.id+'-error';wrapper.append(note);}
  note.textContent=message;field.setAttribute('aria-describedby',note.id);
 }
 function validate(form,scope=form){
  for(const note of scope.querySelectorAll('.input-error'))note.remove();
  let first;
  for(const field of scope.querySelectorAll('input,textarea,select')){
   field.removeAttribute('aria-invalid');field.removeAttribute('aria-describedby');
   if(field.disabled||field.readOnly||field.type==='hidden')continue;
   let message='';
   if(field.required&&((field.type==='checkbox'&&!field.checked)||!String(field.value).trim()))message=field.type==='checkbox'?'Marque esta opção para confirmar.':'Preencha este campo para continuar.';
   else if(field.validity?.typeMismatch)message=field.type==='email'?'Digite um e-mail completo.':'Confira o formato deste valor.';
   else if(field.validity?.badInput)message='Digite um número válido.';
   else if(field.validity?.rangeUnderflow)message='Informe um valor igual ou maior que '+field.min+'.';
   else if(field.validity?.rangeOverflow)message='Informe um valor igual ou menor que '+field.max+'.';
   else if(field.validity?.patternMismatch)message='Confira o formato informado.';
   else if(field.validity?.tooLong)message='Reduza o tamanho deste texto.';
   else if(field.minLength>0&&String(field.value).length<field.minLength)message='Digite pelo menos '+field.minLength+' caracteres.';
   if(message){error(field,message);first=first||field;}
  }
  if(first){const step=first.closest('.form-step');if(step?.hidden)goStep(form,[...form.querySelectorAll('.form-step')].indexOf(step));first.focus();feedback(form,'Confira os campos indicados.','error');return false;}return true;
 }
 // Formulários longos em etapas: uma etapa visível por vez, com progresso clicável, Voltar e Continuar.
 // Todos os campos continuam no mesmo <form>; o envio e os rascunhos funcionam como antes.
 const stepAt={};
 const escText=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function goStep(form,index,focus=false){
  const groups=[...form.querySelectorAll('.form-step')];if(!groups.length)return;
  const i=Math.max(0,Math.min(groups.length-1,index)),last=i===groups.length-1,anyStep=form.hasAttribute('data-save-any-step');
  stepAt[form.id]=i;
  groups.forEach((group,k)=>{group.hidden=k!==i;});
  let head=form.querySelector('.form-stepper');
  if(!head){head=document.createElement('ol');head.className='form-stepper';head.setAttribute('aria-label','Etapas');form.prepend(head);}
  head.innerHTML=groups.map((group,k)=>`<li><button type="button" data-step-go="${k}" class="${k===i?'current':k<i?'done':''}"${k===i?' aria-current="step"':''}><span class="form-stepper-number">${k+1}</span><span>${escText(group.dataset.stepTitle)}</span></button></li>`).join('');
  for(const button of form.querySelectorAll('[data-step-prev]'))button.hidden=i===0;
  for(const button of form.querySelectorAll('[data-step-next]'))button.hidden=last;
  for(const button of form.querySelectorAll('.form-step-nav button[type="submit"]')){button.hidden=!last&&!anyStep;button.classList.toggle('primary',last);button.classList.toggle('secondary',!last);}
  if(focus)groups[i].querySelector('input,textarea,select')?.focus();
 }
 document.addEventListener('click',event=>{
  const control=event.target.closest('[data-step-next],[data-step-prev],[data-step-go]');if(!control)return;
  const form=control.closest('form');if(!form)return;
  const groups=[...form.querySelectorAll('.form-step')],current=stepAt[form.id]||0;
  if(control.hasAttribute('data-step-go'))return goStep(form,Number(control.dataset.stepGo),true);
  if(control.hasAttribute('data-step-prev'))return goStep(form,current-1,true);
  if(validate(form,groups[current])){feedback(form,'','pending');goStep(form,current+1,true);}
 });
 function feedback(form,message,type='success'){
  let el=form.querySelector('.form-feedback');if(!el){el=document.createElement('p');form.append(el);}
  el.className='form-feedback '+type;el.setAttribute('role',type==='error'?'alert':'status');el.textContent=message;
 }
 function hydrate(){
  for(const form of document.querySelectorAll('form[id]')){
   form.noValidate=true;
   for(const field of form.querySelectorAll('input[name],textarea[name],select[name]')){
    const old=field.id,id=form.id+'-'+field.name;
    for(const label of form.querySelectorAll('label[for]'))if(label.htmlFor===old)label.htmlFor=id;
    field.id=id;
    if(field.tagName==='TEXTAREA'&&!field.hasAttribute('maxlength'))field.maxLength=5000;
    else if(field.type==='text'&&!field.hasAttribute('maxlength'))field.maxLength=500;
    if((form.id==='plan-form'&&field.name==='result')||(form.id==='checkin-form'&&field.name==='q1')||(form.id==='procedure-form'&&field.name==='steps')||(form.id==='debt-form'&&['balance','payment'].includes(field.name))||(form.id==='admin-script'&&field.name==='text'))field.required=true;
    const value=drafts[form.id]?.[field.name];
    if(value!==undefined&&!field.readOnly){if(field.type==='checkbox')field.checked=!!value;else field.value=value;}
   }
   if(!form.querySelector('.form-feedback'))feedback(form,drafts[form.id]?'Rascunho restaurado.':'','pending');
   goStep(form,stepAt[form.id]||0);
  }
 }
 document.addEventListener('input',event=>{const field=event.target;if(field.form){capture(field.form);field.removeAttribute('aria-invalid');field.closest('.field')?.querySelector('.input-error')?.remove();}});
 window.addEventListener('beforeunload',event=>{if(!preview&&Object.keys(drafts).length){event.preventDefault();event.returnValue='';}});
 window.UPForms={hydrate,capture,clear,validate,feedback,goStep,reset(){drafts={};persist();}};
})();
