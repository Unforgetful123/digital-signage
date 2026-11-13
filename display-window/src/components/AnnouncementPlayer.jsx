import React, {useEffect, useRef, useState} from 'react';
import pb from '../services/pocketbase';

export default function AnnouncementPlayer({announcement:a, displayId, client=pb, onEnded}) {
  const audio=useRef(null);
  const endedCallback=useRef(onEnded);endedCallback.current=onEnded;
  const [status,setStatus]=useState('Connecting…');
  const [blocked,setBlocked]=useState(false);
  const [ended,setEnded]=useState(false);
  useEffect(()=>{
    let disposed=false, peer, repeatTimer, watchdog, checking=false;
    const element=audio.current;
    const say=text=>{if(!disposed)setStatus(text);};
    const play=async()=>{try{await element.play();if(!disposed){setBlocked(false);say(a.mode==='live'?'Live announcement':'Playing recorded announcement');}}catch{if(!disposed){setBlocked(true);say('Audio was blocked. Restart the display using the autoplay-enabled shortcut.');}}};
    async function finish(){
      if(disposed)return;
      element.pause();peer?.close();clearInterval(watchdog);setEnded(true);
      if(endedCallback.current){endedCallback.current();return;}
      try{
        const d=await client.collection('displays').getOne(displayId,{requestKey:null});
        if(d.current_alert_id===a.alertId&&d.current_type==='alert')await client.collection('displays').update(displayId,{current_type:'idle',current_title:'',current_command:'',current_announcement_mode:'',current_offer:'',current_answer:'',current_audio:'',current_alert_id:'',current_alert_expires:''},{requestKey:null});
      }catch{say('Announcement ended. Waiting for connection.');}
    }
    async function start(){
      try{
        if(a.mode==='record'){
          element.src=a.audioUrl;
          element.onended=()=>{
            const gap=Number(a.repeatMinutes);
            if(gap>0){say(`Next playback in ${gap} minute(s)`);repeatTimer=setTimeout(()=>{element.currentTime=0;play();},gap*60000);}
            else finish();
          };
          element.onerror=()=>say('Unable to load the recording. Check the display connection.');
          await play();return;
        }
        peer=new RTCPeerConnection({iceServers:[]});
        peer.ontrack=e=>{if(!disposed){element.srcObject=e.streams[0]||new MediaStream([e.track]);play();}};
        peer.onconnectionstatechange=()=>{if(peer.connectionState==='failed')finish();};
        await peer.setRemoteDescription(JSON.parse(a.offer));
        if(disposed)return;
        await peer.setLocalDescription(await peer.createAnswer());
        await new Promise((resolve,reject)=>{
          if(peer.iceGatheringState==='complete')return resolve();
          const timer=setTimeout(()=>{peer.removeEventListener('icegatheringstatechange',check);if(peer.localDescription?.sdp?.includes('a=candidate:'))resolve();else reject(new Error('No network candidates available')); },10000);
          function check(){if(peer.iceGatheringState==='complete'){clearTimeout(timer);peer.removeEventListener('icegatheringstatechange',check);resolve();}}
          peer.addEventListener('icegatheringstatechange',check);
        });
        if(disposed)return;
        const d=await client.collection('displays').getOne(displayId,{requestKey:null});
        if(disposed||d.current_alert_id!==a.alertId)return;
        await client.collection('displays').update(displayId,{current_answer:JSON.stringify(peer.localDescription)},{requestKey:null});
        let lastContact=Date.now();
        watchdog=setInterval(async()=>{
          if(checking||disposed)return;checking=true;
          try{
            const d=await client.collection('displays').getOne(displayId,{requestKey:null});
            if(disposed)return;
            if(d.current_alert_id!==a.alertId||d.current_type!=='alert'){element.pause();peer.close();clearInterval(watchdog);setEnded(true);endedCallback.current?.();return;}
            lastContact=Date.parse(d.current_live_seen)||lastContact;
          }catch{/* The local watchdog also ends audio when the backend is unreachable. */}
          finally{checking=false;}
          if(!disposed&&Date.now()-lastContact>20000)finish();
        },3000);
      }catch(error){say(`Audio connection failed: ${error.message}`);peer?.close();}
    }
    setEnded(false);start();
    return()=>{disposed=true;clearTimeout(repeatTimer);clearInterval(watchdog);peer?.close();element.pause();element.srcObject=null;element.removeAttribute('src');element.onended=null;element.onerror=null;};
  },[a.alertId,a.mode,a.audioUrl,a.offer,a.repeatMinutes,displayId,client]);
  return <div className="emergency-overlay" style={{background:'#102b46',color:'#fff'}}><div className="emergency-content"><h1>{ended?'Announcement ended':a.mode==='live'?'Live announcement':'Recorded announcement'}</h1><p>{a.scope==='Global'?'All locations':a.scope}</p><p style={{fontSize:'clamp(16px,2vw,28px)'}}>{status}</p></div><audio ref={audio}/></div>;
}
