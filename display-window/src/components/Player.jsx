import React, { useEffect, useState, useRef } from "react";
import YouTube from "react-youtube";
import { io } from "socket.io-client";
import confetti from "canvas-confetti";
import pb from "../services/pocketbase";   // ✅ PocketBase client
import "../App.css";

const SOCKET_HOST =
  import.meta?.env?.VITE_SOCKET_HOST /* Vite */ || window.location.hostname;

// Socket.IO for emergency overrides
const socket = io(`http://${SOCKET_HOST}:4000`);

export default function Player() {
  const [content, setContent] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [current, setCurrent] = useState(0);
  const [emergency, setEmergency] = useState(null);
  const videoRef = useRef(null);

  // Emergency events
  useEffect(() => {
    socket.on("emergencyTriggered", (data) => setEmergency(data));
    socket.on("emergencyCleared", () => setEmergency(null));
    return () => {
      socket.off("emergencyTriggered");
      socket.off("emergencyCleared");
    };
  }, []);

  // Fetch content & birthdays every 30s
  useEffect(() => {
    const fetchAll = async () => {
      try {
        // 1) Fetch Content
        const cData = await pb.collection("content").getFullList({ sort: "-created" });
        setContent(cData);

        // 2) Fetch today's birthdays
        const today = new Date();
        const mm = today.getMonth() + 1;
        const dd = today.getDate();

        const bAll = await pb.collection("birthday").getFullList();
        const todays = (bAll || []).filter((row) => {
          if (!row?.dob) return false;
          const d = new Date(row.dob);
          return d.getMonth() + 1 === mm && d.getDate() === dd;
        });
        setBirthdays(todays);
      } catch (err) {
        console.error("PB fetch error:", err);
        setContent([]);
        setBirthdays([]);
      }
    };

    fetchAll();
    const iv = setInterval(fetchAll, 30000);
    return () => clearInterval(iv);
  }, []);

  // Build carousel items
  const carouselItems = [
    ...birthdays.map((b) => ({
      type: "birthday",
      title: b.name,
      designation: b.designation,
      media_url: b.photo ? pb.files.getURL(b, b.photo) : null, // ✅ PocketBase file URL
    })),
    ...content
      .filter((i) => i.type !== "alert")
      .map((i) => ({
        ...i,
        media_url: i.file
          ? pb.files.getURL(i, i.file) // ✅ PB file URL for image/video
          : i.youtube_url || null,
      })),
  ];

  // Helper to advance carousel
  const advance = () =>
    setCurrent((prev) => (prev + 1) % (carouselItems.length || 1));

  // Current item
  const item = carouselItems[current];

  // 🎉 Confetti effect for birthdays
  useEffect(() => {
    if (item?.type === "birthday") {
      const canvas = document.createElement("canvas");
      canvas.classList.add("confetti");
      document.body.appendChild(canvas);

      const myConfetti = confetti.create(canvas, { resize: true });
      const duration = 10 * 1000;
      const end = Date.now() + duration;

      (function frame() {
        myConfetti({ particleCount: 5, spread: 60, origin: { y: 0.6 } });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        } else {
          canvas.remove();
        }
      })();
    }
  }, [item]);

  // Auto-cycle images, birthdays, PPT every 10s
  useEffect(() => {
    if (emergency) return;
    if (!carouselItems.length) return;
    const currentItem = carouselItems[current];
    let timer;
    if (
      currentItem.type === "image" ||
      currentItem.type === "birthday" ||
      currentItem.type === "ppt"
    ) {
      timer = setTimeout(advance, 10000);
    }
    return () => clearTimeout(timer);
  }, [carouselItems, current, emergency]);

  // Extract YouTube ID
  const getYouTubeId = (url) => {
    if (!url) return null;
    try {
      return new URL(url).searchParams.get("v");
    } catch {
      const m = url.match(/(?:youtu\.be\/|v=)([^#&?]{11})/);
      return m ? m[1] : null;
    }
  };

  // Emergency overlay
  if (emergency) {
    return (
      <div className="display-window emergency-view">
        <audio src="/siren.mp3" autoPlay loop />
        <div className="display-alert">
          <h2>🚨 {emergency.type.toUpperCase()} ALERT</h2>
          <p>{emergency.message}</p>
        </div>
      </div>
    );
  }

  // No items placeholder
  if (!carouselItems.length) {
    return (
      <div className="display-window no-content">
        <h2>No scheduled content or birthdays.</h2>
      </div>
    );
  }

  // ✅ Main rendering
  return (
    <>
      {item.type === "birthday" ? (
        <div className="birthday-ad">
          {/* Photo Section */}
          <div className="birthday-photo">
            {item.media_url && (
              <img src={item.media_url} alt={item.title} />
            )}
          </div>

          {/* Wishes + Name + Designation */}
          <div className="birthday-text">
            <h1 className="birthday-heading">🎉 Happy Birthday!</h1>
            <h2 className="birthday-name">{item.title}</h2>
            <p className="birthday-designation">{item.designation}</p>
          </div>

          {/* Background Music */}
          <audio src="/audio/happy-birthday.mp3" autoPlay loop />
        </div>
      ) : (
        <div className="display-window">
          {/* Image */}
          {item.type === "image" && (
            <img
              src={item.media_url}
              alt={item.title}
              className="display-media"
            />
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

          {/* YouTube */}
          {item.type === "youtube" && getYouTubeId(item.media_url) && (
            <YouTube
              videoId={getYouTubeId(item.media_url)}
              opts={{
                width: "100%",
                height: "100%",
                playerVars: { autoplay: 1, controls: 1, fs: 0, rel: 0 },
              }}
              onEnd={advance}
              className="youtube-iframe"
            />
          )}

          {/* PPT */}
          {item.type === "ppt" && (
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
                item.media_url
              )}`}
              frameBorder="0"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
              }}
            />
          )}
        </div>
      )}
    </>
  );
}
