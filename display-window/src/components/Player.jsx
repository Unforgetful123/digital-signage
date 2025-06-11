  // display-window/src/components/Player.jsx
  import { useEffect, useState, useRef } from 'react';
  import { supabase } from '../api/supabase';

  export default function Player() {
    const [content, setContent]       = useState([]);    // Combined queue: birthdays + scheduled
    const [current, setCurrent]       = useState(0);     // Index into content[]
    const [overrideItem, setOverride] = useState(null);  // { type: 'alert', … } or null

    const videoRef       = useRef(null);    // For <video> tags
    const ytPlayerRef    = useRef(null);    // For the current YT.Player instance
    const ytContainerRef = useRef(null);    // A single container; we'll insert fresh <div>s into it

    // ─────────────────────────────────────────────────────────────────────────────────
    // 1️⃣ Poll for Emergency Alerts (every 3 seconds)
    useEffect(() => {
      const checkAlert = async () => {
        try {
          const res = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/alerts/current`
          );
          const { alert } = await res.json();
          if (alert) {
            setOverride({
              type:    'alert',
              title:   alert.type,
              message: alert.message,
            });
          } else {
            setOverride(null);
          }
        } catch (err) {
          console.error("Alert fetch error:", err);
        }
      };

      checkAlert();
      const iv = setInterval(checkAlert, 3000);
      return () => clearInterval(iv);
    }, []);

    // ─────────────────────────────────────────────────────────────────────────────────
    // 2️⃣ Fetch birthdays + scheduled content on mount and whenever an alert clears
    useEffect(() => {
      const fetchAllContent = async () => {
        if (overrideItem && overrideItem.type === 'alert') {
          // Skip updating the queue while an alert is active
          return;
        }

        // 2a) Today's birthdays
        const todayMMDD = new Date().toISOString().slice(5, 10); // "MM-DD"
        const { data: bdData, error: bdError } = await supabase
          .from('birthdays')
          .select('name, designation, dob, video_url');

        if (bdError) {
          console.error("Birthdays fetch error:", bdError.message);
        }
        const birthdayItems = (bdData || [])
          .filter(b => b.dob.slice(5, 10) === todayMMDD)
          .map(b => ({
            type:        'birthday',
            title:       `Happy Birthday ${b.name}!`,
            designation: b.designation,
            media_url:   b.video_url || '',
          }));

        // 2b) Scheduled content (images, video files, YouTube) where start_time ≤ now ≤ end_time
        const now = new Date().toISOString();
        console.log("Now:", now);
        const { data: schedData, error: schedError } = await supabase
          .from('content')
          .select('*')
          .lte('start_time', now)
          .gte('end_time', now)
          .order('priority', { ascending: false });

        if (schedError) {
          console.error("Scheduled content fetch error:", schedError.message);
        }
        const scheduledItems = (schedData || []).map(item => ({
          type:      item.type,     // 'image' | 'video' | 'youtube'
          title:     item.title,
          media_url: item.media_url,
        }));

        // 2c) Combine birthdays first, then scheduled items
        const combined = [...birthdayItems, ...scheduledItems];
        console.log("🔍 Combined queue:", combined);

        setContent(combined);
      };

      fetchAllContent();
      const iv = setInterval(fetchAllContent, 30000);
      return () => clearInterval(iv);
    }, [overrideItem]);

    // ─────────────────────────────────────────────────────────────────────────────────
    // 3️⃣ Advance to next item
    const nextItem = () => {
      if (!content || content.length === 0) return;
      setCurrent(prev => (prev + 1) % content.length);
    };

    // ─────────────────────────────────────────────────────────────────────────────────
    // 4️⃣ Whenever content/current/override changes, clean up and play/display new item
    useEffect(() => {
      // 4a) Clear any pending image timeout
      clearTimeout(window.__imageTimeout);

      clearTimeout(window.__birthdayTimeout);

      clearTimeout(window.__videoTimeout);


      // 4b) Destroy any existing YouTube player
      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }
      // Also wipe out any iframes in the container
      if (ytContainerRef.current) {
        ytContainerRef.current.innerHTML = "";
      }

      // 4c) Pause/reset any HTML5 <video>
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
      }

      // 4d) If an alert override is active, stop here
      if (overrideItem && overrideItem.type === 'alert') {
        return;
      }

      // 4e) Otherwise, handle playback/display of the new queue item
      handleItemPlayback();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content, overrideItem, current]);

    // ─────────────────────────────────────────────────────────────────────────────────
    // 5️⃣ Display or play the current item
    const handleItemPlayback = () => {
      if (!content || content.length === 0) return;
      const item = content[current];
      console.log("👁‍🗨 Now showing item:", current, item);

      // 5a) Image: display 5 seconds, then advance
      if (item.type === 'image') {
        window.__imageTimeout = setTimeout(nextItem, 5000);
        return;
      }

      // —— Birthday: show exactly 10 seconds, then nextItem() ——
      if (item.type === 'birthday') {
        console.log("🎂 [birthday] displaying for 10 seconds");
        window.__birthdayTimeout = setTimeout(nextItem, 5_000); // ← now 5 000 ms = 5 sec
        return;
      }

      // 5b) Video file (.mp4, etc.): rely on <video onEnded>
      if (item.type === 'video') {
        console.log("🎥 [video] will play to end (onEnded → nextItem)");
        // Rendered in JSX with onEnded → nextItem()
        return;
      }

      // 5c) YouTube: create a brand-new container+YT.Player, listen for ENDED
      if (item.type === 'youtube') {
        console.log("▶️ [handleItemPlayback] youtube branch for URL:", item.media_url);
        if (!window.YT || !window.YT.Player) {
          console.log("    YT API not ready—queuing createYouTubePlayer with idx", current);
          window.onYouTubeIframeAPIReady = () => createYouTubePlayer(item.media_url, current);
        } else {
          console.log("    YT.Player already available—calling createYouTubePlayer with idx", current);
          createYouTubePlayer(item.media_url, current);
        }
        return;
      }
    };

    // ─────────────────────────────────────────────────────────────────────────────────
    // 5c.i) Create/configure a YT.Player inside a unique <div> using `idx`
    const createYouTubePlayer = (youtubeUrl, idx) => {
      
      if (!ytContainerRef.current) return;

      // Destroy any existing player
      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }

      // Clear out old iframe(s)
      ytContainerRef.current.innerHTML = "";

      // Extract YouTube IDs
      const videoId    = extractYouTubeID(youtubeUrl);
      const playlistId = extractYouTubePlaylistID(youtubeUrl);
      
      // Create a new <div> with a unique ID
      const playerId = `yt-player-${idx}`; // e.g. "yt-player-0", "yt-player-1"
      const newDiv = document.createElement("div");
      newDiv.id = playerId;
      newDiv.style.width  = "100%";
      newDiv.style.height = "100%";
      ytContainerRef.current.appendChild(newDiv);

       // Measure actual pixel size
      const { width, height } = ytContainerRef.current.getBoundingClientRect();
      

      // Instantiate the YT.Player
      ytPlayerRef.current = new window.YT.Player(playerId, {
        width:  Math.floor(width),
        height: Math.floor(height),
        videoId,
        playerVars: {
          autoplay:    1,
          mute:        1,
          loop:        playlistId ? 1 : 0,
          list:        playlistId || undefined,
          enablejsapi: 1,
          origin:      window.location.origin,
        },
        events: {
          onReady: (event) => 
            event.target.playVideo(),
            onStateChange: (event) => {
            // 0 === YT.PlayerState.ENDED
              if (event.data === window.YT.PlayerState.ENDED) nextItem();
            },
            onError: (event) => nextItem(),
        },
      });
    };

    // ─────────────────────────────────────────────────────────────────────────────────
    // 6️⃣ Utility: extract “v” parameter (video ID) from a YouTube URL
    function extractYouTubeID(url) {
      try {
        const u = new URL(url);
        const params = new URLSearchParams(u.search);
        return params.get('v') || "";
      } catch {
        return "";
      }
    }

    // 7️⃣ Utility: extract “list” (playlist ID) if present
    function extractYouTubePlaylistID(url) {
      try {
        const u = new URL(url);
        const params = new URLSearchParams(u.search);
        return params.get('list') || "";
      } catch {
        return "";
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────────
    // 8️⃣ Determine what to show: override alert if active, otherwise content[current]
    let toShow = null;
    if (overrideItem && overrideItem.type === 'alert') {
      toShow = overrideItem;
    } else if (content.length > 0) {
      toShow = content[current];
    }

    // ─────────────────────────────────────────────────────────────────────────────────
    // 9️⃣ Fallback UI if nothing is available
    if (!toShow) {
      return (
        <div className="h-screen bg-black text-white flex flex-col items-center justify-center">
          <img
            alt="No content"
            className="w-48 mb-4"
          />
          <h2 className="text-xl">No content to display.</h2>
          <p className="text-sm text-gray-400">Please check back later.</p>
        </div>
      );
    }

    // ─────────────────────────────────────────────────────────────────────────────────
    // 🔟 Render according to toShow.type
    console.log("🎬 Rendering toShow:", toShow);
    console.log("🎯 toShow.type:", toShow.type, "media_url:", toShow.media_url);

    return (
       <div className="w-screen h-screen bg-black overflow-hidden relative">
        <div className="w-full h-full relative">

          {/* Birthday */}
          {toShow.type === 'birthday' && (
            <div className="w-full h-full flex flex-col items-center justify-center bg-yellow-400 text-black p-6">
              <h1 className="text-4xl font-bold mb-4">{toShow.title}</h1>
              <p className="mb-6">{toShow.designation}</p>
              {toShow.media_url && (
                <video
                  src={toShow.media_url}
                  controls
                  autoPlay
                  muted
                  onEnded={nextItem}
                  className="w-full h-full object-contain rounded shadow-lg bg-black"
                />
              )}
            </div>
          )}

          {/* Emergency Alert */}
          {toShow.type === 'alert' && (
            <div className="w-full h-full flex flex-col items-center justify-center bg-red-600 p-6">
              <h2 className="text-4xl font-bold mb-4">🚨 {toShow.title}</h2>
              <p className="text-lg">{toShow.message}</p>
            </div>
          )}

          {/* Image */}
          {toShow.type === 'image' && (
            <img
              src={toShow.media_url}
              alt={toShow.title}
            />
          )}

          {/* Video File */}
          {toShow.type === 'video' && (
            <video
              //ref={videoRef}
              src={toShow.media_url}
              controls
              autoPlay
              muted
              onEnded={nextItem}
            />
          )}

          {/* YouTube Embed */}
          {toShow.type === 'youtube' && (
            <div
              ref={ytContainerRef}
              className="yt-container"
            />
          )}

        </div>
      </div>
    );
  }
