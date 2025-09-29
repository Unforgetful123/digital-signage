// src/components/ContentUpload.jsx
import React, { useState } from 'react';
import { supabase } from '../api/supabase';

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

    if (!title.trim() || !startTime || !endTime ||
        ((type === 'image' || type === 'video') && !file) ||
        (type === 'youtube' && !youtubeUrl.trim())) {
      return alert('Please fill in all required fields.');
    }

    setLoading(true);
    try {
      // 0) sanity log for supabase url/key
      console.log('[Upload] supabase URL:', supabase?.rest?.url);

      let mediaUrl = '';
      if (type === 'alert') {
        mediaUrl = alertText.trim();
      } else if (type === 'youtube') {
        mediaUrl = youtubeUrl.trim();
      } else {
        // 1) upload to storage
        const path = `public/${Date.now()}_${file.name}`;
        console.log('[Upload] uploading to', path);
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('media')
          .upload(path, file);

        if (uploadError) {
          console.error('[Upload] storage.upload error:', uploadError);
          throw uploadError;
        }
        console.log('[Upload] storage.upload ok:', uploadData);

        // 2) get public URL
        const { data: urlData, error: urlError } = supabase
          .storage
          .from('media')
          .getPublicUrl(uploadData.path);

        if (urlError) {
          console.error('[Upload] storage.getPublicUrl error:', urlError);
          throw urlError;
        }
        mediaUrl = urlData.publicUrl;
        console.log('[Upload] publicUrl:', mediaUrl);
      }

      // 3) insert row
      const { data: insertData, error: insertError } = await supabase
        .from('content')
        .insert([{
          title,
          type,
          media_url: mediaUrl,
          start_time: new Date(startTime).toISOString(),
          end_time:   new Date(endTime).toISOString(),
          priority:   1,
        }])
        .select(); // optional, for debug

      if (insertError) {
        console.error('[Upload] content.insert error:', insertError);
        throw insertError;
      }
      console.log('[Upload] content.insert ok:', insertData);

      alert('Content uploaded successfully!');
      setTitle('');
      setType('image');
      setFile(null);
      setYoutubeUrl('');
      setStartTime('');
      setEndTime('');
      setAlertText('');
    } catch (err) {
      console.error('[Upload] FAILED:', err);
      alert('Error: ' + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={uploadContent} className="form-card">
      <h2 className="card-heading">Upload &amp; Schedule Content</h2>

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
  )
}
