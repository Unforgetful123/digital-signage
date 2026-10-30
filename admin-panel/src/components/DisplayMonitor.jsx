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
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [modal,setModal] = useState(null);
  const [location,setLocation] = useState('');
  const [message,setMessage] = useState('');
  const [alertType,setAlertType] = useState('fire');
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
  function open(action,d){setError('');setLocation(d.location||'');setMessage('');setModal({action,d});}
  async function perform(action,d){
    if(busy)return;
    setBusy(true);setError('');
    try{
      let payload, details;
      if(action==='refresh'){payload={current_type:'command',current_title:'REFRESH'};details='Refresh requested';}
      if(action==='move'){payload={location:location.trim()};details=`${d.location||'Unassigned'} → ${location.trim()}`;}
      if(action==='alert'){payload={current_announcement_mode:'',current_audio:'',current_offer:'',current_answer:'',current_lang:'en-IN',current_alert_label:alertType,current_type:'alert',current_title:message.trim(),current_command:alertType,current_scope:`Display: ${name(d)}`,current_duration:0,current_alert_expires:'',current_alert_id:''};details=message.trim();}
      if(action==='clear_alert'){payload={current_announcement_mode:'',current_audio:'',current_offer:'',current_answer:'',current_type:'idle',current_title:'',current_command:'',current_lang:'',current_scope:'',current_duration:0};details='Alert cleared';}
      if(action==='remove')await pb.collection('displays').delete(d.id);
      else await pb.collection('displays').update(d.id,payload,{requestKey:null});
      setDisplays(prev=>action==='remove'?prev.filter(x=>x.id!==d.id):prev.map(x=>x.id===d.id?{...x,...payload}:x));
      setModal(null);
      toast.success(action==='move'?'Display moved.':action==='remove'?'Display removed.':'Command sent.');
      await logEvent({action:`display_${action}`,target:name(d),details:details||'Display removed',source:'display_monitor'});
    }catch(e){setError(e.message||'Action failed. Please try again.');}finally{setBusy(false);}
  }
  const sorted=[...displays].sort((a,b)=>(a.location||'').localeCompare(b.location||'')||name(a).localeCompare(name(b)));
  const visible=sorted.filter(d=>filter==='all'||(filter==='online')===online(d));
  return <section className="display-monitor">
    <div className="monitor-toolbar"><div><p className="subtitle">Playback and controls across your locations</p><small>{displays.length} displays · {displays.filter(online).length} online</small></div>
    <div className="status-filters" aria-label="Display status">{['all','online','offline'].map(f=><button key={f} aria-pressed={filter===f} className={filter===f?'selected':''} onClick={()=>setFilter(f)}>{f}</button>)}</div></div>
    {error&&!modal&&<p role="alert" className="monitor-error">{error}</p>}
    {loading?<p role="status">Loading displays…</p>:visible.length===0?<div className="empty-state">No {filter==='all'?'':filter+' '}displays found.</div>:null}
    <div className="monitor-grid">{visible.map(d=><article className={`display-card ${online(d)?"card-online":"card-offline"}`} key={d.id}>
      <div className="display-card-head"><div><h2>{name(d)}</h2><small>{d.code||'No code'} · {d.location||'Unassigned'}</small></div><span className={`status-badge ${online(d)?'online':'offline'}`}>{online(d)?'Online':'Offline'}</span></div>
      <div className="now-playing"><span>{online(d)?'NOW PLAYING':'LAST REPORTED'}</span><strong>{d.current_title||'Idle'}</strong><small>{d.current_type||'No content'}</small></div>
      <dl className="playback-details"><div><dt>Duration</dt><dd>{duration(d)}</dd></div><div><dt>Playback target</dt><dd>{['idle','command'].includes(d.current_type)?'—':d.current_scope||'Not reported'}</dd></div></dl>
      <div className="display-card-footer"><small>Last seen<br/>{d.last_seen?new Date(d.last_seen).toLocaleString():'Never'}</small>
      <details className="display-actions" onKeyDown={e=>{if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary').focus();}}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))e.currentTarget.open=false;}}>
        <summary aria-label={`Actions for ${name(d)}`}>Actions ▾</summary><div className="action-menu">
        {['refresh','move','alert',...(d.current_type==='alert'?['clear_alert']:[]),'remove'].map(action=><button key={action} disabled={busy} className={action==='remove'?'remove-action':''} onClick={e=>{e.currentTarget.closest('details').open=false;action==='refresh'||action==='clear_alert'?perform(action,d):open(action,d);}}>{action==='clear_alert'?'Clear alert':action[0].toUpperCase()+action.slice(1)}</button>)}
      </div></details></div>
    </article>)}</div>
    <dialog ref={dialog} className="display-dialog" aria-labelledby="display-dialog-title" onCancel={e=>{e.preventDefault();if(!busy)setModal(null);}}>
      {modal&&<form onSubmit={e=>{e.preventDefault();if(modal.action==='move'&&!location.trim())return;if(modal.action==='alert'&&!message.trim())return;perform(modal.action,modal.d);}}>
        <div className="dialog-heading"><h2 id="display-dialog-title">{modal.action==='move'?'Move display':modal.action==='alert'?'Send alert':'Remove display'}</h2><button type="button" aria-label="Close dialog" disabled={busy} onClick={()=>setModal(null)}>×</button></div>
        <p>{name(modal.d)} · {modal.d.location||'Unassigned'}</p>
        {modal.action==='move'&&<><label htmlFor="move-location">Destination location</label><select autoFocus id="move-location" value={location} onChange={e=>setLocation(e.target.value)} required disabled={busy}><option value="">Select a display / location</option>{displays.filter(d=>d.location?.trim()).map(d=><option key={d.id} value={d.location}>{name(d)} — {d.location}</option>)}</select><p className="subtitle">Move this display to the selected display’s location. Devices are not swapped.</p></>}
        {modal.action==='alert'&&<><label htmlFor="alert-type">Emergency type</label><select id="alert-type" value={alertType} onChange={e=>setAlertType(e.target.value)} disabled={busy}>{['fire','flood','quake','medical','lockdown','info'].map(t=><option key={t}>{t}</option>)}</select><label htmlFor="alert-message">Message</label><textarea autoFocus id="alert-message" value={message} onChange={e=>setMessage(e.target.value)} required maxLength={240} disabled={busy}/><p>This alert targets only this display.</p></>}
        {modal.action==='remove'&&<p>This display will need to register again before it can play content.</p>}
        {error&&<p role="alert" className="monitor-error">{error}</p>}
        <div className="dialog-actions"><button type="button" disabled={busy} onClick={()=>setModal(null)}>Cancel</button><button type="submit" disabled={busy||(modal.action==='move'&&(!location.trim()||location.trim()===modal.d.location))||(modal.action==='alert'&&!message.trim())}>{busy?'Saving…':modal.action==='move'?'Move display':modal.action==='alert'?'Send alert':'Remove display'}</button></div>
      </form>}
    </dialog>
  </section>;
}
