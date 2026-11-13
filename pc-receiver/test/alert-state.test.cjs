const {test}=require('node:test');
const assert=require('node:assert/strict');
const load=()=>import('../../display-window/src/receiver/alert-state.mjs');
const now=Date.parse('2026-11-05T10:00:00Z');
const base={id:'pc1',current_type:'alert',current_alert_id:'one',current_command:'fire',current_title:'Exit now',current_scope:'Reception'};
test('idle, expired and malformed expiry never open a popup',async()=>{
 const {readAlert}=await load();
 assert.equal(readAlert({...base,current_type:'idle'},now),null);
 assert.equal(readAlert({...base,current_alert_expires:new Date(now-1).toISOString()},now),null);
 assert.equal(readAlert({...base,current_alert_expires:'invalid'},now),null);
 assert.equal(readAlert({...base,current_alert_expires:new Date(now+1000).toISOString()},now).id,'one');
});
test('live sessions stop when broadcaster heartbeat is stale or absent',async()=>{
 const {readAlert}=await load();const live={...base,current_announcement_mode:'live',current_offer:'offer'};
 assert.equal(readAlert(live,now),null);
 assert.equal(readAlert({...live,current_live_seen:new Date(now-26000).toISOString()},now),null);
 assert.equal(readAlert({...live,current_live_seen:new Date(now).toISOString()},now).mode,'live');
});
test('heartbeat changes preserve alert identity; replacement has distinct identity',async()=>{
 const {readAlert}=await load();
 assert.equal(readAlert(base,now).id,readAlert({...base,last_seen:'changed'},now).id);
 assert.notEqual(readAlert(base,now).id,readAlert({...base,current_alert_id:'two'},now).id);
 const legacy={...base,current_alert_id:''};
 assert.equal(readAlert(legacy,now).id,readAlert({...legacy,updated:'changed'},now).id);
 assert.notEqual(readAlert(legacy,now).id,readAlert({...legacy,current_title:'Different'},now).id);
});
test('completed session stays suppressed until another session',async()=>{
 const {readAlert}=await load();assert.equal(readAlert(base,now,'one'),null);
 assert.equal(readAlert({...base,current_alert_id:'two'},now,'one').id,'two');
});
