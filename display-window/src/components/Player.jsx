// src/components/Player.jsx
import React, { useEffect, useState, useRef } from "react";
import YouTube from "react-youtube";
import confetti from "canvas-confetti";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
import pb from "../services/pocketbase"; // ✅ PocketBase client
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
   📄 PDF Slideshow Component
============================================================ */
function PdfSlideshow({ url, duration = 15000, onFinish }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let pdfDoc = null;
    let pageNum = 1;
    let timer = null;
    let renderTask = null; // ✅ track active render

    const renderPage = async (num) => {
      if (!pdfDoc) return;
      // cancel previous render if running
      if (renderTask) {
        renderTask.cancel();
        renderTask = null;
      }

      const page = await pdfDoc.getPage(num);
      const viewport = page.getViewport({ scale: 1.4 });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // render page and track it
      renderTask = page.render({ canvasContext: ctx, viewport });
      try {
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
        await renderPage(pageNum);

        timer = setInterval(async () => {
          if (!pdfDoc) return;
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
      // cleanup
      if (renderTask) renderTask.cancel();
      clearInterval(timer);
      pdfDoc = null;
    };
  }, [url]);

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
  const [current, setCurrent] = useState(0);
  const [emergency, setEmergency] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const videoRef = useRef(null);
  const sirenRef = useRef(null);
  // inside Player component
  // This should be whichever state or variable you have that represents
  // the currently playing item. Adjust the name if yours is different.
  const currentItem = content[current] || null;  // example

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

                    // 2. Create a "signature" of the current important data
                    const currentSignature = `${record.current_type}|${record.current_command}|${record.current_title}`;

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
                        message: current_title || ""
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

/* ============================================================
     🔊 NEW: Siren Audio Logic (Reacts to State, not Socket)
  ============================================================ */
useEffect(() => {
  const siren = new Audio("audio/siren.wav");
  siren.loop = true;
  siren.muted = true;       // ✅ muted autoplay allowed
  siren.volume = 0;
  sirenRef.current = siren;

  siren.play().catch(() => {}); // ignore

  return () => {
    siren.pause();
    sirenRef.current = null;
  };
}, []);

useEffect(() => {
  const siren = sirenRef.current;
  if (!siren) return;

  if (emergency) {
    siren.currentTime = 0;
    siren.muted = false;
    siren.volume = 1;

    siren.play().catch(err => console.warn("Audio blocked:", err));
  } else {
    siren.pause();
    siren.currentTime = 0;
  }
}, [emergency]);


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
      setCurrent(0);
    }
  }, [isOnline]);

  // In Player.jsx (assuming config and socket are defined)
  // 🌐 Ensure the player joins its location room on load
  

  /* ============================================================
  1. FIX: Content Fetching and Real-time Subscription
============================================================ */
useEffect(() => {
    if (!config?.location) return;
    const location = config.location;

  const loadContent = async (currentLocation) => {
        try {
            // 1. Fetch Content
            const records = await pb.collection('content').getList(1, 100, {
                // 🚨 TEMPORARILY REMOVED THE FILTER TO FORCE IT TO FETCH EVERYTHING
                filter: "", 
                sort: '-created', 
                requestKey: null
            });

            console.log("1. RAW DATA FROM DATABASE:", records);

            const dataArray = Array.isArray(records) ? records : (records.items || []);

            const activeContent = dataArray.filter(item => {
                const now = new Date();
                
                // Clean up the strings just in case they have weird spaces
                const startStr = (item.start_time || "").trim();
                const endStr = (item.end_time || "").trim();

                // Check the dates
                const hasStarted = !startStr || new Date(startStr) <= now;
                const hasNotEnded = !endStr || new Date(endStr) >= now;

                // 🚨 X-RAY DEBUGGER: This prints exactly why an item is kept or rejected
                console.log(`[DEBUG] Checking item: "${item.title || item.id}"`);
                console.log(`   👉 hasStarted? ${hasStarted} (Start time: ${startStr || "None"})`);
                console.log(`   👉 hasNotEnded? ${hasNotEnded} (End time: ${endStr || "None"})`);
                
                if (!hasStarted) console.warn(`   ❌ REJECTED: Has not started yet!`);
                if (!hasNotEnded) console.warn(`   ❌ REJECTED: Content has expired!`);

                return hasStarted && hasNotEnded;
            });

            console.log("2. DATA AFTER DATE FILTER:", activeContent);
            setContent(activeContent);

            // 2. Fetch Birthdays (Bulletproof Date Check!)
            const today = new Date();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            
            const bAll = await pb.collection("birthday").getFullList({ requestKey: null });
            const todays = (bAll || []).filter((row) => {
                if (!row?.dob) return false;
                
                // Safely slice out the "YYYY-MM-DD" no matter how the database formatted it
                const datePart = row.dob.split(' ')[0].split('T')[0]; 
                const [, bMonth, bDay] = datePart.split('-');
                
                return bMonth === mm && bDay === dd;
            });
            setBirthdays(todays);
            
        } catch (error) {
            console.error("Failed to load content:", error);
        }
    };

    // --- A. INITIAL LOAD ---
    loadContent(location);

    // --- B. REAL-TIME SUBSCRIPTIONS ---
    const unsubContent = pb.collection('content').subscribe('*', () => {
        loadContent(location);
    });
    const unsubBirthday = pb.collection('birthday').subscribe('*', () => {
        loadContent(location);
    });

    // Cleanup subscriptions
    return () => {
        pb.collection("content").unsubscribe("*");
        pb.collection("birthday").unsubscribe("*");
    };
    
  }, [config?.location]);


  // 🚨 Emergency events


  // Helper: valid date range
  const isActive = (item) => {
    if (!item.start_time || !item.end_time) return true;
    const now = new Date();
    const start = new Date(item.start_time);
    const end = new Date(item.end_time);
    return now >= start && now <= end;
  };

  // 📡 Fetch PocketBase content + cache
  // useEffect(() => {
  //   const fetchAll = async () => {
  //     try {
  //       const cData = await pb.collection("content").getFullList({ sort: "-created", requestKey: null });
  //       const validContent = cData.filter(isActive);

  //       const today = new Date();
  //       const mm = today.getMonth() + 1;
  //       const dd = today.getDate();
  //       const bAll = await pb.collection("birthday").getFullList( {requestKey: null});
  //       const todays = (bAll || []).filter((row) => {
  //         if (!row?.dob) return false;
  //         const d = new Date(row.dob);
  //         return d.getMonth() + 1 === mm && d.getDate() === dd;
  //       });

  //       setContent(validContent);
  //       setBirthdays(todays);

  //       localStorage.setItem("cachedContent", JSON.stringify(validContent));
  //       localStorage.setItem("cachedBirthdays", JSON.stringify(todays));

  //       console.log("✅ Synced latest valid content from PocketBase");
  //     } catch (err) {
  //       console.warn("⚠️ PocketBase unreachable — using cached data");
  //       const cachedC = JSON.parse(localStorage.getItem("cachedContent") || "[]");
  //       const cachedB = JSON.parse(localStorage.getItem("cachedBirthdays") || "[]");
  //       const validCached = cachedC.filter(isActive);
  //       setContent(validCached);
  //       setBirthdays(cachedB);
  //     }
  //   };

  //   fetchAll();
  //   const iv = setInterval(fetchAll, 30000);
  //   return () => clearInterval(iv);
  // }, []);

  /* ============================================================
     🧩 BUILD UNIFIED PLAYLIST (Interleaved)
  ============================================================ */
  // 1. Prepare clean content list
  const baseContent = content
    .filter((i) => {
      if (!isOnline && i.type === "youtube") return false;
      return i.type !== "alert" && isActive(i);
    })
    .map((i) => ({
      ...i,
      media_url: i.file ? pb.files.getURL(i, i.file) 
                : i.ppt_file ? pb.files.getURL(i, i.ppt_file) 
                : i.youtube_url || null,
    }));

  // 2. Prepare clean birthday list
  const birthdayList = birthdays.map((b) => ({
    type: "birthday",
    title: b.name,
    designation: b.designation,
    media_url: b.photo ? pb.files.getURL(b, b.photo) : null,
  }));

  // 3. Combine them: Interleave a birthday after every 3rd content item
  let carouselItems = [];
  let bIndex = 0;

  if (baseContent.length > 0) {
    baseContent.forEach((item, index) => {
      carouselItems.push(item);
      // Inject 1 birthday after every 3rd slide if birthdays are available
      if ((index + 1) % 3 === 0 && bIndex < birthdayList.length) {
        carouselItems.push(birthdayList[bIndex]);
        bIndex++;
      }
    });
    // Add any remaining birthdays at the end
    while (bIndex < birthdayList.length) {
      carouselItems.push(birthdayList[bIndex]);
      bIndex++;
    }
  } else {
    // If no content, just show birthdays
    carouselItems = birthdayList;
  }

  // 4. THIS IS THE CRITICAL SYNC FIX:
  // Both the screen AND the heartbeat now use 'item'
  const item = carouselItems[current] || null;

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
            const updateData = { last_seen: new Date().toISOString() };

            if(
              existingRecord.current_type !== "command" &&
              existingRecord.current_type !== "alert"
            ) {
              updateData.current_type = item?.type || "idle";      // ✅ use item (not currentItem)
              updateData.current_title = item?.title || "No Content";
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
  }, [item, emergency]); // Syncs whenever the item changes


  /* ============================================================
     🎉 HELPERS & RENDERING
  ============================================================ */
  const advance = () => setCurrent((prev) => (prev + 1) % (carouselItems.length || 1));

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
      canvas.style.zIndex = "9999";
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
  }, [item]);

  // Auto-cycle timer
  useEffect(() => {
    if (emergency || !carouselItems.length) return;
    let timer;
    if (item?.type === "image" || item?.type === "birthday") {
      timer = setTimeout(advance, 10000);
    }
    return () => clearTimeout(timer);
  }, [item, emergency, carouselItems.length]);

  const getYouTubeId = (url) => {
    if (!url) return null;
    const m = url.match(/(?:youtu\.be\/|v=)([^#&?]{11})/);
    return m ? m[1] : null;
  };

  if (!config) {
    return <SetupScreen onComplete={(cfg) => { 
      setDisplayConfig(cfg); 
      setConfig(cfg);
    }} />;
  }

  if (emergency) {
    return (
      <div className={`emergency-overlay ${emergency?.type || ""}`}>
        <div className="emergency-content">
          <h1>{emergency.type?.toUpperCase()} ALERT!</h1>
          <p>{emergency.message}</p>
        </div>
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
        <div className="birthday-ad" style={{ 
          display: 'flex', 
          flexDirection: item.media_url ? 'row' : 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          width: '100vw', 
          height: '100vh', 
          margin: 0,
          boxSizing: 'border-box'
        }}>
          {item.media_url && (
            <div className="birthday-photo" style={{ marginRight: '4rem' }}>
              <img src={item.media_url} alt={item.title} />
            </div>
          )}
          
          {/* Bulletproof Flexbox for the text */}
          <div className="birthday-text" style={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: item.media_url ? 'flex-start' : 'center',
            textAlign: item.media_url ? 'left' : 'center',
            margin: 0
          }}>
            <h1 className="birthday-heading">🎉 Happy Birthday!</h1>
            <h2 className="birthday-name">{item.title}</h2>
            <p className="birthday-designation">{item.designation}</p>
          </div>
          
          <audio src="/audio/happy-birthday.mp3" autoPlay loop />
        </div>
      ) : (
        <div className="display-window">
          {item.type === "image" && <img src={item.media_url} className="display-media" />}
          
          {item.type === "video" && (
            <video key={item.media_url} ref={videoRef} src={item.media_url} autoPlay controls onEnded={advance} className="display-media" />
          )}

          {item.media_url?.toLowerCase().endsWith(".pdf") && (
            <PdfSlideshow url={item.media_url} onFinish={advance} />
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