'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {distribute}=require('../app/code-inputs');
const fields=()=>Array.from({length:6},()=>({value:'',focus(){this.focused=true;},dispatchEvent(){}}));
test('colar o código completo distribui os seis dígitos',()=>{const inputs=fields();assert.equal(distribute(inputs,0,'123 456'),6);assert.equal(inputs.map(x=>x.value).join(''),'123456');assert.equal(inputs[5].focused,true);});
test('colar a partir de outro campo preserva os dígitos anteriores',()=>{const inputs=fields();distribute(inputs,0,'123');distribute(inputs,3,'45');assert.equal(inputs.map(x=>x.value).join(''),'12345');assert.equal(inputs[0].value,'1');assert.equal(inputs[5].focused,true);});
test('colagem filtra caracteres e respeita o espaço restante',()=>{const inputs=fields();assert.equal(distribute(inputs,5,'a7b89'),1);assert.equal(inputs[5].value,'7');assert.equal(distribute(inputs,0,'sem números'),0);});
