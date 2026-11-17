// src/components/Player.jsx
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {QUEUE_ID, buildQueue, keyOf, queuePosition} from "../../../shared/playback.mjs";
import YouTube from "react-youtube";
import confetti from "canvas-confetti";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
import pb from "../services/pocketbase"; // ✅ PocketBase client
import AnnouncementPlayer from "./AnnouncementPlayer";
import SetupScreen from "./SetupScreen"; // ✅ ensure this is imported at the top
import "../App.css";

// Simple helper to get this screen’s identity
function getDisplayConfig() {
  const saved = localStorage.getItem("displayConfig");
  if (!saved) return null;

  try {
    return JSON.parse(saved);
  } catch (e) {
    console.error("❌ Invalid displayConfig JSON:", e);
    return null;
  }
}

function setDisplayConfig(newConfig) {
  if (!newConfig) {
    localStorage.removeItem("displayConfig");
  } else {
    localStorage.setItem("displayConfig", JSON.stringify(newConfig));
  }
}
export { setDisplayConfig };

/* ============================================================
   🌍 Helper: Admin PC Connection Check
============================================================ */
async function checkInternetConnection() {
  try {
    // This is a bulletproof, native background ping that bypasses CORS errors
    const health = await pb.health.check();
    return health.code === 200;
  } catch {
    return false;
  }
}

/* ============================================================
   📄 PDF Slideshow Component (Fixed Cleanup)
============================================================ */
function PdfSlideshow({ url, duration = 15000, onFinish }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let pdfDoc = null;
    let pageNum = 1;
    let timer = null;
    let renderTask = null; 
    let isMounted = true; // 🎯 NEW: Track if component is still on screen

    const renderPage = async (num) => {
      if (!pdfDoc || !isMounted) return;
      if (renderTask) {
        renderTask.cancel();
        renderTask = null;
      }

      try {
        const page = await pdfDoc.getPage(num);
        const viewport = page.getViewport({ scale: 1.4 });
        
        const canvas = canvasRef.current;
        // 🎯 NEW: Safety check to prevent the 'getContext of null' crash
        if (!canvas || !isMounted) return; 

        const ctx = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        renderTask = page.render({ canvasContext: ctx, viewport });
        await renderTask.promise;
      } catch (err) {
        if (err?.name === "RenderingCancelledException") return;
        console.error("PDF render error:", err);
      } finally {
        renderTask = null;
      }
    };

    const loadAndRun = async () => {
      try {
        pdfDoc = await pdfjsLib.getDocument({ url }).promise;
        if (!isMounted) return;
        await renderPage(pageNum);

        timer = setInterval(async () => {
          if (!pdfDoc || !isMounted) return;
          pageNum++;
          if (pageNum > pdfDoc.numPages) {
            clearInterval(timer);
            onFinish?.();
            return;
          }
          await renderPage(pageNum);
        }, duration);
      } catch (err) {
        console.error("Failed to load PDF:", err);
        onFinish?.();
      }
    };

    loadAndRun();

    return () => {
      // 🎯 NEW: Tell the async functions to stop running
      isMounted = false; 
      if (renderTask) renderTask.cancel();
      clearInterval(timer);
      pdfDoc = null;
    };
  }, [url, duration, onFinish]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "black",
        objectFit: "contain",
      }}
    />
  );
}

/* ============================================================
   🧩 Offline YouTube Skip Component
============================================================ */
function OfflineYouTubeSkip({ advance }) {
  useEffect(() => {
    console.warn("Skipping YouTube (offline)");
    const timer = setTimeout(advance, 100);
    return () => clearTimeout(timer);
  }, [advance]);

  return (
    <div className="display-window no-content">
      <h2>Offline: skipping YouTube video</h2>
    </div>
  );
}

