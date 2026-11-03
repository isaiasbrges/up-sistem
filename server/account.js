'use strict';
require('dotenv').config({quiet:true});
const {createStore}=require('./store');
(async()=>{const email=(process.argv[2]||'').trim().toLowerCase(),plan=process.argv[3]||'front';if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['front','essencial','kit'].includes(plan))throw Error('Uso: npm run account -- email@dominio.com front|essencial|kit');const store=await createStore();try{const account=await store.get(email)||{user:{name:'Aluno UP',email},entitlements:{},state:{}};account.entitlements[plan]=true;await store.put(email,account);console.log('Conta configurada.');}finally{await store.close();}})().catch(error=>{console.error(error.message);process.exitCode=1;});
