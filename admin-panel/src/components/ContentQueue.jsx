import React,{useEffect,useRef,useState} from 'react';
import pb from '../services/pocketbase';
import {logEvent} from '../services/eventLog';
import {QUEUE_ID, orderedContent, contentStatus, deviceOnline, moveItem, buildQueue, keyOf} from '../../../shared/playback.mjs';
import './ContentQueue.css';
const typeName = t => t === 'ppt' ? 'PDF' : t === 'youtube' ? 'YouTube' : t || '—';
export default function ContentQueue() {
  const [content,setContent]=useState([]), [devices,setDevices]=useState([]), [birthdays,setBirthdays]=useState([]);
  const [ids,setIds]=useState([]), [draft,setDraft]=useState(null), [selected,setSelected]=useState('');
  const [loading,setLoading]=useState(true), [busy,setBusy]=useState(false), [ready,setReady]=useState(false);
  const [error,setError]=useState(''), [notice,setNotice]=useState(''), [now,setNow]=useState(Date.now());
  const drag=useRef(null), base=useRef('[]'), dirty=useRef(false), [dragging,setDragging]=useState('');
  useEffect(()=>{
    let disposed=false; const unsubs=[];
    const load = async () => {
      try {
        const [items, screens, people, queue]=await Promise.all([
          pb.collection('content').getFullList({requestKey:null}), pb.collection('displays').getFullList({requestKey:null}),
          pb.collection('birthday').getFullList({requestKey:null}), pb.collection('playback_queues').getOne(QUEUE_ID,{requestKey:null})
        ]);
        if(disposed)return;
        setContent(items);setDevices(screens);setBirthdays(people);setIds(queue.content_ids || []);setReady(true);
        if(!dirty.current)base.current=JSON.stringify(queue.content_ids || []);
        setError('');
      }catch(e){if(!disposed){setError('Could not load content and queue. Apply the queue migration and check your server connection and permissions.');setReady(false);}}
      finally{if(!disposed)setLoading(false);}
    };
    async function subscribe(){
      for(const collection of ['content','displays','birthday','playback_queues']){
        try{
          const unsub=await pb.collection(collection).subscribe('*',()=>load());
          if(disposed)unsub();else unsubs.push(unsub);
        }catch{/* Polling remains available when realtime is disconnected. */}
      }
    }
    load();subscribe();const poll=setInterval(load,15000), clock=setInterval(()=>setNow(Date.now()),10000);
    return()=>{disposed=true;unsubs.forEach(fn=>fn());clearInterval(poll);clearInterval(clock);};
  },[]);
  const ordered=orderedContent(content,draft || ids);
  const screens=devices.filter(d=>d.device_role!=='pc_receiver').sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const device=screens.find(d=>d.id===selected);
  const preview=device?buildQueue(content,birthdays,draft||ids,device.location,now):[];
  const changedElsewhere=draft && JSON.stringify(ids)!==base.current;
  function reorder(from,to){
    if(busy||!ready)return;
    if(!dirty.current)base.current=JSON.stringify(ids);
    dirty.current=true;setDraft(moveItem(ordered.map(i=>i.id),from,to));setNotice('Unsaved queue order');
  }
  function discard(){dirty.current=false;setDraft(null);base.current=JSON.stringify(ids);setNotice('');setError('');}
  async function save(){
    setBusy(true);setError('');
    try{
      const latest=await pb.collection('playback_queues').getOne(QUEUE_ID,{requestKey:null});
      if(JSON.stringify(latest.content_ids||[])!==base.current)throw new Error('The saved order changed in another session. Discard your draft, then reorder again.');
      const next=ordered.map(i=>i.id);
      await pb.collection('playback_queues').update(QUEUE_ID,{content_ids:next},{requestKey:null});
      setIds(next);base.current=JSON.stringify(next);dirty.current=false;setDraft(null);
      setNotice('Queue saved. Connected players keep the current item and use the new order afterward.');
      await logEvent({action:'content_reorder',target:'Shared playback queue',details:next.join(', ')});
    }catch(e){setError(e.message || 'Could not save queue.');}finally{setBusy(false);}
  }
  return <section className="content-queue">
    <div className="queue-heading"><div><h2>Content & Queue</h2><p>Drag rows to reorder. Each screen plays eligible content for its location, in this shared order.</p></div><span className="queue-count">{content.length} uploads</span></div>
    <div className="queue-controls"><label htmlFor="queue-monitor">Preview a monitor</label><select id="queue-monitor" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">All uploaded content</option>{screens.map(d=><option key={d.id} value={d.id}>{d.name||d.code} — {d.location||'Unassigned'}</option>)}</select><button disabled={!draft||busy||!ready||!!changedElsewhere} onClick={save}>{busy?'Saving…':'Save order'}</button><button className="queue-secondary" disabled={!draft||busy} onClick={discard}>Discard changes</button></div>
    {notice&&<p role="status" className="queue-notice">{notice}</p>}{changedElsewhere&&<p role="alert" className="queue-error">Another session changed the saved queue. Discard this draft before editing again.</p>}{error&&<p role="alert" className="queue-error">{error}</p>}
    {device&&<div className="queue-preview"><h3>{device.name||device.code} · {device.location}</h3><p>{deviceOnline(device,now)?'Now playing':'Last reported'}: <strong>{device.current_title||'Idle'}</strong> · {deviceOnline(device,now)?'Up next':'Last reported next'}: <strong>{device.next_title||'Not reported yet'}</strong></p><p>{draft?'Preview of unsaved order':'Eligible playback order'} · Birthday cards are inserted automatically after every third media item.</p><ol>{preview.map(i=><li key={keyOf(i)}>{i.title} <small>({typeName(i.type)})</small></li>)}</ol>{!preview.length&&<p>No eligible content for this monitor.</p>}</div>}
    {loading?<p role="status">Loading content…</p>:!content.length?<p className="queue-empty">No content uploaded yet. Add media from Home.</p>:<div className="queue-table-wrap"><table><thead><tr><th>Order</th><th>Content</th><th>Target</th><th>Status / schedule</th><th>Playing on</th><th>Up next on</th></tr></thead><tbody>{ordered.map((item,index)=>{
      const playing=devices.filter(d=>deviceOnline(d,now)&&d.current_type!=='alert'&&d.current_type!=='command'&&d.current_item_key===keyOf(item));
      const upcoming=devices.filter(d=>deviceOnline(d,now)&&d.device_role!=='pc_receiver'&&d.next_item_key===keyOf(item));
      return <tr key={item.id} draggable={!busy&&ready} className={dragging===item.id?'queue-dragging':''} onDragStart={e=>{drag.current=item.id;setDragging(item.id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',item.id);}} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='move';}} onDrop={e=>{e.preventDefault();const from=ordered.findIndex(i=>i.id===drag.current);if(from>=0)reorder(from,index);drag.current=null;setDragging('');}} onDragEnd={()=>{drag.current=null;setDragging('');}}>
      <td><div className="queue-order"><span aria-hidden="true">⠿ {index+1}</span><button aria-label={`Move ${item.title} up`} disabled={index===0||busy||!ready} onClick={()=>reorder(index,index-1)}>↑</button><button aria-label={`Move ${item.title} down`} disabled={index===ordered.length-1||busy||!ready} onClick={()=>reorder(index,index+1)}>↓</button></div></td>
      <td><strong>{item.title||'Untitled'}</strong><small>{typeName(item.type)} · {item.duration>0?`${item.duration}s${item.type==='ppt'?' / page':''}`:'Full video'}</small></td><td>{item.location||'Global'}</td><td><span className={`queue-status ${contentStatus(item,now).toLowerCase().replace(' ','-')}`}>{contentStatus(item,now)}</span><small>{item.start_time?`From ${new Date(item.start_time).toLocaleString()}`:'No start limit'}</small><small>{item.end_time?`Until ${new Date(item.end_time).toLocaleString()}`:'No end limit'}</small></td><td>{playing.map(d=>d.name||d.code).join(', ')||'—'}</td><td>{upcoming.map(d=>d.name||d.code).join(', ')||'—'}</td></tr>;
    })}</tbody></table></div>}
    <p className="queue-footnote">Use ↑ / ↓ on touch screens or with a keyboard. New uploads join the end of a saved queue. Offline monitors show no live playback assignments. Save order affects media only; emergency alerts retain priority.</p>
  </section>;
}
