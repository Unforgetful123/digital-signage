const {test}=require('node:test');const assert=require('node:assert/strict');
const {nextWindowState:next}=require('../window-state.cjs');
test('first setup opens, registered startup hides, alert opens once',()=>{
 assert.equal(next(null,{state:'setup'}).action,'setup');
 assert.equal(next(null,{state:'idle'}).action,'hide');
 const msg={state:'alert',id:'a',mode:''};const first=next({state:'idle'},msg);
 assert.equal(first.action,'alert');assert.equal(next(first.next,msg).action,'none');
 assert.equal(next(first.next,{...msg,id:'b'}).action,'alert');
 assert.equal(next(first.next,{state:'idle'}).action,'hide');
});
test('removal opens configuration and invalid IPC is ignored',()=>{
 assert.equal(next({state:'idle'},{state:'removed'}).action,'setup');
 for(const msg of [null,{}, {state:'evil'}, {state:'alert',mode:'live'}, {state:'alert',id:'a',mode:'evil'}])assert.equal(next(null,msg),null);
});
