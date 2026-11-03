const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require.resolve('../app/charts.js'),'utf8');

function setup({reduced=false,observer=true}={}){
 const observed=new Set(),instances=[];
 const window={matchMedia:()=>({matches:reduced})};
 if(observer)window.IntersectionObserver=class {
  constructor(callback){this.callback=callback;instances.push(this);}
  observe(node){observed.add(node);}
  unobserve(node){observed.delete(node);}
 };
 vm.runInNewContext(source,{window});
 const node=()=>({isConnected:true,classes:new Set(),setAttribute(){},classList:{add(name){this.owner.classes.add(name);}}});
 const makeNode=()=>{const n=node();n.classList.owner=n;return n;};
 const scope=(...nodes)=>({querySelectorAll:()=>nodes.filter(n=>!n.classes.has('is-visible'))});
 return {api:window.UPCharts,observed,instances,makeNode,scope};
}

test('charts below the fold remain observed across repeated hydration',()=>{
 const {api,observed,instances,makeNode,scope}=setup();
 const first=makeNode(),second=makeNode();
 api.hydrate(scope(first));api.hydrate(scope(second));
 assert.equal(instances.length,1);
 assert.deepEqual([...observed],[first,second]);
 instances[0].callback([{target:first,isIntersecting:true}]);
 assert.equal(first.classes.has('is-visible'),true);
 assert.equal(observed.has(first),false);
 api.hydrate(scope(first,second));
 assert.deepEqual([...observed],[second]);
 second.isConnected=false;api.hydrate(scope());
 assert.equal(observed.size,0);
});

for(const options of [{reduced:true},{observer:false}])test(`charts remain readable without motion: ${JSON.stringify(options)}`,()=>{
 const {api,makeNode,scope,instances}=setup(options),chart=makeNode();
 api.hydrate(scope(chart));
 assert.equal(chart.classes.has('is-visible'),true);
 assert.equal(instances.length,0);
});
