import React, { useState, useRef, useEffect } from 'react';
import pb from '../services/pocketbase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function ContentUpload() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('image');
  const [file, setFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [location, setLocation] = useState('Global');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // 🎯 NEW: State to hold dynamic locations
  const [availableLocations, setAvailableLocations] = useState([]);

  // 🎯 NEW: Fetch unique locations from registered displays
  useEffect(() => {
    async function fetchLocations() {
      try {
        const displays = await pb.collection("displays").getFullList({
          fields: 'location',
          requestKey: null
        });

        // Use a Set to automatically remove duplicates 
        const uniqueLocations = new Set();
        displays.forEach(d => {
          const loc = (d.location || '').trim();
          if (loc) uniqueLocations.add(loc);
        });

        // Convert the Set back to an array and sort it alphabetically
        setAvailableLocations(Array.from(uniqueLocations).sort());
      } catch (err) {
        console.error("Failed to fetch display locations:", err);
      }
    }
    fetchLocations();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('type', type);
      formData.append('location', location);
      if (startTime) formData.append('start_time', new Date(startTime).toISOString());
      if (endTime) formData.append('end_time', new Date(endTime).toISOString());

      if (type === 'youtube') {
        formData.append('youtube_url', youtubeUrl);
      } else if (type === 'ppt') {
        formData.append('ppt_file', file);
      } else {
        formData.append('file', file);
      }

      await pb.collection('content').create(formData);
      toast.success('Media uploaded successfully!');
      
      setTitle(''); setFile(null); setYoutubeUrl(''); setStartTime(''); setEndTime('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload content.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setLoading(true);
    const toastId = toast.loading('Reading Excel file...');

    try {
      const data = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) throw new Error("The file appears to be empty.");

      const existingRecords = await pb.collection('content').getFullList({ filter: 'type = "youtube"', fields: 'youtube_url', requestKey: null });
      const existingUrls = new Set(existingRecords.map(r => r.youtube_url.trim()));

      let addedCount = 0;
      let skippedCount = 0;

      const getCol = (row, ...possibleNames) => {
        const key = Object.keys(row).find(k => possibleNames.includes(k.toLowerCase().trim()));
        return key ? row[key] : null;
      };

      for (const row of rows) {
        const rowTitle = getCol(row, 'title', 'name', 'video title');
        const rowUrl = getCol(row, 'url', 'youtube url', 'link');
        const rowLocation = getCol(row, 'location', 'target area', 'screen') || 'Global';
        const rowStart = getCol(row, 'start time', 'start', 'start_time');
        const rowEnd = getCol(row, 'end time', 'end', 'end_time');

        if (!rowTitle || !rowUrl) {
          skippedCount++;
          continue; 
        }

        const cleanUrl = String(rowUrl).trim();
        if (existingUrls.has(cleanUrl)) {
          skippedCount++;
          continue; 
        }

        const payload = {
          title: String(rowTitle).trim(),
          type: 'youtube',
          youtube_url: cleanUrl,
          location: String(rowLocation).trim()
        };

        if (rowStart) {
          const parsedStart = new Date(rowStart);
          if (!isNaN(parsedStart)) payload.start_time = parsedStart.toISOString();
        }
        if (rowEnd) {
          const parsedEnd = new Date(rowEnd);
          if (!isNaN(parsedEnd)) payload.end_time = parsedEnd.toISOString();
        }

        await pb.collection('content').create(payload);
        existingUrls.add(cleanUrl); 
        addedCount++;
      }

      toast.success(`Bulk Upload Complete! Added: ${addedCount} | Skipped: ${skippedCount}`, { id: toastId, duration: 5000 });
    } catch (err) {
      console.error("Bulk upload error:", err);
      toast.error(`Upload Error: ${err.message}`, { id: toastId }); 
    } finally {
      setLoading(false);
      e.target.value = null; 
    }
  };

  return (
    <form onSubmit={handleSubmit} className="compact-form">
      <div className="form-group">
        <label>Title</label>
        <input className="form-control" type="text" value={title} onChange={e => setTitle(e.target.value)} required disabled={loading} />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Media Type</label>
          <select className="form-control" value={type} onChange={e => setType(e.target.value)} disabled={loading}>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="youtube">YouTube</option>
            <option value="ppt">PDF Document</option>
          </select>
        </div>
        
        {/* 🎯 UPDATED: Dynamic Target Location Dropdown */}
        <div className="form-group">
          <label>Target Location</label>
          <select className="form-control" value={location} onChange={e => setLocation(e.target.value)} disabled={loading}>
            <option value="Global">Global (All Screens)</option>
            {availableLocations.map((loc, index) => (
              <option key={index} value={loc}>
                {loc.charAt(0).toUpperCase() + loc.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Start Time (Optional)</label>
          <input className="form-control" type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} disabled={loading} />
        </div>
        <div className="form-group">
          <label>End Time (Optional)</label>
          <input className="form-control" type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} disabled={loading} />
        </div>
      </div>

      <div className="form-group">
        <label>{type === 'youtube' ? 'YouTube URL' : 'Upload File'}</label>
        {type === 'youtube' ? (
          <input className="form-control" type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} required disabled={loading} />
        ) : (
          <input className="form-control" type="file" accept={type === 'image' ? 'image/*' : type === 'video' ? 'video/*' : '.pdf'} onChange={e => setFile(e.target.files[0])} required disabled={loading} />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
        <div className="form-actions" style={{ margin: 0 }}>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Processing...' : '📁 Upload & Schedule'}
          </button>
          <button type="button" disabled={loading} onClick={() => fileInputRef.current.click()} className="btn-secondary" style={{ marginLeft: '10px', color: '#ffffff', backgroundColor: '#16a34a', border: '1px solid #16a34a' }}>
            📄 Bulk YouTube Links
          </button>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, textAlign: 'right' }}>
          <strong>Excel Format Should Contain Headers:</strong> Title, URL, Location (optional), Start Time (optional), End Time (optional)
        </p>
      </div>

      <input type="file" accept=".csv, .xlsx" onChange={handleBulkUpload} ref={fileInputRef} style={{ display: 'none' }} />
    </form>
  );
}