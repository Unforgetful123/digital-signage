import React,{useEffect,useRef,useState} from 'react';
import PocketBase from 'pocketbase';
import AnnouncementPlayer from '../components/AnnouncementPlayer';
import EmergencyPopup from './EmergencyPopup';
import {readAlert} from './alert-state.mjs';
import './receiver.css';
const desktop=window.receiverDesktop;
const KEY='vrl_pc_receiver';
function loadConfig(){try{const c=JSON.parse(localStorage.getItem(KEY));return c?.id&&c?.server?c:null;}catch{return null;}}
function options(){return {requestKey:null,signal:AbortSignal.timeout(8000)};}
function explain(error){return error.status===403?'Server permissions denied this receiver. Ask the administrator to check the displays collection rules.':error.message||'Could not contact the server.';}
export default function Receiver(){
 const [config,setConfig]=useState(loadConfig);
 const [server,setServer]=useState(config?.server||'http://192.168.0.104:8090');
 const [name,setName]=useState(config?.name||'');const [location,setLocation]=useState(config?.location||'');
 const [connection,setConnection]=useState('Connecting');const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);const [removed,setRemoved]=useState(false);
 const [alert,setAlert]=useState(null);const [editing,setEditing]=useState(false);
 const [startup,setStartup]=useState(false);const [startupSupported,setStartupSupported]=useState(false);
 const client=useRef(null);const refresh=useRef(()=>{});const completed=useRef('');const current=useRef(null);
 const finish=useRef(()=>{});
 useEffect(()=>{desktop?.info().then(info=>{setName(n=>n||info.hostname);setStartup(info.startup);setStartupSupported(info.startupSupported);}).catch(()=>{});},[]);
 useEffect(()=>{
  if(!config||removed){desktop?.status({state:removed?'removed':'setup',connection:removed?'Registration removed':'Setup required'});return;}
  const pb=new PocketBase(config.server);client.current=pb;
  let disposed=false,reading=false,dirty=false,heartbeatAt=0,unsub;
  const updateAlert=record=>{
   if(disposed)return;
   current.current=record;
   const next=readAlert(record,Date.now(),completed.current);
   if(next?.mode==='record')next.audioUrl=pb.files.getURL(record,next.audioFile);
   setAlert(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next);
  };
  finish.current=id=>{completed.current=id;updateAlert(current.current);};
  async function sync(){
   if(disposed)return;if(reading){dirty=true;return;}reading=true;
   try{
    const record=await pb.collection('displays').getOne(config.id,options());
    if(disposed)return;
    setConnection('Connected');setError('');updateAlert(record);
    setName(record.name||config.name);setLocation(record.location||'');
    if(record.current_type==='command'&&['REFRESH','RESTART'].includes(record.current_title)){
     // A refresh here means re-reading the receiver record; do not clear or overwrite
     // commands, since a newer alert can arrive between a read and a write.
     completed.current='';
    }
    if(Date.now()-heartbeatAt>15000){
     heartbeatAt=Date.now();
     await pb.collection('displays').update(config.id,{last_seen:new Date().toISOString(),device_role:'pc_receiver'},options());
    }
   }catch(e){
    if(disposed)return;
    if(e.status===404){setRemoved(true);current.current=null;setAlert(null);setError('This PC was removed from the admin monitor. Register again to receive broadcasts.');}
    else {setConnection('Disconnected — retrying');setError(explain(e));}
   }finally{reading=false;if(dirty&&!disposed){dirty=false;queueMicrotask(sync);}}
  }
  refresh.current=sync;
  const disconnect=desktop?.onRefresh(sync);
  window.addEventListener('online',sync);
  sync();
  pb.collection('displays').subscribe(config.id,()=>sync()).then(fn=>{unsub=fn;if(disposed)fn();}).catch(()=>{/* Polling remains active if realtime is unavailable. */});
  const poll=setInterval(sync,3000);
  const expiry=setInterval(()=>updateAlert(current.current),500);
  return()=>{disposed=true;clearInterval(poll);clearInterval(expiry);unsub?.();pb.realtime.disconnect();disconnect?.();window.removeEventListener('online',sync);refresh.current=()=>{};};
 },[config,removed]);
 useEffect(()=>{
  if(!config||removed)return;
  desktop?.status({state:alert?'alert':'idle',id:alert?.id,mode:alert?.mode||'',connection});
  desktop?.info().then(info=>setStartup(info.startup)).catch(()=>{});
 },[config,removed,alert?.id,alert?.mode,connection]);
 async function register(event){
  event.preventDefault();setBusy(true);setError('');
  try{
   const url=new URL(server.trim());
   if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw Error('Enter a valid http:// or https:// PocketBase address without credentials or query parameters.');
   const address=url.href.replace(/\/$/,'');const pb=new PocketBase(address);
   await pb.health.check(options());
   const fields={name:name.trim(),location:location.trim(),device_role:'pc_receiver',device_info:'VRL PC Receiver',last_seen:new Date().toISOString()};
   if(!fields.name||!fields.location)throw Error('Enter this PC’s name and location.');
   let record;
   if(config&&!removed) {
    // Editing server/network details reuses the existing ID; never silently registers on a different database.
    record=await pb.collection('displays').update(config.id,fields,options());
   }else record=await pb.collection('displays').create({...fields,code:`PC-${crypto.randomUUID().slice(0,8).toUpperCase()}`},options());
   const saved={id:record.id,server:address,name:fields.name,location:fields.location};
   localStorage.setItem(KEY,JSON.stringify(saved));completed.current='';setRemoved(false);setEditing(false);setConfig(saved);
   if(record.device_role!=='pc_receiver')setError('Apply the PC receiver migration on the server so this PC is identified correctly.');
  }catch(e){setError(explain(e));}finally{setBusy(false);}
 }
 if(alert){
  const ended=()=>finish.current(alert.id);
  return <main className="receiver-popup">{alert.mode?<AnnouncementPlayer key={alert.id} announcement={alert} displayId={config.id} client={client.current} onEnded={ended}/>:<EmergencyPopup alert={alert}/>}<button className="hide-popup" onClick={()=>desktop?.hide()}>Hide window · audio continues</button></main>;
 }
 const showForm=!config||removed||editing;
 return <main className="receiver-shell"><div className="receiver-brand">VRL <span>PC RECEIVER</span></div><h1>{showForm?'Connect this PC':'Ready for broadcasts'}</h1><p className="receiver-intro">{showForm?'Use your central PocketBase address and the location used in the admin panel.':'This PC listens in the background. Alerts for its location or Global open automatically.'}</p>
 {error&&<p className="receiver-error" role="alert">{error}</p>}
 {showForm?<form onSubmit={register}><label>Central server<input required type="url" value={server} onChange={e=>setServer(e.target.value)} placeholder="http://192.168.0.104:8090"/></label><label>PC name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="Reception PC"/></label><label>Location<input required maxLength={100} value={location} onChange={e=>setLocation(e.target.value)} placeholder="Reception"/></label><div className="receiver-actions"><button disabled={busy}>{busy?'Connecting…':config&&!removed?'Save connection':'Activate receiver'}</button>{config&&!removed&&<button type="button" className="secondary" onClick={()=>setEditing(false)}>Cancel</button>}</div></form>:<><span className={`connection ${connection==='Connected'?'connected':''}`}>{connection}</span><dl><dt>PC</dt><dd>{name}</dd><dt>Location</dt><dd>{location}</dd><dt>Server</dt><dd>{config.server}</dd></dl><div className="receiver-actions"><button onClick={()=>desktop?.hide()}>Run in background</button><button className="secondary" onClick={()=>{setServer(config.server);setEditing(true);}}>Connection settings</button></div><p className="receiver-note">Use the tray icon to reopen this page. Closing the window keeps the receiver running; Quit receiver stops it.</p></>}
 {startupSupported&&<label className="startup"><input type="checkbox" checked={startup} onChange={async e=>{try{const result=await desktop.startup(e.target.checked);setStartup(result.enabled);}catch(err){setError(err.message);}}}/>Start automatically when I sign in to Windows</label>}
 {!desktop&&<p className="receiver-note">Browser preview: install the Electron receiver for tray and automatic popup support.</p>}
 </main>;
}
