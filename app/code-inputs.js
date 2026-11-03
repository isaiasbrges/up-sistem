(function(factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(typeof document!=='undefined')api.connect(document);})(function(){
 'use strict';
 function distribute(fields,start,text){
  const digits=String(text).replace(/\D/g,'').slice(0,Math.max(0,fields.length-start));
  if(!digits||start<0||start>=fields.length)return 0;
  [...digits].forEach((digit,i)=>{const field=fields[start+i];field.value=digit;field.dispatchEvent?.(new Event('input',{bubbles:true}));});
  fields[Math.min(start+digits.length,fields.length-1)]?.focus();return digits.length;
 }
 function connect(doc){
  doc.addEventListener('paste',event=>{
   if(!event.target.matches('.code-fields input'))return;
   const fields=[...event.target.parentElement.querySelectorAll('input')];event.preventDefault();
   distribute(fields,fields.indexOf(event.target),event.clipboardData.getData('text'));
  });
  doc.addEventListener('input',event=>{
   const field=event.target;if(!field.matches('.code-fields input'))return;
   field.value=field.value.replace(/\D/g,'').slice(0,1);if(field.value)field.nextElementSibling?.focus();
  });
  doc.addEventListener('keydown',event=>{
   const field=event.target;if(!field.matches('.code-fields input'))return;
   if((event.key==='Backspace'&&!field.value)||event.key==='ArrowLeft'){field.previousElementSibling?.focus();if(event.key==='ArrowLeft')event.preventDefault();}
   if(event.key==='ArrowRight'){field.nextElementSibling?.focus();event.preventDefault();}
  });
 }
 return {distribute,connect};
});
