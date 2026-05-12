// src/components/ContentUpload.jsx
import React, { useState, useEffect } from 'react';
import pb from '../services/pocketbase';   // ✅ PocketBase client

export default function ContentUpload() {
  // --- UPLOAD STATE ---
  const [title, setTitle] = useState('');
  const [type, setType] = useState('image');
  const [file, setFile] = useState(null);
  const [pptFile, setPptFile] = useState(null); 
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertText, setAlertText] = useState('');
  const [location, setLocation] = useState('Global'); 
  const [availableLocations, setAvailableLocations] = useState([]);

  // --- PLAYLIST STATE ---
  const [playlist, setPlaylist] = useState([]);

  // 📡 Fetch locations from your "displays" collection
  useEffect(() => {
    const fetchDisplays = async () => {
      try {
        const records = await pb.collection('displays').getFullList();
        const unique = [...new Set(records.map(r => r.location))].filter(Boolean);
        setAvailableLocations(unique);
      } catch (err) {
        console.error("❌ Failed to fetch locations:", err);
      }
    };

    fetchDisplays();
    const interval = setInterval(fetchDisplays, 10000);
    return () => clearInterval(interval);
  }, []);

  // 📡 Fetch Current Playlist & Subscribe to Real-Time Changes
  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const records = await pb.collection('content').getFullList({
          sort: '-created', // Newest first
        });
        setPlaylist(records);
      } catch (err) {
        console.error("Failed to fetch playlist", err);
      }
    };

    fetchPlaylist();

    // Listen for live updates (uploads/deletes)
    const unsub = pb.collection('content').subscribe('*', () => {
      fetchPlaylist();
    });

    return () => {
      pb.collection('content').unsubscribe('*');
    };
  }, []);

  // 🗑️ Delete Content Function
  const handleDeleteContent = async (id, itemTitle) => {
    if (!window.confirm(`Are you sure you want to remove "${itemTitle}" from the screens?`)) return;
    
    try {
      await pb.collection('content').delete(id);
      // We don't need to manually update the state here because the real-time subscription will do it!
    } catch (err) {
      console.error("Failed to delete content:", err);
      alert("Failed to delete. Please try again.");
    }
  };

  // 📤 Upload Content Function
  const uploadContent = async (e) => {
    e.preventDefault();
    if (!title.trim() || !startTime || !endTime) return alert('Fill required fields');

    setLoading(true);
    try {
      const common = {
        title,
        type,
        location,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        priority: 1,
      };

      if (type === 'alert') {
        await pb.collection('content').create({
          ...common,
          alert_text: alertText.trim(),
        });
      } else if (type === 'youtube') {
        await pb.collection('content').create({
          ...common,
          youtube_url: youtubeUrl.trim(),
        });
      } else if (type === 'ppt') {
        // ✅ Fixed PPT upload bug
        const formData = new FormData();
        Object.entries(common).forEach(([k, v]) => formData.append(k, v));
        if (pptFile) formData.append('ppt_file', pptFile);
        await pb.collection('content').create(formData);
      } else {
        // ✅ image or video
        const formData = new FormData();
        Object.entries(common).forEach(([k, v]) => formData.append(k, v));
        if (file) formData.append('file', file);
        await pb.collection('content').create(formData);
      }

      alert('✅ Content uploaded successfully!');

      // Reset form
      setTitle('');
      setType('image');
      setFile(null);
      setPptFile(null);
      setYoutubeUrl('');
      setStartTime('');
      setEndTime('');
      setAlertText('');
      setLocation('Global');
    } catch (err) {
      console.error('[Upload] FAILED:', err);
      alert('❌ Failed to upload content. Please check the logs.');
    }
    finally { setLoading(false); }
  };

  return (
    <div>
      {/* ==============================
          1. THE UPLOAD FORM
      ============================== */}
      <form onSubmit={uploadContent} className="form-card" style={{ marginBottom: '2rem' }}>
        <h2>Upload & Schedule Content</h2>

        <div className="form-group">
          <label htmlFor="content-title">Title</label>
          <input
            id="content-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="content-type">Type</label>
          <select
            id="content-type"
            value={type}
            onChange={e => setType(e.target.value)}
          >
            <option value="image">Image</option>
            <option value="video">Video File</option>
            <option value="youtube">YouTube Link</option>
            <option value="ppt">PDF File</option> 
          </select>
        </div>

        {type === 'youtube' && (
          <div className="form-group">
            <label htmlFor="youtube-url">YouTube URL</label>
            <input
              id="youtube-url"
              type="url"
              value={youtubeUrl}
              onChange={e => setYoutubeUrl(e.target.value)}
              required
            />
          </div>
        )}

        {(type === 'image' || type === 'video') && (
          <div className="form-group">
            <label htmlFor="file-upload">Select File</label>
            <input
              id="file-upload"
              type="file"
              accept={type === 'image' ? 'image/*' : 'video/*'}
              onChange={e => setFile(e.target.files[0])}
              required
            />
          </div>
        )}

        {type === 'ppt' && (
          <div className="form-group">
            <label htmlFor="ppt-upload">Upload PowerPoint File</label>
            <input
              id="ppt-upload"
              type="file"
              accept=".ppt,.pptx,.pps,.ppsx,.pdf"
              onChange={e => setPptFile(e.target.files[0])}
              required
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="start-time">Start Time</label>
          <input
            id="start-time"
            type="datetime-local"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="end-time">End Time</label>
          <input
            id="end-time"
            type="datetime-local"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="content-location">Target Location</label>
          <select 
            id="content-location"
            value={location}
            onChange={e => setLocation(e.target.value)}
          >
            <option value="Global">All Screens (Global)</option>
            {availableLocations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Uploading…' : 'Upload & Schedule'}
        </button>
      </form>
    </div>
  );
}