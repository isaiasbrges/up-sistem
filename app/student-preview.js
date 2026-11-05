/* Prévia isolada: a sessão administrativa e os registros não são alterados. */
(()=>{'use strict';
let context,dialog,opener;
function close(){dialog?.close();}
function open(){
 if(!context?.state.signed||context.state.user.role!=='admin')return;
 if(window.UPAdmin?.isBusy?.()){context.flash('Aguarde a operação em andamento.');return;}
 if(dialog){dialog.focus();return;}
 opener=document.activeElement;dialog=document.createElement('dialog');dialog.className='student-preview-dialog';dialog.setAttribute('aria-labelledby','student-preview-title');
 dialog.innerHTML='<header class="student-preview-toolbar"><div><h2 id="student-preview-title">Área do aluno</h2><p>Somente leitura · Nenhum dado de aluno é carregado</p></div><label>Visualizar acesso<select data-student-preview-product><option value="kit">Método + Kit Completo</option><option value="essencial">Método + Kit Essencial</option><option value="front">Somente Método UP</option></select></label><button type="button" class="btn secondary" data-student-preview-close>Voltar ao painel</button></header><iframe title="Prévia da área do aluno, somente leitura" sandbox="allow-scripts" referrerpolicy="no-referrer" src="/app/student-preview.html?product=kit#/dashboard"></iframe>';
 document.body.appendChild(dialog);
 dialog.querySelector('[data-student-preview-close]').addEventListener('click',close);
 dialog.querySelector('[data-student-preview-product]').addEventListener('change',event=>{const product=event.target.value;if(['front','essencial','kit'].includes(product))dialog.querySelector('iframe').src='/app/student-preview.html?product='+product+'#/dashboard';});
 dialog.addEventListener('close',()=>{dialog.remove();dialog=null;if(opener?.isConnected)opener.focus();},{once:true});
 dialog.showModal();
}
document.addEventListener('click',event=>{if(event.target.closest('[data-staff-student-preview]'))open();});
window.UPStudentPreview={open,mount(next){context=next;},reset(){close();context=null;}};
})();
