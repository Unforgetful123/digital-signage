import React, { useEffect, useRef, useState } from 'react';
import pb from '../services/pocketbase';
import { logEvent } from '../services/eventLog';
import toast from 'react-hot-toast';
import './DisplayMonitor.css';

const online = d => !!d.last_seen && Date.now() - new Date(d.last_seen).getTime() < 60000;
function duration(d) {
  if (!online(d)) return '—';
  if (d.current_type === 'alert') return d.current_alert_expires ? `${Math.max(0,Math.ceil((Date.parse(d.current_alert_expires)-Date.now())/60000))} min left` : 'Until cleared';
  if (['idle','command'].includes(d.current_type) || !d.current_title) return '—';
  if (d.current_duration > 0) return `${d.current_duration}s${d.current_type === 'ppt' ? ' / page' : ''}`;
  return ['video','youtube'].includes(d.current_type) ? 'Full video' : 'Not reported';
}
export default function DisplayMonitor() {
  const [displays,setDisplays] = useState([]);
  const [filter,setFilter] = useState('all');
  const [deviceRole,setDeviceRole] = useState('all');
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [modal,setModal] = useState(null);
  const [location,setLocation] = useState('');
  const [displayName,setDisplayName] = useState('');
  const [,tick] = useState(0);
  const dialog = useRef(null);
  useEffect(() => {
    let disposed=false, unsubscribe;
    async function start(){
      try {
        unsubscribe=await pb.collection('displays').subscribe('*',({action,record})=>{
          if(disposed)return;
          setDisplays(prev=>action==='delete'?prev.filter(d=>d.id!==record.id):[...prev.filter(d=>d.id!==record.id),record]);
        });
        if(disposed){unsubscribe();return;}
        const data=await pb.collection('displays').getFullList({sort:'location,name',requestKey:null});
        if(!disposed)setDisplays(data);
      }catch(e){if(!disposed)setError('Could not load displays. Check the backend connection and permissions.');}
      finally{if(!disposed)setLoading(false);}
    }
    start(); const timer=setInterval(()=>tick(n=>n+1),15000);
    return ()=>{disposed=true;clearInterval(timer);unsubscribe?.();};
  },[]);
  useEffect(()=>{if(modal)dialog.current?.showModal();else dialog.current?.close();},[modal]);
  const name=d=>d.name||d.code||'Display';
  function open(action,d){setError('');setLocation(d.location||'');setDisplayName(d.name||'');setModal({action,d});}
  async function perform(action,d){
    if(busy)return;
    setBusy(true);setError('');
    try{
      let payload, details;
      if(action==='refresh'){payload={current_type:'command',current_title:'REFRESH'};details='Refresh requested';}
      if(action==='rename'){payload={name:displayName.trim(),location:location.trim()};details=`${name(d)} (${d.location||'Unassigned'}) → ${displayName.trim()} (${location.trim()})`;}
      if(action==='clear_alert'){payload={current_announcement_mode:'',current_audio:'',current_offer:'',current_answer:'',current_type:'idle',current_title:'',current_command:'',current_lang:'',current_scope:'',current_duration:0};details='Alert cleared';}
      if(action==='remove')await pb.collection('displays').delete(d.id);
      else await pb.collection('displays').update(d.id,payload,{requestKey:null});
      setDisplays(prev=>action==='remove'?prev.filter(x=>x.id!==d.id):prev.map(x=>x.id===d.id?{...x,...payload}:x));
      setModal(null);
      toast.success(action==='rename'?'Display updated.':action==='remove'?'Display removed.':'Command sent.');
      await logEvent({action:`display_${action}`,target:name(d),details:details||'Display removed',source:'display_monitor'});
    }catch(e){setError(e.message||'Action failed. Please try again.');}finally{setBusy(false);}
  }
  const sorted=[...displays].sort((a,b)=>(a.location||'').localeCompare(b.location||'')||name(a).localeCompare(name(b)));
  const visible=sorted.filter(d=>(filter==='all'||(filter==='online')===online(d))&&(deviceRole==='all'||(deviceRole==='pc_receiver'?d.device_role==='pc_receiver':d.device_role!=='pc_receiver')));
  return <section className="display-monitor">
    <div className="monitor-toolbar"><div><p className="subtitle">Displays and PC receivers across your locations</p><small>{displays.length} devices · {displays.filter(online).length} online</small></div>
    <label>Device type <select aria-label="Device type" value={deviceRole} onChange={e=>setDeviceRole(e.target.value)}><option value="all">All devices</option><option value="display">Signage displays</option><option value="pc_receiver">PC receivers</option></select></label><div className="status-filters" aria-label="Display status">{['all','online','offline'].map(f=><button key={f} aria-pressed={filter===f} className={filter===f?'selected':''} onClick={()=>setFilter(f)}>{f}</button>)}</div></div>
    {error&&!modal&&<p role="alert" className="monitor-error">{error}</p>}
    {loading?<p role="status">Loading displays…</p>:visible.length===0?<div className="empty-state">No {filter==='all'?'':filter+' '}displays found.</div>:null}
    <div className="monitor-grid">{visible.map(d=><article className={`display-card ${online(d)?"card-online":"card-offline"}`} key={d.id}>
      <div className="display-card-head"><div><h2>{name(d)}</h2><small>{d.device_role==='pc_receiver'?'PC Receiver':'Signage Display'} · {d.code||'No code'} · {d.location||'Unassigned'}</small></div><span className={`status-badge ${online(d)?'online':'offline'}`}>{online(d)?'Online':'Offline'}</span></div>
      <div className="playback-pair"><div className="now-playing"><span>{online(d)?'NOW PLAYING':'LAST REPORTED'}</span><strong>{d.current_title||'Idle'}</strong><small>{d.current_type||'No content'}</small></div>
      <div className="now-playing"><span>{online(d)?'UP NEXT':'LAST REPORTED NEXT'}</span><strong>{d.device_role==='pc_receiver'?'Broadcasts only':d.next_title||'Not reported yet'}</strong><small>{d.device_role==='pc_receiver'?'No media queue':d.current_type==='alert'?'After alert clears':d.next_type||'Refresh the updated player to report its queue'}</small></div></div>
      <dl className="playback-details"><div><dt>Duration</dt><dd>{duration(d)}</dd></div><div><dt>Playback target</dt><dd>{['idle','command'].includes(d.current_type)?'—':d.current_scope||'Not reported'}</dd></div></dl>
      <div className="display-card-footer"><small>Last seen<br/>{d.last_seen?new Date(d.last_seen).toLocaleString():'Never'}</small>
      <details className="display-actions" onKeyDown={e=>{if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary').focus();}}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))e.currentTarget.open=false;}}>
        <summary aria-label={`Actions for ${name(d)}`}>Actions ▾</summary><div className="action-menu">
        {['refresh','rename',...(d.current_type==='alert'?['clear_alert']:[]),'remove'].map(action=><button key={action} disabled={busy} className={action==='remove'?'remove-action':''} onClick={e=>{e.currentTarget.closest('details').open=false;action==='refresh'||action==='clear_alert'?perform(action,d):open(action,d);}}>{action==='clear_alert'?'Clear alert':action[0].toUpperCase()+action.slice(1)}</button>)}
      </div></details></div>
    </article>)}</div>
    <dialog ref={dialog} className="display-dialog" aria-labelledby="display-dialog-title" onCancel={e=>{e.preventDefault();if(!busy)setModal(null);}}>
      {modal&&<form onSubmit={e=>{e.preventDefault();if(modal.action==='rename'&&(!location.trim()||!displayName.trim()))return;perform(modal.action,modal.d);}}>
        <div className="dialog-heading"><h2 id="display-dialog-title">{modal.action==='rename'?'Rename display & location':'Remove display'}</h2><button type="button" aria-label="Close dialog" disabled={busy} onClick={()=>setModal(null)}>×</button></div>
        <p>{name(modal.d)} · {modal.d.location||'Unassigned'}</p>
        {modal.action==='rename'&&<><label htmlFor="rename-display">Display name</label><input autoFocus id="rename-display" value={displayName} onChange={e=>setDisplayName(e.target.value)} required maxLength={100} disabled={busy}/><label htmlFor="rename-location">Location</label><input id="rename-location" list="known-locations" value={location} onChange={e=>setLocation(e.target.value)} required maxLength={100} disabled={busy}/><datalist id="known-locations">{[...new Set(displays.map(d=>d.location).filter(Boolean))].map(loc=><option key={loc} value={loc}/>)}</datalist><p className="subtitle">Updates this device only. It will receive content and broadcasts for its new location. Existing content targets and other devices are not renamed.</p></>}
        {modal.action==='remove'&&<p>This device will need to register again before receiving content or broadcasts.</p>}
        {error&&<p role="alert" className="monitor-error">{error}</p>}
        <div className="dialog-actions"><button type="button" disabled={busy} onClick={()=>setModal(null)}>Cancel</button><button type="submit" disabled={busy||(modal.action==='rename'&&(!location.trim()||!displayName.trim()||(location.trim()===modal.d.location&&displayName.trim()===modal.d.name)))}>{busy?'Saving…':modal.action==='rename'?'Save changes':'Remove display'}</button></div>
      </form>}
    </dialog>
  </section>;
}
