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
 function clear(id){delete drafts[id];persist();}
 function error(field,message){
  field.setAttribute('aria-invalid','true');
  const wrapper=field.closest('.field')||field.parentElement;
  let note=wrapper.querySelector('.input-error');
  if(!note){note=document.createElement('span');note.className='input-error';note.id=field.id+'-error';wrapper.append(note);}
  note.textContent=message;field.setAttribute('aria-describedby',note.id);
 }
 function validate(form){
  for(const note of form.querySelectorAll('.input-error'))note.remove();
  let first;
  for(const field of form.querySelectorAll('input,textarea,select')){
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
  if(first){first.focus();feedback(form,'Confira os campos indicados.','error');return false;}return true;
 }
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
  }
 }
 document.addEventListener('input',event=>{const field=event.target;if(field.form){capture(field.form);field.removeAttribute('aria-invalid');field.closest('.field')?.querySelector('.input-error')?.remove();}});
 window.addEventListener('beforeunload',event=>{if(!preview&&Object.keys(drafts).length){event.preventDefault();event.returnValue='';}});
 window.UPForms={hydrate,capture,clear,validate,feedback,reset(){drafts={};persist();}};
})();