/* ============================================================
   🧠 MAIN PLAYER COMPONENT
============================================================ */
export default function Player() {
  const [config, setConfig] = useState(getDisplayConfig());
  const [content, setContent] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [currentKey, setCurrentKey] = useState('');
  const [playTurn,setPlayTurn] = useState(0);
  const [queueIds, setQueueIds] = useState([]);
  const [clock, setClock] = useState(Date.now());
  const [emergency, setEmergency] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const videoRef = useRef(null);
  const sirenRef = useRef(null);
  // inside Player component
  // This should be whichever state or variable you have that represents
  // the currently playing item. Adjust the name if yours is different.
  

  // Inside the Player component, after the existing useEffects:
  useEffect(() => {
    if (!config?.id) return;

    let unsub = null;

    const clearCommand = async (id) => {
        try {
            await pb.collection("displays").update(id, {
                current_type: "idle",
                current_title: null,
                current_command: null
            }, { requestKey: null });
        } catch (err) {
            console.error("Failed to clear command fields:", err);
        }
    };

    async function subscribeToDisplay() {
        let lastSignature = "";

        // 🎯 NEW: Fetch the initial state IMMEDIATELY on boot/refresh
        try {
            const initialRecord = await pb.collection("displays").getOne(config.id, { requestKey: null });
            if (initialRecord.location !== config.location || initialRecord.name !== config.name) {
                const nextConfig = {...config, location: initialRecord.location, name: initialRecord.name};
                setDisplayConfig(nextConfig); setConfig(nextConfig);
            }
            if (initialRecord.current_type === "alert") {
                setEmergency({
                    type: (initialRecord.current_command || "alert").toLowerCase(),
                    message: initialRecord.current_title || "",
                    lang: initialRecord.current_lang || "none",
                    expiresAt: initialRecord.current_alert_expires, alertId: initialRecord.current_alert_id,
                    scope: initialRecord.current_scope || initialRecord.location || 'Global', mode: initialRecord.current_announcement_mode,
                    audioUrl: initialRecord.current_audio ? pb.files.getURL(initialRecord, initialRecord.current_audio) : '',
                    repeatMinutes: initialRecord.current_repeat_minutes, offer: initialRecord.current_offer,
                    alertLabel: initialRecord.current_alert_label
                });
            }
        } catch (err) {
            console.error("Failed to fetch initial display state:", err);
        }

        try {
            unsub = pb.collection("displays").subscribe(
                config.id,
                ({ action, record }) => {

                    if (action === "delete") {
                      console.log("🛑 Display deleted from Admin Panel. Resetting...");
                      setDisplayConfig(null); // Wipes the memory (localStorage)
                      window.location.reload(); // Refreshes the page to show the Setup Screen
                      return;
                  }

                    if (record.location !== getDisplayConfig()?.location || record.name !== getDisplayConfig()?.name) {
                      const nextConfig = {...getDisplayConfig(), location: record.location, name: record.name};
                      setDisplayConfig(nextConfig);
                      setConfig(nextConfig);
                    }

                    // 2. Create a "signature" of the current important data
                    const currentSignature = `${record.current_type}|${record.current_command}|${record.current_title}|${record.current_lang}|${record.current_alert_expires}|${record.current_alert_id}|${record.current_announcement_mode}|${record.current_audio}|${record.current_repeat_minutes}|${record.current_offer}|${record.current_scope}`;

                    // 3. SILENCE THE SPAM: 
                    // If the data is exactly the same as the last time (just a heartbeat update), stop here.
                    if (currentSignature === lastSignature) return;

                    // Update the last known signature
                    lastSignature = currentSignature;

                    if (action !== "update") return;

                    const { current_type, current_title, current_command } = record;

                    console.log("ALERT:", record.current_type, record.current_command, record.current_title);

                    /* ======================
                       COMMANDS (highest priority)
                       ====================== */
                    if (current_type === "command") {
                        console.log(`Command received: ${current_title}`);

                        if (current_title === "REFRESH") window.location.reload();
                        if (current_title === "RESTART") {
                            setDisplayConfig(null);
                            window.location.reload();
                        }
                        clearCommand(config.id);
                        return;
                    }

                    /* ======================
                       ALERTS
                       ====================== */
                    if (current_type === "alert") {
                      console.log("🚨 ALERT RECEIVED:", current_command);
                      setEmergency({
                        type: (current_command || "alert").toLowerCase(),
                        message: current_title || "",
                        lang: record.current_lang || "none",
                        expiresAt: record.current_alert_expires, alertId: record.current_alert_id,
                    scope: record.current_scope || record.location || 'Global', mode: record.current_announcement_mode,
                    audioUrl: record.current_audio ? pb.files.getURL(record, record.current_audio) : '',
                    repeatMinutes: record.current_repeat_minutes, offer: record.current_offer,
                    alertLabel: record.current_alert_label
                      });
                      return;
                    }
                    /* ======================
                       CLEAR ALERT
                       ====================== */
                    
                    console.log("✅ Alert cleared, resuming content.");
                    setEmergency(null);
                }
            );
        } catch (err) {
            console.error("Failed to subscribe to display record:", err);
        }
    }

    subscribeToDisplay();

    return () => {
      pb.collection("displays").unsubscribe(config.id);
    };
}, [config?.id]);




  // 🌐 Real Internet detection (ping)
  useEffect(() => {
    let timer;
    async function monitorConnection() {
      const result = await checkInternetConnection();
      setIsOnline(result);
    }
    monitorConnection();
    timer = setInterval(monitorConnection, 5000);//
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isOnline) {
      console.log("🔄 Internet restored — reloading playlist...");
      // Keep the current item when the network returns.
    }
  }, [isOnline]);

  // Full records are retained so schedule boundaries and midnight birthdays work
  // without a database update. Realtime plus polling handles reconnects.
  useEffect(() => {
    if (!config?.id) return;
    let disposed=false, reading=false;
    const unsubs=[];
    async function load() {
      if (reading) return; reading=true;
      try {
        const [media, people] = await Promise.all([
          pb.collection('content').getFullList({requestKey:null}),
          pb.collection('birthday').getFullList({requestKey:null}),
        ]);
        if (!disposed) {
          setContent(previous=>JSON.stringify(previous)===JSON.stringify(media)?previous:media);
          setBirthdays(previous=>JSON.stringify(previous)===JSON.stringify(people)?previous:people);
        }
        try {
          const queue=await pb.collection('playback_queues').getOne(QUEUE_ID,{requestKey:null});
          if(!disposed)setQueueIds(previous=>JSON.stringify(previous)===JSON.stringify(queue.content_ids||[])?previous:queue.content_ids||[]);
        } catch(e) { console.warn('Queue unavailable; keeping last known order.',e.status); }
      } catch(e) {console.warn('Could not refresh playlist; retaining loaded records.',e.status);}
      finally {reading=false;}
    }
    async function start(){
      for (const collection of ['content','birthday','playback_queues']) {
        try {
          const unsub=await pb.collection(collection).subscribe('*',load);
          if(disposed)unsub();else unsubs.push(unsub);
        } catch { /* Polling still refreshes after reconnect. */ }
      }
    }
    load();start();
    const poll=setInterval(load,15000), timer=setInterval(()=>setClock(Date.now()),1000);
    return ()=>{disposed=true;clearInterval(poll);clearInterval(timer);unsubs.forEach(fn=>fn());};
  },[config?.id]);

  const carouselItems = useMemo(() => buildQueue(content,birthdays,queueIds,config?.location,clock,isOnline).map(i=>({
    ...i,
    media_url:i.type==='birthday' ? (i.photo?pb.files.getURL(i,i.photo):null)
      :i.file?pb.files.getURL(i,i.file):i.ppt_file?pb.files.getURL(i,i.ppt_file):i.youtube_url||null,
  })),[content,birthdays,queueIds,config?.location,clock,isOnline]);
  const {item, next} = queuePosition(carouselItems,currentKey);
  const itemKey=keyOf(item), nextKey=keyOf(next);
  useEffect(()=>{if(currentKey!==itemKey)setCurrentKey(itemKey);},[currentKey,itemKey]);
  const playbackRef=useRef({items:carouselItems,currentKey:itemKey});
  playbackRef.current={items:carouselItems,currentKey:itemKey};
  const advance=useCallback(()=>{
    const {items,currentKey:key}=playbackRef.current;
    setCurrentKey(keyOf(queuePosition(items,key).next));
    setPlayTurn(n=>n+1);
  },[]);

  /* ============================================================
     💓 UPDATED HEARTBEAT (Now using the correct 'item')
  ============================================================ */
  useEffect(() => {
    let isCancelled = false;
    async function sendHeartbeat() {
        const cfg = JSON.parse(localStorage.getItem("displayConfig") || "{}");
        if (!cfg?.id) return;

        try {
            const existingRecord = await pb.collection("displays").getOne(cfg.id, { requestKey: null });
            const updateData = {
              last_seen: new Date().toISOString(),
              next_item_key: emergency ? itemKey : nextKey,
              next_title: (emergency ? item : next)?.title || '',
              next_type: (emergency ? item : next)?.type || '',
            };
            if (existingRecord.current_type === 'alert' && existingRecord.current_alert_expires && Date.parse(existingRecord.current_alert_expires) <= Date.now()) {
              Object.assign(updateData,{current_type:'idle',current_title:'',current_command:'',current_lang:'',current_scope:'',current_duration:0,current_alert_expires:'',current_alert_id:'',current_announcement_mode:'',current_audio:'',current_offer:'',current_answer:''});
            }

            if(
              existingRecord.current_type !== "command" &&
              existingRecord.current_type !== "alert"
            ) {
              updateData.current_item_key = itemKey;
              updateData.current_type = item?.type || "idle";      // ✅ use item (not currentItem)
              updateData.current_title = item?.title || "No Content";
              updateData.current_duration = ['image', 'ppt', 'birthday'].includes(item?.type) ? (Number(item.duration) || 10) : 0;
              updateData.current_scope = item ? (item.location || 'Global') : '';
            }

            await pb.collection("displays").update(cfg.id, updateData, { requestKey: null });
            
        } catch (err) {
            if (err?.status === 404) {
                setDisplayConfig(null);
                window.location.reload();
            }
        }
    }

    sendHeartbeat();
    const interval = setInterval(() => { if (!isCancelled) sendHeartbeat(); }, 30000);
    return () => { isCancelled = true; clearInterval(interval); };
  }, [itemKey, item?.type, item?.title, item?.duration, item?.location, nextKey, next?.title, next?.type, emergency]); // Report only playback changes


  /* ============================================================
     🎉 HELPERS & RENDERING
  ============================================================ */


  // Confetti Effect (Plays continuously for the whole slide)
  useEffect(() => {
    if (item?.type === "birthday") {
      const canvas = document.createElement("canvas");
      canvas.classList.add("confetti");
      
      // Force canvas to cover the whole screen and let clicks pass through
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "1";
      canvas.style.opacity = "0.35";
      document.body.appendChild(canvas);
      
      const myConfetti = confetti.create(canvas, { resize: true });
      let animationId;
      
      // Infinite loop function
      const frame = () => {
        // Lowered particle count slightly so it doesn't lag the TV over 10 seconds
        myConfetti({ particleCount: 3, spread: 60, origin: { y: 0.6 } });
        animationId = requestAnimationFrame(frame);
      };
      
      frame(); // Start the loop

      // Cleanup: Stop animation and delete canvas when slide changes
      return () => {
        cancelAnimationFrame(animationId);
        canvas.remove();
      };
    }
  }, [itemKey, item?.type]);

  // Auto-cycle timer
  useEffect(() => {
    if (emergency || !carouselItems.length) return;
    let timer;
    if (item?.type === "image" || item?.type === "birthday") {
      // 🎯 NEW: Read duration from database (fallback to 10 if missing), multiply by 1000 for milliseconds
      const displayDuration = (item.duration || 10) * 1000;
      timer = setTimeout(advance, displayDuration);
    }
    return () => clearTimeout(timer);
  }, [itemKey, item?.type, item?.duration, emergency, advance, playTurn]);

  const getYouTubeId = (url) => {
    if (!url) return null;
    const m = url.match(/(?:youtu\.be\/|v=)([^#&?]{11})/);
    return m ? m[1] : null;
  };

  useEffect(() => {
    if (!emergency?.expiresAt) return;
    const deadline = Date.parse(emergency.expiresAt);
    if (!Number.isFinite(deadline)) return;
    let timer;
    async function expire() {
      setEmergency(null);
      try {
        const record = await pb.collection('displays').getOne(config.id, {requestKey:null});
        if (record.current_type === 'alert' && record.current_alert_id === emergency.alertId && record.current_alert_expires === emergency.expiresAt) {
          await pb.collection('displays').update(config.id, {current_type:'idle',current_title:'',current_command:'',current_lang:'',current_scope:'',current_duration:0,current_alert_expires:'',current_alert_id:'',current_announcement_mode:'',current_audio:'',current_offer:'',current_answer:''}, {requestKey:null});
        }
      } catch (error) { console.warn('Alert ended locally; backend sync will retry on heartbeat.', error); }
    }
    function check() { if (Date.now() >= deadline) expire(); else timer=setTimeout(check,Math.min(deadline-Date.now(),1000)); }
    check(); return () => clearTimeout(timer);
  }, [emergency?.expiresAt, emergency?.alertId, config?.id]);

  /* ============================================================
     🔊 TV VOICE TRANSLATOR & SIREN DUCKING
  ============================================================ */
  useEffect(() => {
      if (!emergency || emergency.mode || (emergency.expiresAt && Date.parse(emergency.expiresAt) <= Date.now())) {
          window.speechSynthesis?.cancel();
          return;
      }

      let voiceLoopActive = true;
      let settleSpeech;
      const siren = document.getElementById('tv-siren');
      if (siren) { siren.volume=0.25; siren.pause(); }
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

      async function playVoiceLoop() {
          const spokenMessage = `${emergency.alertLabel || emergency.type} alert. Location: ${emergency.scope === 'Global' ? 'all locations' : emergency.scope}. ${emergency.message}`;
          let textToSpeak = spokenMessage;

          // 1. Translate the text once if a regional language is selected
          if (emergency.lang && emergency.lang !== "none" && emergency.lang !== "en-IN") {
              const map = { 'hi-IN': 'hi', 'mr-IN': 'mr', 'gu-IN': 'gu' };
              const targetLang = map[emergency.lang];
              try {
                  const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(spokenMessage)}`);
                  const data = await res.json();
                  textToSpeak = data[0].map(x => x[0]).join(''); // Stitch sentences together
              } catch (e) {
                  console.error("Translation failed on TV:", e);
              }
          }

          // 2. Start the Voice Loop
          while (voiceLoopActive) {
              if (emergency.lang && emergency.lang !== "none") {
                  const sirenEl = document.getElementById("tv-siren");
                  
                  // Keep the spoken message free of siren overlap.
                  if (sirenEl) sirenEl.pause(); 
                  
                  if (!voiceLoopActive) break;
                  await new Promise(resolve => {
                      settleSpeech=resolve;
                      const utterance = new SpeechSynthesisUtterance(textToSpeak);
                      utterance.lang = emergency.lang;
                      utterance.rate = 0.85; // Speak slightly slower for emergencies
                      utterance.onend = resolve; // Wait until it is fully finished speaking!
                      utterance.onerror = resolve;
                      window.speechSynthesis.speak(utterance);
                  });
                  
                  // A short, quiet siren burst between announcements.
                  if (!voiceLoopActive) break;
                  await wait(2000);
                  if (!voiceLoopActive) break;
                  if (sirenEl) { sirenEl.volume=0.25; sirenEl.currentTime=0; sirenEl.play().catch(()=>{}); }
                  await wait(2000);
                  if (sirenEl) sirenEl.pause(); 
                  
                  if (!voiceLoopActive) break;
                  await new Promise(r => setTimeout(r, 8000)); // Leave a quiet interval before repeating.
              } else {
                  // Siren-only mode uses short bursts, not a continuous loop.
                  if (siren) { siren.volume=0.25; siren.play().catch(()=>{}); }
                  await wait(2000);
                  if(siren)siren.pause();
                  await wait(8000);
              }
          }
      }

      playVoiceLoop();

      // Cleanup when emergency ends
      return () => {
          voiceLoopActive = false;
          settleSpeech?.();
          if(siren)siren.pause();
          window.speechSynthesis?.cancel();
      };
  }, [emergency]);

  if (!config) {
    return <SetupScreen onComplete={(cfg) => { 
      setDisplayConfig(cfg); 
      setConfig(cfg);
    }} />;
  }

  if (emergency && (!emergency.expiresAt || Date.parse(emergency.expiresAt) > Date.now())) {
    if (emergency.mode) return <AnnouncementPlayer key={emergency.alertId} announcement={emergency} displayId={config.id}/>;
    return (
      <div className={`emergency-overlay ${emergency?.type || ""}`}>
        <div className="emergency-content">
          <h1>{emergency.type?.toUpperCase()} ALERT!</h1>

          <div style={{
            fontSize: "clamp(20px, 3vw, 42px)",
            fontWeight: 600,
            margin: "16px 0",
            overflowWrap: "anywhere"
          }}>
            Location: {emergency.scope === "Global"
              ? "All locations"
              : emergency.scope || "Unassigned"}
          </div>

          <p>{emergency.message}</p>
        </div>
        {/* 🎯 NEW: Bulletproof audio element that forces playback on mount */}
        <audio id="tv-siren" src="/audio/siren.wav" loop />
      </div>
    );
  }

  if (!carouselItems.length) {
    return (
      <div className="display-window no-content">
        <h2>{isOnline ? "No scheduled content." : "Offline: No cache."}</h2>
      </div>
    );
  }


  return (
    <>
      {item.type === "birthday" ? (
        <div className={`birthday-ad ${item.media_url ? 'with-photo' : 'without-photo'}`}>
          {item.media_url && <div className="birthday-photo"><img src={item.media_url} alt={item.title} /></div>}
          <div className="birthday-text">
            <h1 className="birthday-heading">Happy Birthday!</h1>
            <h2 className="birthday-name">{item.title}</h2>
            <p className="birthday-designation">{item.designation}</p>
          </div>
          <audio src="/audio/happy-birthday.mp3" autoPlay loop />
        </div>
      ) : (
        <div className="display-window">
          {item.type === "image" && <img src={item.media_url} className="display-media" />}
          
          {item.type === "video" && (
            <video key={`${itemKey}:${playTurn}`} ref={videoRef} src={item.media_url} autoPlay controls onEnded={advance} className="display-media" />
          )}

          {item.media_url?.toLowerCase().endsWith(".pdf") && (
            <PdfSlideshow key={`${itemKey}:${playTurn}`} url={item.media_url} duration={(item.duration || 10) * 1000} onFinish={advance} />
          )}

          {item.type === "youtube" && (
            isOnline ? (
              <YouTube 
                videoId={getYouTubeId(item.media_url)} 
                opts={{ width: "100%", height: "100%", playerVars: { autoplay: 1, mute: 0 } }} 
                onEnd={advance} 
                className="youtube-iframe" 
              />
            ) : <OfflineYouTubeSkip advance={advance} />
          )}
        </div>
      )}
      <div className="status-indicator">{isOnline ? "🟢 Online" : "🔴 Offline"}</div>
    </>
  );
}