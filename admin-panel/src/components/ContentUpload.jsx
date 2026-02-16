// src/components/ContentUpload.jsx
import React, { useState, useEffect} from 'react';
import pb from '../services/pocketbase';   // ✅ PocketBase client

export default function ContentUpload() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('image');
  const [file, setFile] = useState(null);
  const [pptFile, setPptFile] = useState(null); // ✅ NEW
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertText, setAlertText] = useState('');
  const [location, setLocation] = useState('Global'); 
  const [availableLocations, setAvailableLocations] = useState([]);


  // 📡 Fetch locations from your "displays" collection
  useEffect(() => {
    const fetchDisplays = async () => {
      try {
        // 1. Fetch all records from the 'displays' collection
        const records = await pb.collection('displays').getFullList();
        
        console.log("📡 Displays found in DB:", records); // Check your console for this!

        // 2. Extract the 'location' field from each record
        // We use .filter(Boolean) to remove any displays that don't have a location set yet
        const unique = [...new Set(records.map(r => r.location))].filter(Boolean);
        
        console.log("📍 Unique locations identified:", unique);
        
        setAvailableLocations(unique);
      } catch (err) {
        console.error("❌ Failed to fetch locations:", err);
      }
    };

    fetchDisplays();
    
    // Optional: Refresh locations every 10 seconds in case a new screen is added
    const interval = setInterval(fetchDisplays, 10000);
    return () => clearInterval(interval);
  }, []);

  const uploadContent = async (e) => {
    e.preventDefault();
    if (!title.trim() || !startTime || !endTime) return alert('Fill required fields');

    setLoading(true);
    try {
      const common = {
        title,
        type,
        location, // ✅ This will now work
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
        // ✅ Upload PPT file
        const formData = new FormData();
        Object.entries(common).forEach(([k, v]) => formData.append(k, v));
        if (file) formData.append('file', file);
        await pb.collection('content').create(formData);
      } else {
        // ✅ image or video
        const formData = new FormData();
        Object.entries(common).forEach(([k, v]) => formData.append(k, v));
        formData.append('file', file);
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
      alert(`✅ Content uploaded for ${location}!`);
    }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={uploadContent} className="form-card">
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
          <option value="ppt">PDF File</option> {/* ✅ NEW */}
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
            accept=".ppt,.pptx,.pps,.ppsx"
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

      {/* 📍 NEW: Location Dropdown */}
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
  );
}
