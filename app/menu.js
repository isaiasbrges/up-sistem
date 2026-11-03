/* Preferências de navegação locais; recolher o menu não recria os formulários. */
(()=>{
 'use strict';
 let collapsed=false,mobileOpen=false,previousFocus;
 try{collapsed=localStorage.getItem('up-sidebar-collapsed')==='true';}catch{}
 const narrow=()=>window.matchMedia('(max-width:760px)').matches;
 const app=()=>document.querySelector('.app-body');
 function closePopovers(){
  for(const panel of document.querySelectorAll('.header-popover'))panel.hidden=true;
  document.querySelector('[data-tool-search]')?.setAttribute('aria-expanded','false');
  for(const button of document.querySelectorAll('[aria-controls="notification-panel"]'))button.setAttribute('aria-expanded','false');
 }
 function sync(){
  const root=app();if(!root)return;
  root.classList.toggle('sidebar-collapsed',collapsed);
  root.classList.toggle('mobile-menu-open',mobileOpen);
  const drawer=narrow()&&mobileOpen,side=root.querySelector('.side');
  if(drawer){side.setAttribute('role','dialog');side.setAttribute('aria-modal','true');}
  else{side.removeAttribute('role');side.removeAttribute('aria-modal');}
  for(const element of root.querySelectorAll('.main,.bottom-nav'))element.inert=drawer;
  for(const button of document.querySelectorAll('[data-action="toggle-sidebar"]')){
   const expanded=narrow()?mobileOpen:!collapsed;
   button.setAttribute('aria-expanded',String(expanded));
   button.setAttribute('aria-label',narrow()?(expanded?'Fechar menu':'Abrir menu'):(expanded?'Recolher menu':'Expandir menu'));
   button.title=button.getAttribute('aria-label');
  }
 }
 function closeMobile(){
  mobileOpen=false;sync();
  if(previousFocus?.isConnected)previousFocus.focus();
 }
 document.addEventListener('click',event=>{
  const toggle=event.target.closest('[data-action="toggle-sidebar"]');
  if(toggle){
   event.preventDefault();closePopovers();
   if(narrow()){
    mobileOpen=!mobileOpen;
    if(mobileOpen)previousFocus=document.activeElement;
    sync();
    if(mobileOpen)document.querySelector('.side .nav-link')?.focus();
    else if(previousFocus?.isConnected)previousFocus.focus();
   }else{
    collapsed=!collapsed;
    try{localStorage.setItem('up-sidebar-collapsed',String(collapsed));}catch{}
    sync();
   }
   return;
  }
  if(event.target.closest('[data-action="close-sidebar"]')){closeMobile();return;}
  const notifications=event.target.closest('[data-action="toggle-notifications"]');
  if(notifications){const panel=document.querySelector('#notification-panel');const open=panel.hidden;closePopovers();panel.hidden=!open;notifications.setAttribute('aria-expanded',String(open));return;}
  if(event.target.closest('[data-go]')){mobileOpen=false;closePopovers();sync();}
  else if(!event.target.closest('.header-popover,.tool-search'))closePopovers();
 });
 document.addEventListener('input',event=>{
  if(!event.target.matches('[data-tool-search]'))return;
  const query=event.target.value.trim().toLocaleLowerCase('pt-BR');
  const results=document.querySelector('#tool-search-results');
  let found=0;
  for(const item of results.querySelectorAll('[data-go]')){
   const match=item.textContent.toLocaleLowerCase('pt-BR').includes(query);
   item.hidden=!match;if(match)found++;
  }
  results.querySelector('.search-empty').hidden=found>0;
  results.hidden=!query;
  event.target.setAttribute('aria-expanded',String(!!query));
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){closePopovers();if(mobileOpen)closeMobile();document.querySelector('[data-tool-search]')?.setAttribute('aria-expanded','false');}
  if(event.target.matches('[data-tool-search]')&&event.key==='ArrowDown'){
   const first=document.querySelector('#tool-search-results button:not([hidden])');
   if(first){event.preventDefault();first.focus();}
  }
  if(mobileOpen&&event.key==='Tab'){
   const items=[...document.querySelectorAll('.side button')].filter(el=>el.getClientRects().length);
   const first=items[0],last=items.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
 });
 window.addEventListener('resize',()=>{if(!narrow())mobileOpen=false;sync();});
 window.UPMenu={hydrate(){mobileOpen=false;sync();}};
})();
