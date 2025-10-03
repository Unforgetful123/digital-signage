// src/components/ContentUpload.jsx
import React, { useState } from 'react';
import pb from '../services/pocketbase';   // ✅ PocketBase client

export default function ContentUpload() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('image');
  const [file, setFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertText, setAlertText] = useState('');

  const uploadContent = async (e) => {
    e.preventDefault();

    if (
      !title.trim() || !startTime || !endTime ||
      ((type === 'image' || type === 'video') && !file) ||
      (type === 'youtube' && !youtubeUrl.trim()) ||
      (type === 'alert' && !alertText.trim())
    ) {
      return alert('Please fill in all required fields.');
    }

    setLoading(true);
    try {
      // ✅ Build data depending on type
      const common = {
        title,
        type,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        priority: 1,
      };

      if (type === 'alert') {
        // text-only record
        await pb.collection('content').create({
          ...common,
          alert_text: alertText.trim(),
        });
      } else if (type === 'youtube') {
        // store link in field
        await pb.collection('content').create({
          ...common,
          youtube_url: youtubeUrl.trim(),
        });
      } else {
        // image or video with file upload
        const formData = new FormData();
        Object.entries(common).forEach(([k, v]) => formData.append(k, v));
        formData.append('file', file); // ✅ field name must match PB schema
        await pb.collection('content').create(formData);
      }

      alert('✅ Content uploaded successfully!');
      // Reset form
      setTitle('');
      setType('image');
      setFile(null);
      setYoutubeUrl('');
      setStartTime('');
      setEndTime('');
      setAlertText('');
    } catch (err) {
      console.error('[Upload] FAILED:', err);
      alert('Error: ' + (err?.response?.message || err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={uploadContent} className="form-card">
      <div className="card-heading">Upload & Schedule Content</div>

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
          <option value="alert">Alert (Text Only)</option>
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

      {type === 'alert' && (
        <div className="form-group">
          <label htmlFor="alert-message">Alert Message</label>
          <textarea
            id="alert-message"
            value={alertText}
            onChange={e => setAlertText(e.target.value)}
            rows={3}
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

      <button type="submit" disabled={loading}>
        {loading ? 'Uploading…' : 'Upload & Schedule'}
      </button>
    </form>
  );
}
