const {test}=require('node:test');
const assert=require('node:assert/strict');
const {derive}=require('../app/journey');
const state=(entitlements={front:true,kit:true})=>({entitlements,diagnostics:[],finances:[],kitTransactions:[],kitBills:[],personalOffers:[],plan:{},checkins:[],procedures:[]});
test('a new journey starts empty and points depend on saved activities, not drafts',()=>{
 const s=state();s.diagnosticDraft={roda:{},radar:{}};s.financeDraft={revenue:50000};s.offerDraft={name:'Draft'};
 const p=derive(s);assert.equal(p.xp,0);assert.equal(p.level,1);assert.equal(p.next.id,'diagnostic');assert.equal(p.missions.length,10);
});
test('missions respect separate Front and Kit access',()=>{
 const kit=derive(state({kit:true})),essential=derive(state({essencial:true})),front=derive(state({front:true}));
 assert.equal(kit.missions.some(x=>x.id==='diagnostic'),false);
 assert.equal(kit.next.id,'ledger');assert.deepEqual(essential.missions.map(x=>x.id),['ledger','bills']);
 assert.deepEqual(front.missions.map(x=>x.id),['diagnostic','finance','review']);assert.equal(derive(state({})).total,0);
});
test('repetition and monetary amounts cannot multiply points',()=>{
 const s=state();s.kitTransactions=[{id:'1',value:1}];const before=derive(s).xp;
 s.kitTransactions.push({id:'2',value:1000000});assert.equal(derive(s).xp,before);
 s.diagnostics=[{id:'same',result:{}},{id:'same',result:{}}];assert.equal(derive(s).missions.find(x=>x.id==='review').done,false);
 s.diagnostics.push({id:'other',result:{}});assert.equal(derive(s).missions.find(x=>x.id==='review').done,true);
});
test('complete plans, offers and procedures unlock their corresponding achievements',()=>{
 const s=state();s.plan={result:'A result'};assert.equal(derive(s).missions.find(x=>x.id==='plan').done,false);
 s.plan=Object.fromEntries(['result','decision1','decision2','decision3','decision4','phase1','phase2','phase3'].map(k=>[k,'Saved text']));
 s.personalOffers=[{id:'o',name:'Offer',audience:'People',problem:'Need'}];s.procedures=[{id:'p',task:'Close month',owner:'Owner',steps:'Check records'}];
 assert.deepEqual(derive(s).completed.map(x=>x.id),['plan','offer','procedure']);
 s.procedures=[];assert.equal(derive(s).completed.some(x=>x.id==='procedure'),false);
});
test('weekly reviews require advances and priority and count distinct ISO weeks across years',()=>{
 const s=state(),entry=(id,date,answers=['Progress','','','','Next'])=>({id,date,answers});
 s.checkins=[entry('1','2026-12-28'),entry('2','2027-01-01'),entry('3','2027-01-11')];
 assert.equal(derive(s).weeks,2);assert.equal(derive(s).missions.find(x=>x.id==='rhythm').done,false);
 s.checkins.push(entry('4','2027-02-01'),entry('5','2027-02-08',['','','','','']));
 assert.equal(derive(s).weeks,3);assert.equal(derive(s).missions.find(x=>x.id==='rhythm').done,true);
});
test('completed available journey reaches 100 percent and has no fabricated next mission',()=>{
 const s=state({essencial:true});s.kitTransactions=[{id:'t',value:10}];s.kitBills=[{id:'b',desc:'Bill',value:1,due:'2026-10-30'}];
 const p=derive(s);assert.equal(p.percent,100);assert.equal(p.level,5);assert.equal(p.xp,p.total);assert.equal(p.next,undefined);
});
