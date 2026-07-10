import React, { useState, useRef } from 'react';
import pb from '../services/pocketbase'; 
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function BirthdayUpload() {
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [dob, setDob] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('designation', designation);
      formData.append('dob', new Date(dob).toISOString());
      if (photoFile) formData.append('photo', photoFile); 

      await pb.collection('birthday').create(formData);
      toast.success('Birthday added successfully!');
      setName(''); setDesignation(''); setDob(''); setPhotoFile(null);
    } catch (err) {
      toast.error('Failed to save birthday.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const toastId = toast.loading('Reading Excel file...');
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) throw new Error("The file appears to be empty.");

      const existingRecords = await pb.collection('birthday').getFullList({ fields: 'name,dob', requestKey: null });
      const existingSet = new Set(
        existingRecords.map(r => `${r.name.toLowerCase().trim()}_${new Date(r.dob).toISOString().split('T')[0]}`)
      );

      let addedCount = 0;
      let skippedCount = 0;

      const getCol = (row, ...possibleNames) => {
        const key = Object.keys(row).find(k => possibleNames.includes(k.toLowerCase().trim()));
        return key ? row[key] : null;
      };

      for (const row of rows) {
        const rowName = getCol(row, 'name', 'full name');
        const rowDesig = getCol(row, 'designation', 'role', 'title');
        const rowDobRaw = getCol(row, 'dob', 'date of birth', 'birthday');

        if (!rowName || !rowDobRaw) {
          skippedCount++;
          continue; 
        }

        let parsedDate = new Date(rowDobRaw);
        if (isNaN(parsedDate.getTime())) {
          skippedCount++;
          continue; 
        }

        const dateString = parsedDate.toISOString().split('T')[0];
        const signature = `${String(rowName).toLowerCase().trim()}_${dateString}`;

        if (existingSet.has(signature)) {
          skippedCount++; 
          continue; 
        }

        await pb.collection('birthday').create({
          name: String(rowName).trim(),
          designation: String(rowDesig || '').trim(),
          dob: `${dateString} 12:00:00.000Z`,
        });

        existingSet.add(signature);
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
      <div className="form-row">
        <div className="form-group">
          <label>Employee Name</label>
          <input className="form-control" type="text" value={name} onChange={e => setName(e.target.value)} required disabled={loading} />
        </div>
        <div className="form-group">
          <label>Designation</label>
          <input className="form-control" type="text" value={designation} onChange={e => setDesignation(e.target.value)} required disabled={loading} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Date of Birth</label>
          <input className="form-control" type="date" value={dob} onChange={e => setDob(e.target.value)} required disabled={loading} />
        </div>
        <div className="form-group">
          <label>Upload Photo (Optional)</label>
          <input className="form-control" type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files[0])} disabled={loading} />
        </div>
      </div>

      {/* 🎯 UPDATED: Form actions with helper text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
        <div className="form-actions" style={{ margin: 0 }}>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Saving..." : "🎂 Add Birthday"}
          </button>
          <button type="button" disabled={loading} onClick={() => fileInputRef.current.click()} className="btn-secondary" style={{ marginLeft: '10px', color: '#ffffff', backgroundColor: '#16a34a', border: '1px solid #16a34a' }}>
            📄 Upload CSV / Excel
          </button>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, textAlign: 'right' }}>
          <strong>Excel Format Should Contain Headers:</strong> Name, Designation, DOB
        </p>
      </div>

      <input type="file" accept=".csv, .xlsx" onChange={handleBulkUpload} ref={fileInputRef} style={{ display: 'none' }} />
    </form>
  );
}