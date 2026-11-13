import React,{useEffect,useRef,useState} from 'react';
export default function EmergencyPopup({alert}){
 const audio=useRef(null);const [audioError,setAudioError]=useState('');
 useEffect(()=>{
  let cancelled=false,settleSpeech;const controller=new AbortController();const siren=audio.current;
  siren.volume=.25;
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function burst(){if(cancelled)return;try{await siren.play();}catch{setAudioError('Audio unavailable. Check speakers and the output device.');}await wait(2000);if(!cancelled){siren.pause();siren.currentTime=0;}}
  async function run(){
   let message=`${alert.alertLabel} alert. Location: ${alert.scope==='Global'?'all locations':alert.scope}. ${alert.message}`;
   const languages={'hi-IN':'hi','mr-IN':'mr','gu-IN':'gu'};
   if(languages[alert.lang]){
    const timeout=setTimeout(()=>controller.abort(),5000);
    try{const response=await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${languages[alert.lang]}&dt=t&q=${encodeURIComponent(message)}`,{signal:controller.signal});const data=await response.json();message=data[0].map(x=>x[0]).join('');}catch{/* Speak original text when translation is unavailable. */}finally{clearTimeout(timeout);}
   }
   while(!cancelled){
    if(alert.lang!=='none'&&window.speechSynthesis){
     await new Promise(resolve=>{
      settleSpeech=resolve;
      const utterance=new SpeechSynthesisUtterance(message);utterance.lang=alert.lang;utterance.rate=.85;
      const timer=setTimeout(()=>{if(!cancelled)window.speechSynthesis.cancel();resolve();},90000);
      const done=()=>{clearTimeout(timer);resolve();};settleSpeech=done;utterance.onend=done;utterance.onerror=done;
      window.speechSynthesis.speak(utterance);
     });
     if(cancelled)break;await wait(2000);
    }
    if(cancelled)break;await burst();if(cancelled)break;await wait(8000);
   }
  }
  run();return()=>{cancelled=true;controller.abort();settleSpeech?.();siren.pause();window.speechSynthesis?.cancel();};
 },[alert.id,alert.message,alert.lang,alert.scope,alert.alertLabel]);
 return <section className="receiver-emergency" role="alert"><div className="alert-mark">!</div><p className="eyebrow">EMERGENCY BROADCAST</p><h1>{alert.alertLabel}</h1><p className="alert-location">Location: {alert.scope==='Global'?'All locations':alert.scope}</p><p className="alert-message">{alert.message}</p>{audioError&&<p>{audioError}</p>}<audio ref={audio} src="./audio/siren.wav" loop/></section>;
}
