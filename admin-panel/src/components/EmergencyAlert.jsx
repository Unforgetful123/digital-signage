import React, { useState, useEffect } from 'react';
import pb from '../services/pocketbase'; 
import toast from 'react-hot-toast';

const ALL_AREA = { id: 'all', name: '📢 All Areas' };

export default function EmergencyAlert() {
  const [type, setType] = useState('fire');
  const [message, setMessage] = useState('');
  const [targetArea, setTargetArea] = useState(ALL_AREA.id);
  const [areas, setAreas] = useState([ALL_AREA]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    async function fetchLocations() {
      try {
        const displays = await pb.collection("displays").getFullList({ fields: 'location', requestKey: null });
        const uniqueLocations = new Set();
        displays.forEach(d => {
          const loc = (d.location || '').trim();
          if (loc) uniqueLocations.add(loc);
        });

        const fetchedAreas = Array.from(uniqueLocations).map(loc => ({
          id: loc,
          name: loc.charAt(0).toUpperCase() + loc.slice(1) 
        }));

        setAreas([ALL_AREA, ...fetchedAreas.sort((a, b) => a.name.localeCompare(b.name))]);
      } catch (err) {
        setAreas([ALL_AREA]);
      }
    }
    fetchLocations();
  }, []);

  const handleSubmit = async () => {
    if (!message.trim()) return toast.error("Enter a message");

    try {
      if (isScheduled) {
        if (!startTime || !endTime) return toast.error("Please select both start and end times.");

        await pb.collection('content').create({
          type: 'scheduled_alert',
          title: message.trim(),
          location: targetArea === 'all' ? 'Global' : targetArea,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          youtube_url: type 
        });

        toast.success(`🗓️ ${type.toUpperCase()} alert scheduled!`);
        setMessage(""); setStartTime(""); setEndTime(""); setIsScheduled(false);
        return; 
      }

      let targets = [];
      if (targetArea === "all") {
        targets = await pb.collection("displays").getFullList({ requestKey: null });
      } else {
        targets = await pb.collection("displays").getFullList({ filter: `location = "${targetArea}"`, requestKey: null });
      }

      if (!targets.length) return toast.error("No active displays found in this area.");

      await Promise.all(
        targets.map((display) =>
          pb.collection("displays").update(
            display.id,
            { current_type: "alert", current_title: message.trim(), current_command: type },
            { requestKey: null }
          )
        )
      );

      toast.success(`🚨 ${type.toUpperCase()} alert triggered live!`);
      setMessage("");
    } catch (err) {
      toast.error("Failed to process alert.");
    }
  };

  const clear = async () => {
    try {
      let targets = [];
      if (targetArea === "all") {
        targets = await pb.collection("displays").getFullList({ requestKey: null });
      } else {
        targets = await pb.collection("displays").getFullList({ filter: `location = "${targetArea}"`, requestKey: null });
      }

      await Promise.all(
        targets.map((display) =>
          pb.collection("displays").update(
            display.id,
            { current_type: "idle", current_title: null, current_command: null },
            { requestKey: null }
          )
        )
      );

      toast.success("❌ Live emergency cleared");
    } catch (err) {
      toast.error("Failed to clear alert.");
    }
  };

  return (
    <div className="compact-form">
      <div className="form-row">
        <div className="form-group">
          <label>Target Area</label>
          <select className="form-control" value={targetArea} onChange={e => setTargetArea(e.target.value)}>
            {areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Alert Type</label>
          <select className="form-control" value={type} onChange={e => setType(e.target.value)}>
            <option value="fire">🔥 Fire</option>
            <option value="flood">🌊 Flood</option>
            <option value="quake">🌍 Quake</option>
            <option value="medical">🚑 Medical</option>
            <option value="intruder">🚨 Intruder</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Alert Message</label>
        <input className="form-control" type="text" value={message} onChange={e => setMessage(e.target.value)} placeholder="e.g., Evacuate immediately" />
      </div>

      {/* 🎯 UPDATED: perfectly aligned checkbox container */}
      <div className="form-group" style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0 }}>
          <input 
            type="checkbox" 
            checked={isScheduled} 
            onChange={(e) => setIsScheduled(e.target.checked)} 
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span>🗓️ Schedule this alert for later</span>
        </label>
        
        {isScheduled && (
          <div className="form-row" style={{ marginTop: '15px' }}>
            <div className="form-group">
              <label>Start Time</label>
              <input className="form-control" type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="form-group">
              <label>End Time</label>
              <input className="form-control" type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      <div className="form-actions" style={{ marginTop: '10px' }}>
        <button onClick={handleSubmit} className={isScheduled ? "btn-primary" : "btn-danger"}>
          {isScheduled ? "🗓️ Schedule Alert" : "🚨 Fire Alert NOW"}
        </button>
        {!isScheduled && (
          <button onClick={clear} className="btn-secondary">
            ❌ Clear Live Alerts
          </button>
        )}
      </div>
    </div>
  );
}