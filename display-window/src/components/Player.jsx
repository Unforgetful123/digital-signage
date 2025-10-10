// src/components/Player.jsx
import React, { useEffect, useState, useRef } from "react";
import YouTube from "react-youtube";
import { io } from "socket.io-client";
import confetti from "canvas-confetti";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
import pb from "../services/pocketbase"; // ✅ PocketBase client
import "../App.css";

const SOCKET_HOST =
  import.meta?.env?.VITE_SOCKET_HOST || window.location.hostname;
const socket = io(`http://${SOCKET_HOST}:4000`);

/* ============================================================
   🌍 Helper: Real Internet Connectivity Check
============================================================ */
async function checkInternetConnection() {
  try {
    await fetch("https://www.gstatic.com/generate_204", { mode: "no-cors" });
    return true;
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
  const [content, setContent] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [current, setCurrent] = useState(0);
  const [emergency, setEmergency] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const videoRef = useRef(null);

  // 🌐 Real Internet detection (ping)
  useEffect(() => {
    let timer;
    async function monitorConnection() {
      const result = await checkInternetConnection();
      setIsOnline(result);
    }
    monitorConnection();
    timer = setInterval(monitorConnection, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isOnline) {
      console.log("🔄 Internet restored — reloading playlist...");
      setCurrent(0);
    }
  }, [isOnline]);

  // 🚨 Emergency events
  useEffect(() => {
    // Create reusable audio element
    const siren = new Audio("/siren.wav");
    siren.loop = true; // continuous loop during alert

    socket.on("emergencyTriggered", (data) => {
      setEmergency(data);
      try {
        siren.currentTime = 0;
        siren.volume = 0;      // start muted
        siren.muted = false;
        siren.play().then(() => {
          // smooth fade-in
          const fade = setInterval(() => {
            if (siren.volume < 1.0) {
              siren.volume = Math.min(siren.volume + 0.1, 1.0);
            } else clearInterval(fade);
          }, 200);
        }).catch(err => console.warn("Audio play blocked:", err));
      } catch (err) {
        console.error("Failed to play siren:", err);
      }
    });

    socket.on("emergencyCleared", () => {
      setEmergency(null);
      try {
        siren.pause();
        siren.currentTime = 0;
      } catch (err) {
        console.error("Failed to stop siren:", err);
      }
    });

    // cleanup when component unmounts
    return () => {
      siren.pause();
      socket.off("emergencyTriggered");
      socket.off("emergencyCleared");
    };
  }, []);

  // Helper: valid date range
  const isActive = (item) => {
    if (!item.start_time || !item.end_time) return true;
    const now = new Date();
    const start = new Date(item.start_time);
    const end = new Date(item.end_time);
    return now >= start && now <= end;
  };

  // 📡 Fetch PocketBase content + cache
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const cData = await pb.collection("content").getFullList({ sort: "-created" });
        const validContent = cData.filter(isActive);

        const today = new Date();
        const mm = today.getMonth() + 1;
        const dd = today.getDate();
        const bAll = await pb.collection("birthday").getFullList();
        const todays = (bAll || []).filter((row) => {
          if (!row?.dob) return false;
          const d = new Date(row.dob);
          return d.getMonth() + 1 === mm && d.getDate() === dd;
        });

        setContent(validContent);
        setBirthdays(todays);

        localStorage.setItem("cachedContent", JSON.stringify(validContent));
        localStorage.setItem("cachedBirthdays", JSON.stringify(todays));

        console.log("✅ Synced latest valid content from PocketBase");
      } catch (err) {
        console.warn("⚠️ PocketBase unreachable — using cached data");
        const cachedC = JSON.parse(localStorage.getItem("cachedContent") || "[]");
        const cachedB = JSON.parse(localStorage.getItem("cachedBirthdays") || "[]");
        const validCached = cachedC.filter(isActive);
        setContent(validCached);
        setBirthdays(cachedB);
      }
    };

    fetchAll();
    const iv = setInterval(fetchAll, 30000);
    return () => clearInterval(iv);
  }, []);

  // 🧩 Build carousel playlist
  const carouselItems = [
    ...birthdays.map((b) => ({
      type: "birthday",
      title: b.name,
      designation: b.designation,
      media_url: b.photo ? pb.files.getURL(b, b.photo) : null,
    })),
    ...content
      .filter((i) => {
        if (!isOnline && i.type === "youtube") return false;
        return i.type !== "alert" && isActive(i);
      })
      .map((i) => ({
        ...i,
        media_url:
          i.file
            ? pb.files.getURL(i, i.file)
            : i.ppt_file
            ? pb.files.getURL(i, i.ppt_file)
            : i.youtube_url || null,
      })),
  ];

  const item = carouselItems[current];
  const advance = () => setCurrent((prev) => (prev + 1) % (carouselItems.length || 1));

  // 🎉 Confetti
  useEffect(() => {
    if (item?.type === "birthday") {
      const canvas = document.createElement("canvas");
      canvas.classList.add("confetti");
      document.body.appendChild(canvas);
      const myConfetti = confetti.create(canvas, { resize: true });
      const end = Date.now() + 10000;
      (function frame() {
        myConfetti({ particleCount: 5, spread: 60, origin: { y: 0.6 } });
        if (Date.now() < end) requestAnimationFrame(frame);
        else canvas.remove();
      })();
    }
  }, [item]);

  // ⏱️ Auto-cycle
  useEffect(() => {
    if (emergency) return;
    if (!carouselItems.length) return;
    const currentItem = carouselItems[current];
    let timer;
    if (
      currentItem.type === "image" ||
      currentItem.type === "birthday"
    ) {
      timer = setTimeout(advance, 10000);
    }
    return () => clearTimeout(timer);
  }, [carouselItems, current, emergency]);

  // 🎬 YouTube helper
  const getYouTubeId = (url) => {
    if (!url) return null;
    try {
      return new URL(url).searchParams.get("v");
    } catch {
      const m = url.match(/(?:youtu\.be\/|v=)([^#&?]{11})/);
      return m ? m[1] : null;
    }
  };

  // 🧱 Emergency overlay
  if (emergency) {
    const type = emergency.type?.toLowerCase() || "default";

    return (
      <div className={`emergency-overlay ${type}`}>
        <div className="emergency-content">
          <h1>{type.toUpperCase()} ALERT!</h1>
          <p>{emergency.message}</p>
        </div>
      </div>
    );
  }

  // 🖼️ No items placeholder
  if (!carouselItems.length) {
    return (
      <div className="display-window no-content">
        <h2>
          {isOnline
            ? "No scheduled content or birthdays."
            : "Offline: no cached content available."}
        </h2>
      </div>
    );
  }

  // 🎥 Main rendering
  return (
    <>
      {item.type === "birthday" ? (
        <div className="birthday-ad">
          <div className="birthday-photo">
            {item.media_url && <img src={item.media_url} alt={item.title} />}
          </div>
          <div className="birthday-text">
            <h1 className="birthday-heading">🎉 Happy Birthday!</h1>
            <h2 className="birthday-name">{item.title}</h2>
            <p className="birthday-designation">{item.designation}</p>
          </div>
          <audio src="/audio/happy-birthday.mp3" autoPlay loop />
        </div>
      ) : (
        <div className="display-window">
          {/* Image */}
          {item.type === "image" && (
            <img src={item.media_url} alt={item.title} className="display-media" />
          )}

          {/* Video */}
          {item.type === "video" && (
            <video
              key={item.media_url}
              ref={videoRef}
              src={item.media_url}
              autoPlay
              controls
              onEnded={advance}
              onError={() => setTimeout(advance, 10000)}
              className="display-media"
            />
          )}

          {/* PDF (Auto-advancing slideshow) */}
          {item.media_url?.toLowerCase().endsWith(".pdf") && (
            <PdfSlideshow url={item.media_url} duration={15000} onFinish={advance} />
          )}

          {/* YouTube */}
          {item.type === "youtube" && (
            <>
              {!isOnline ? (
                <OfflineYouTubeSkip advance={advance} />
              ) : getYouTubeId(item.media_url) ? (
                <YouTube
                  videoId={getYouTubeId(item.media_url)}
                  opts={{
                    width: "100%",
                    height: "100%",
                    playerVars: { autoplay: 1, mute: 1, controls: 0, fs: 0, rel: 0 },
                  }}
                  onReady={(e) => {
                    try {
                      e.target.playVideo();
                      setTimeout(() => {
                        e.target.unMute();
                        e.target.setVolume(100);
                      }, 1500);
                    } catch (err) {
                      console.warn("Autoplay retry failed:", err);
                    }
                  }}
                  onEnd={advance}
                  className="youtube-iframe"
                />
              ) : (
                <div className="display-window no-content">
                  <h2>Invalid YouTube URL</h2>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 🔵 Online / Offline Indicator */}
      <div className="status-indicator">
        {isOnline ? "🟢 Online Mode" : "🔴 Offline Mode – YouTube Skipped"}
      </div>
    </>
  );
}
