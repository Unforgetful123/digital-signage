import React, { useState, useRef } from 'react';
import pb from '../services/pocketbase'; 
import * as XLSX from 'xlsx';

export default function BirthdayUpload() {
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [dob, setDob] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // 🎯 NEW: A reference to trigger the hidden file input
  const fileInputRef = useRef(null);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!name || !designation || !dob) {
      return alert("Please fill in Name, Designation, and Date of Birth.");
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('designation', designation);
      formData.append('dob', new Date(dob).toISOString());
      if (photoFile) formData.append('photo', photoFile); 
      if (videoFile) formData.append('video', videoFile); 

      await pb.collection('birthday').create(formData);
      setStaff({ name, designation });
    } catch (err) {
      console.error('Birthday upload error:', err);
      alert(err?.response?.message || err.message || "There was an error saving the birthday.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm(`Are you sure you want to bulk import from ${file.name}?`)) {
      e.target.value = null;
      return;
    }

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) throw new Error("The file appears to be empty.");

      // Fetch existing for duplicate check
      const existingRecords = await pb.collection('birthday').getFullList({ fields: 'name,dob', requestKey: null });
      const existingSet = new Set(
        existingRecords.map(r => `${r.name.toLowerCase().trim()}_${new Date(r.dob).toISOString().split('T')[0]}`)
      );

      let addedCount = 0;
      let skippedCount = 0;

      // Helper function to find columns regardless of exact capitalization or spaces
      const getCol = (row, ...possibleNames) => {
        const key = Object.keys(row).find(k => possibleNames.includes(k.toLowerCase().trim()));
        return key ? row[key] : null;
      };

      for (const row of rows) {
        // Super flexible column searching
        const rowName = getCol(row, 'name', 'full name', 'employee name');
        const rowDesig = getCol(row, 'designation', 'role', 'title', 'position');
        const rowDobRaw = getCol(row, 'dob', 'date of birth', 'birthday');

        if (!rowName || !rowDobRaw) {
          skippedCount++;
          continue; 
        }

        // Safe Date Parsing
        let parsedDate = new Date(rowDobRaw);
        if (isNaN(parsedDate.getTime())) {
          console.warn("Invalid date skipped for:", rowName);
          skippedCount++;
          continue; 
        }

        const dateString = parsedDate.toISOString().split('T')[0];
        const signature = `${String(rowName).toLowerCase().trim()}_${dateString}`;

        if (existingSet.has(signature)) {
          skippedCount++; // Duplicate found, skip!
          continue; 
        }

        // Format Date exactly as PocketBase demands: "YYYY-MM-DD 12:00:00.000Z"
        const formattedPBDate = `${dateString} 12:00:00.000Z`;

        await pb.collection('birthday').create({
          name: String(rowName).trim(),
          designation: String(rowDesig || '').trim(),
          dob: formattedPBDate,
        });

        existingSet.add(signature);
        addedCount++;
      }

      alert(`✅ Bulk Upload Complete!\n\nAdded: ${addedCount}\nSkipped (Duplicates/Missing Data): ${skippedCount}`);

    } catch (err) {
      console.error("Bulk upload error:", err);
      // Now it will tell you EXACTLY what went wrong
      alert(`❌ Upload Error: ${err.message}`); 
    } finally {
      setLoading(false);
      e.target.value = null; 
    }
  };

  if (staff) {
    return (
      <div className="birthday-success-card">
        <h2>🎉 Birthday Added!</h2>
        <p>
          <strong>{staff.name}</strong> ({staff.designation}) was saved successfully.
        </p>
        <button
          onClick={() => {
            setName('');
            setDesignation('');
            setDob('');
            setPhotoFile(null);
            setVideoFile(null);
            setStaff(null);
          }}
          disabled={loading}
          className="btn btn-primary"
        >
          Add Another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="birthday-form">
      <h2>Add Birthday</h2>

      <div className="form-group">
        <label htmlFor="birthday-name">Name</label>
        <input
          id="birthday-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="birthday-designation">Designation</label>
        <input
          id="birthday-designation"
          type="text"
          value={designation}
          onChange={e => setDesignation(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="birthday-dob">Date of Birth</label>
        <input
          id="birthday-dob"
          type="date"
          value={dob}
          onChange={e => setDob(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="birthday-photo">Upload Photo</label>
        <input
          id="birthday-photo"
          type="file"
          accept="image/*"
          onChange={e => setPhotoFile(e.target.files[0])}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="birthday-video">Upload Video (optional)</label>
        <input
          id="birthday-video"
          type="file"
          accept="video/*"
          onChange={e => setVideoFile(e.target.files[0])}
          disabled={loading}
        />
      </div>

      {/* 🎯 NEW: Side-by-side buttons */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-success"
          style={{ flex: 1, padding: '10px' }}
        >
          {loading ? "Saving..." : "Add Birthday"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => fileInputRef.current.click()}
          style={{ 
            flex: 1, 
            padding: '10px', 
            backgroundColor: '#1d4ed8', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer' 
          }}
        >
          {loading ? "Processing..." : "Upload CSV / Excel"}
        </button>
      </div>
      <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '10px' }}>
          Format your CSV/ Excel file should be with headers: <strong>Name</strong>, <strong>Designation</strong>, and <strong>DOB (YYYY-MM-DD)</strong>.
          <em>(Duplicates are automatically skipped).</em>
        </p>

      {/* 🎯 NEW: Hidden file input triggered by the button above */}
      <input 
        type="file" 
        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
        onChange={handleBulkUpload}
        ref={fileInputRef}
        style={{ display: 'none' }}
      />
    </form>
  );
}