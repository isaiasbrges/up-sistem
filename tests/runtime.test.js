const {test}=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {run}=require('../server/run');
test('runtime waits for startup and drains once on repeated shutdown requests',async()=>{
 const signals=new EventEmitter();let count=0,release;
 const env={example:true};
 const runtime=await run({env,signals,createRuntime:async options=>{assert.equal(options.env,env);return {stop:()=>{count++;return new Promise(r=>{release=r;});}};}});
 signals.emit('SIGTERM');signals.emit('SIGINT');
 const stopped=runtime.stop();await new Promise(r=>setImmediate(r));assert.equal(count,1);
 release();await stopped;
 assert.equal(signals.listenerCount('SIGTERM'),0);assert.equal(signals.listenerCount('SIGINT'),0);
 await runtime.stop();assert.equal(count,1);
});
test('failed startup never installs shutdown handlers',async()=>{
 const signals=new EventEmitter();
 await assert.rejects(run({signals,createRuntime:async()=>{throw Error('Startup unavailable');}}),/unavailable/);
 assert.equal(signals.listenerCount('SIGTERM'),0);
});
