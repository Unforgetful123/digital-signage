import test from 'node:test';
import assert from 'node:assert/strict';
import {buildQueue,orderedContent,contentStatus,queuePosition,keyOf,moveItem} from '../shared/playback.mjs';
import {automaticBackend,resolveBackend,validateBackend} from '../shared/backend-url.mjs';
const now=new Date(2026,10,17,12).getTime();
const media=(id,extra={})=>({id,type:'image',title:id,created:`2026-11-${id==='a'?'10':'11'}`,location:'Global',...extra});
test('saved order precedes new uploads; deleted IDs and duplicate titles do not break identity',()=>{
 assert.deepEqual(orderedContent([media('a',{title:'Same'}),media('b',{title:'Same'}),media('c')],['deleted','b','a']).map(i=>i.id),['b','a','c']);
});
test('location filtering and one-sided time limits; scheduled items become eligible without edits',()=>{
 const items=[media('a'),media('b',{location:' Reception '}),media('c',{location:'Ward'}),media('d',{start_time:new Date(now+1000).toISOString()}),media('e',{end_time:new Date(now).toISOString()})];
 assert.deepEqual(buildQueue(items,[],['a','b','c','d','e'],'reception',now).map(i=>i.id),['a','b']);
 assert.deepEqual(buildQueue(items,[],['a','b','c','d','e'],'reception',now+1000).map(i=>i.id),['a','b','d']);
 assert.equal(contentStatus(media('x',{start_time:'broken'}),now),'Invalid schedule');
});
test('birthday insertion is included in next item; midnight changes eligibility',()=>{
 const items=['a','b','c','d'].map(id=>media(id));
 const people=[{id:'a',name:'Birthday',dob:'1991-11-17 00:00:00.000Z'}];
 const q=buildQueue(items,people,['a','b','c','d'],'Reception',now);
 assert.deepEqual(q.map(keyOf),['content:a','content:b','content:c','birthday:a','content:d']);
 assert.equal(queuePosition(q,'content:c').next.title,'Birthday');
 assert.equal(buildQueue(items,people,[],'Reception',new Date(2026,10,18).getTime()).length,4);
});
test('reorder preserves active item and changes its successor; wrapping, single, empty and removed items',()=>{
 const q=['a','b','c'].map(id=>media(id));
 const reordered=orderedContent(q,moveItem(['a','b','c'],2,1));
 assert.equal(queuePosition(reordered,'content:a').next.id,'c');
 assert.equal(queuePosition(reordered,'content:b').item.id,'b');
 assert.equal(queuePosition(reordered,'content:b').next.id,'a');
 assert.equal(queuePosition([q[0]],'content:a').next.id,'a');
 assert.equal(queuePosition([],'content:a').item,null);
 assert.equal(queuePosition(reordered,'deleted').item.id,'a');
});
test('offline skips youtube but keeps other eligible media',()=>{
 assert.deepEqual(buildQueue([media('a'),media('b',{type:'youtube'})],[],['a','b'],'Reception',now,false).map(i=>i.id),['a']);
});
test('browser follows host even with stale env; saved override and Electron remain configurable',()=>{
 const browser=new URL('http://192.168.124.51:3000/');
 assert.equal(resolveBackend(browser,null,'http://old-ip:8090'),'http://192.168.124.51:8090');
 assert.equal(resolveBackend(browser,'http://signage-server:8090/'),'http://signage-server:8090');
 assert.equal(automaticBackend(new URL('http://192.168.124.51:5173')),'http://192.168.124.51:8090');
 assert.equal(automaticBackend(new URL('https://[::1]:3000')),'https://[::1]:8090');
 assert.equal(resolveBackend(new URL('file:///app/index.html'),null),'http://127.0.0.1:8090');
 assert.throws(()=>validateBackend('javascript:alert(1)'));
 assert.throws(()=>validateBackend('http://user:password@server:8090'));
});
