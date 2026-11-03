const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require.resolve('../design-system/components/color-mode.js'),'utf8');
function setup({saved=null,dark=false,unavailable=false}={}){
 const listeners={},windowListeners={},root={dataset:{}},store=new Map(saved?[['up-color-mode',saved]]:[]);
 const control={attributes:{},setAttribute(k,v){this.attributes[k]=v;},innerHTML:''};
 const media={matches:dark,addEventListener(name,fn){this.change=fn;}};
 const window={matchMedia:()=>media,addEventListener(name,fn){windowListeners[name]=fn;}};
 const document={documentElement:root,querySelectorAll:()=>[control],addEventListener(name,fn){listeners[name]=fn;}};
 const localStorage={getItem:k=>{if(unavailable)throw Error('unavailable');return store.get(k)||null;},setItem:(k,v)=>{if(unavailable)throw Error('unavailable');store.set(k,v);}};
 vm.runInNewContext(source,{window,document,localStorage});
 return {window,root,media,store,control,windowListeners,toggle:()=>listeners.click({target:{closest:()=>control}})};
}
test('theme follows the device until an explicit choice, then persists and updates accessible labels',()=>{
 const s=setup({dark:true});
 assert.equal(s.root.dataset.theme,'dark');
 assert.equal(s.control.attributes['aria-label'],'Ativar modo claro');
 s.media.matches=false;s.media.change();assert.equal(s.root.dataset.theme,'light');
 s.toggle();assert.equal(s.store.get('up-color-mode'),'dark');
 assert.equal(s.control.attributes['aria-pressed'],'true');
 s.media.change();assert.equal(s.root.dataset.theme,'dark');
 assert.match(s.window.UPTheme.button(),/Ativar modo claro/);
 const restored=setup({saved:s.store.get('up-color-mode')});assert.equal(restored.root.dataset.theme,'dark');
});
test('theme remains usable when storage is unavailable',()=>{
 const s=setup({unavailable:true});s.toggle();assert.equal(s.root.dataset.theme,'dark');s.toggle();assert.equal(s.root.dataset.theme,'light');
});
test('another tab can update or clear the preference',()=>{
 const s=setup({saved:'dark'});
 s.windowListeners.storage({key:'up-color-mode',newValue:'light'});assert.equal(s.root.dataset.theme,'light');
 s.media.matches=true;s.windowListeners.storage({key:null,newValue:null});assert.equal(s.root.dataset.theme,'dark');
});
