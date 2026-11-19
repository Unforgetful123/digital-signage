/* Custom microphone controls share the wizard's existing target and duration state. */
(() => {
  let custom=false, mode='record', stream, recorder, chunks=[], recording, previewUrl, recordingTimer;
  let peers=new Map(), liveTimer, livePollBusy=false, liveSession='', busy=false;
  const status=text=>{$('micStatus').textContent=text; $('selectionSummary').textContent=text;};
  const stopTracks=()=>{stream?.getTracks().forEach(t=>t.stop());stream=null;};
  function lock(locked){['presetMode','customMode','recordMode','startRecording','backTo1','forwardTo2'].forEach(id=>$(id).disabled=locked);}
  function render(){
    $('customPanel').hidden=!custom;$('messageField').hidden=custom;$('voiceField').hidden=custom;
    $('recordControls').hidden=mode==='live';
    $('presetMode').setAttribute('aria-pressed',String(!custom));$('customMode').setAttribute('aria-pressed',String(custom));
    $('recordMode').setAttribute('aria-pressed',String(mode==='record'));
    els.sendBtn.textContent='Broadcast';
    $('micHelp').textContent=mode==='live'?'Speak through the selected displays in real time. Stop ends microphone access. Keep this page open.':'Record, stop and preview your message, then broadcast it. Maximum recording: 5 minutes / 20 MB.';
  }
  $('repeatPresets').onclick=e=>{if(e.target.dataset.repeat!==undefined)$('repeatMinutes').value=e.target.dataset.repeat;};
  $('presetMode').onclick=()=>{if(!busy){custom=false;render();}};
  $('customMode').onclick=()=>{if(!busy){custom=true;render();}};
  $('recordMode').onclick=()=>{if(!busy){mode='record';render();}};
  window.setAnnouncementMode=value=>{if(!busy){custom=value!=='preset';mode=value==='live'?'live':'record';render();}};
  async function microphone(){
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone access requires localhost on the admin PC or HTTPS. Plain HTTP LAN addresses cannot use the microphone.');
    return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
  }
  $('startRecording').onclick=async()=>{
    if(busy)return;busy=true;lock(true);recording=null;$('recordPreview').pause();$('recordPreview').hidden=true;
    try{
      stream=await microphone();
      if(!window.MediaRecorder)throw new Error('Recording is not supported by this browser. Use a current Chrome or Edge browser.');
      const mime=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
      recorder=new MediaRecorder(stream,mime?{mimeType:mime}:{});chunks=[];let bytes=0;
      recorder.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);bytes+=e.data.size;if(bytes>20*1024*1024&&recorder.state==='recording')recorder.stop();}};
      recorder.onerror=()=>{status('Recording failed. Record again.');stopTracks();busy=false;lock(false);els.sendBtn.disabled=false;};
      recorder.onstop=()=>{
        clearTimeout(recordingTimer);stopTracks();busy=false;lock(false);els.sendBtn.disabled=false;$('stopRecording').disabled=true;
        const blob=new Blob(chunks,{type:recorder.mimeType});
        if(!blob.size||blob.size>20*1024*1024){status('Recording empty or too large. Please record a shorter message.');return;}
        recording=blob;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(blob);
        $('recordPreview').src=previewUrl;$('recordPreview').hidden=false;status('Recording ready. Preview it before broadcasting.');render();
      };
      recorder.start(1000);$('stopRecording').disabled=false;els.sendBtn.disabled=true;status('● Recording — microphone is active');
      recordingTimer=setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},300000);
    }catch(e){stopTracks();busy=false;lock(false);status(e.message);}
  };
  $('stopRecording').onclick=()=>{if(recorder?.state==='recording')recorder.stop();els.sendBtn.disabled=false;};
  // Also enable Broadcast when recording stops at the automatic limit.
  $('recordPreview').onloadedmetadata=()=>{els.sendBtn.disabled=false;};
  function waitIce(pc){return new Promise((resolve,reject)=>{if(pc.iceGatheringState==='complete')return resolve();const timer=setTimeout(()=>{pc.removeEventListener('icegatheringstatechange',check);if(pc.localDescription?.sdp?.includes('a=candidate:'))resolve();else reject(new Error('No network candidates available. Check LAN/firewall settings.'));},10000);function check(){if(pc.iceGatheringState==='complete'){clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',check);resolve();}}pc.addEventListener('icegatheringstatechange',check);});}
  function stopLive(){clearInterval(liveTimer);liveSession='';peers.forEach(pc=>pc.close());peers.clear();stopTracks();}
  async function pollLive(){
    if(livePollBusy||!liveSession)return;livePollBusy=true;const session=liveSession;
    try{
      await Promise.allSettled([...peers].map(async([id,pc])=>{
        const d=await pb.collection('displays').getOne(id,{requestKey:null});
        if(liveSession!==session)return;
        if(d.current_alert_id!==session||d.current_type!=='alert'){pc.close();peers.delete(id);return;}
        if(d.current_answer&&!pc.remoteDescription)await pc.setRemoteDescription(JSON.parse(d.current_answer));
        await pb.collection('displays').update(id,{current_live_seen:new Date().toISOString()},{requestKey:null});
      }));
      if(liveSession!==session)return;
      const connected=[...peers.values()].filter(pc=>pc.connectionState==='connected').length;
      els.liveMsg.textContent=`Microphone active · ${connected} of ${activeIds.length} displays connected. ${connected?'Speak now.':'Waiting for displays to connect…'}`;
      if(!peers.size){stopLive();els.liveMsg.textContent='No active display connections. Microphone stopped.';}
    }finally{livePollBusy=false;}
  }
  els.clearBtn.addEventListener('click',()=>{stopLive();},true);
  window.addEventListener('pagehide',()=>{stopLive();if(recorder?.state==='recording')recorder.stop();if(previewUrl)URL.revokeObjectURL(previewUrl);});
  els.sendBtn.addEventListener('click',async e=>{
    if(!custom)return;e.stopImmediatePropagation();e.preventDefault();if(busy)return;
    const minutes=Number($('alertMinutes').value),repeat=Number($('repeatMinutes').value);
    if(!selectedTarget)return status('Select target locations first.');
    if(!infiniteDuration&&(!Number.isInteger(minutes)||minutes<1||minutes>1440))return status('Enter 1–1440 whole minutes or select infinity.');
    if(mode==='record'&&(!recording||!Number.isInteger(repeat)||repeat<0||repeat>1440))return status('Record a message and enter a repeat interval from 0 to 1440 minutes.');
    busy=true;els.sendBtn.disabled=true;lock(true);$('recordPreview').pause();
    const session=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);activeAlertId=session;
    const expiresAt=infiniteDuration?'':new Date(Date.now()+minutes*60000).toISOString();
    try{
      if(mode==='live')stream=await microphone();
      const all=await pb.collection('displays').getFullList({requestKey:null});
      const targetIds = new Set(selectedTarget.ids);
      const targets = all.filter(device => targetIds.has(device.id));
      if(!targets.length)throw new Error('No displays in the selected locations.');
      status(mode==='live'?'Connecting microphone to displays…':'Uploading recorded message…');
      const payload={current_type:'alert',current_duration:0,current_command:'announcement',current_title:mode==='live'?'Live announcement':'Recorded announcement',current_lang:'none',current_scope:selectedTarget.id==='all'?'Global':selectedTarget.name,current_alert_expires:expiresAt,current_alert_id:session,current_announcement_mode:mode,current_repeat_minutes:repeat,current_offer:'',current_answer:'',current_live_seen:new Date().toISOString(),current_audio:''};
      const results=await Promise.allSettled(targets.map(async d=>{
        let fields={...payload};
        if(mode==='record'){
          const ext=recording.type.includes('mp4')?'m4a':recording.type.includes('ogg')?'ogg':'webm';
          fields.current_audio=new File([recording],`announcement.${ext}`,{type:recording.type});
        }else{
          const pc=new RTCPeerConnection({iceServers:[]});peers.set(d.id,pc);stream.getTracks().forEach(t=>pc.addTrack(t,stream));
          await pc.setLocalDescription(await pc.createOffer());await waitIce(pc);fields.current_offer=JSON.stringify(pc.localDescription);
        }
        fields.current_live_seen=new Date().toISOString();
        return pb.collection('displays').update(d.id,fields,{requestKey:null});
      }));
      activeIds=targets.filter((d,i)=>results[i].status==='fulfilled').map(d=>d.id);
      for(const [id,pc] of peers)if(!activeIds.includes(id)){pc.close();peers.delete(id);}
      if(!activeIds.length){const reason=results.find(r=>r.status==='rejected')?.reason;throw new Error(`No displays accepted the announcement. ${reason?.message || 'Check migrations, connection and collection permissions.'}`);}
      localStorage.setItem('active_alert',JSON.stringify({typeLabel:'Announcement',message:payload.current_title,areaName:selectedTarget.name,lang:'none',ids:activeIds,expiresAt,alertId:session,mode}));
      els.liveType.textContent=mode==='live'?'LIVE ANNOUNCEMENT':'RECORDED ANNOUNCEMENT';els.liveMsg.textContent=mode==='live'?'Connecting displays…':`Recording sent to ${activeIds.length} displays. ${repeat?`Repeats ${repeat} minute(s) after each playback.`:'Plays once.'}`;
      els.clearBtn.textContent=mode==='live'?'Stop live announcement':'Stop recorded announcement';
      els.liveMeta.textContent=`Target: ${selectedTarget.name}`;switchScreen('live');watchExpiry(expiresAt);
      if(mode==='live'){liveSession=session;pollLive();liveTimer=setInterval(pollLive,3000);}
      if(activeIds.length!==targets.length)alert(`Delivered to ${activeIds.length} of ${targets.length} displays. Some deliveries failed.`);
    }catch(error){stopLive();status(error.message);}
    finally{busy=false;lock(false);els.sendBtn.disabled=false;render();}
  },true);
})();
