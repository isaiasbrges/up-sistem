'use strict';
const {randomUUID}=require('node:crypto');
function createWorker({db,handlers,now=Date.now,maxAttempts=5,leaseMs=60000,pollMs=2000}) {
  let timer,inFlight,stopping=false;
  async function claim() {
    const at=now(),leaseOwner=randomUUID();
    return db.internal(async client=>{
      await client.query(`UPDATE up_private.jobs SET status='failed',error_code='LEASE_EXHAUSTED'
        WHERE status='running' AND lease_until <= $1 AND attempts >= $2`,[new Date(at),maxAttempts]);
      const {rows:[job]}=await client.query(`SELECT * FROM up_private.jobs
        WHERE available_at <= $1 AND attempts < $2 AND (status='pending' OR (status='running' AND lease_until <= $1))
        ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1`,[new Date(at),maxAttempts]);
      if(!job)return null;
      await client.query("UPDATE up_private.jobs SET status='running',attempts=attempts+1,lease_owner=$2,lease_until=$3 WHERE id=$1",[job.id,leaseOwner,new Date(at+leaseMs)]);
      return {...job,attempts:job.attempts+1,leaseOwner};
    });
  }
  async function process(job) {
    try {
      const handler=handlers[job.kind];
      if(!handler)throw Object.assign(Error('Unsupported job'),{code:'UNSUPPORTED_JOB'});
      await handler(job.payload,job);
      await db.internal(client=>client.query("UPDATE up_private.jobs SET status='done',completed_at=$3,error_code=NULL,lease_until=NULL,lease_owner=NULL WHERE id=$1 AND lease_owner=$2",[job.id,job.leaseOwner,new Date(now())]));
    } catch(error) {
      const code=/^[A-Z0-9_]{1,80}$/.test(error.code||'')?error.code:'TASK_FAILED';
      const status=job.attempts>=maxAttempts||code==='UNSUPPORTED_JOB'?'failed':'pending';
      const delay=Math.min(3600000,1000*2**job.attempts);
      await db.internal(client=>client.query(`UPDATE up_private.jobs SET status=$3,error_code=$4,available_at=$5,lease_until=NULL,lease_owner=NULL
        WHERE id=$1 AND lease_owner=$2`,[job.id,job.leaseOwner,status,code,new Date(now()+delay)]));
    }
  }
  async function runOnce(limit=5) {
    if(inFlight)return inFlight;
    inFlight=(async()=>{let count=0;while(count<limit&&!stopping){const job=await claim();if(!job)break;await process(job);count++;}return count;})();
    try{return await inFlight;}finally{inFlight=null;}
  }
  function start() {
    if(timer)return;stopping=false;
    timer=setInterval(()=>runOnce().catch(()=>console.error('Processamento de tarefas indisponível.')),pollMs);timer.unref();
  }
  async function stop(){stopping=true;clearInterval(timer);timer=null;if(inFlight)await inFlight;}
  return {runOnce,start,stop};
}
module.exports={createWorker};
