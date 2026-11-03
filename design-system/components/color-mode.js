/* Executado no head para aplicar a preferência antes da primeira pintura. */
(()=>{
 'use strict';
 const key='up-color-mode',root=document.documentElement;
 const system=window.matchMedia('(prefers-color-scheme: dark)');
 const valid=value=>value==='dark'||value==='light';
 let preference;
 try{const saved=localStorage.getItem(key);if(valid(saved))preference=saved;}catch{}
 const icons={
  dark:'<path d="M20.9 13.1A9 9 0 0 1 10.9 3.1 9 9 0 1 0 20.9 13.1Z"/>',
  light:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
 };
 function content(){const dark=root.dataset.theme==='dark';return {dark,label:dark?'Ativar modo claro':'Ativar modo escuro',icon:`<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[dark?'light':'dark']}</svg>`};}
 function sync(){const {dark,label,icon}=content();for(const button of document.querySelectorAll('[data-theme-toggle]')){button.setAttribute('aria-label',label);button.setAttribute('title',label);button.setAttribute('aria-pressed',String(dark));button.innerHTML=icon;}}
 function apply(){root.dataset.theme=preference||(system.matches?'dark':'light');sync();}
 function toggle(){preference=root.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem(key,preference);}catch{}apply();}
 function button(){const {dark,label,icon}=content();return `<button type="button" class="header-icon theme-toggle" data-theme-toggle aria-label="${label}" title="${label}" aria-pressed="${dark}">${icon}</button>`;}
 apply();
 document.addEventListener('click',event=>{if(event.target.closest('[data-theme-toggle]'))toggle();});
 system.addEventListener('change',()=>{if(!preference)apply();});
 window.addEventListener('storage',event=>{if(event.key===key||event.key===null){preference=valid(event.newValue)?event.newValue:undefined;apply();}});
 window.UPTheme={button};
})();
