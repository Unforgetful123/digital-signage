import React, { useState, useEffect } from 'react';
import pb from '../services/pocketbase'; // ✅ No more socket.io imports

// Define ALL as a constant
const ALL_AREA = { id: 'all', name: '📢 All Areas' };

export default function EmergencyAlert() {
  const [type, setType] = useState('fire');
  const [message, setMessage] = useState('');
  const [targetArea, setTargetArea] = useState(ALL_AREA.id);
  const [areas, setAreas] = useState([ALL_AREA]);

  // Effect to fetch unique locations from PocketBase
  useEffect(() => {
    async function fetchLocations() {
      try {
        const displays = await pb.collection("displays").getFullList({
          fields: 'location',
          requestKey: null
        });

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
        console.error("Failed to fetch display locations:", err);
        setAreas([ALL_AREA]);
      }
    }
    fetchLocations();
  }, []);

  // 🚨 TRIGGER: Updates the 'displays' collection directly
  // ✅ TRIGGER
const trigger = async () => {
  if (!message.trim()) return alert("Enter a message");

  try {
    let targets = [];
    if (targetArea === "all") {
      targets = await pb.collection("displays").getFullList({ requestKey: null });
    } else {
      targets = await pb.collection("displays").getFullList({
        filter: `location = "${targetArea}"`,
        requestKey: null,
      });
    }

    if (!targets.length) return alert("No displays found.");

    await Promise.all(
      targets.map((display) =>
        pb.collection("displays").update(
          display.id,
          {
            current_type: "alert",
            current_title: message.trim(),
            current_command: type, // ✅ THIS is the alert type (fire/flood/etc)
          },
          { requestKey: null }
        )
      )
    );

    alert(`🚨 ${type.toUpperCase()} alert sent!`);
    setMessage("");
  } catch (err) {
    console.error(err);
    alert("Failed to send alert.");
  }
};

// ✅ CLEAR
const clear = async () => {
  try {
    let targets = [];
    if (targetArea === "all") {
      targets = await pb.collection("displays").getFullList({ requestKey: null });
    } else {
      targets = await pb.collection("displays").getFullList({
        filter: `location = "${targetArea}"`,
        requestKey: null,
      });
    }

    await Promise.all(
      targets.map((display) =>
        pb.collection("displays").update(
          display.id,
          {
            current_type: "idle",
            current_title: null,
            current_command: null, // ✅ MUST be null on clear
          },
          { requestKey: null }
        )
      )
    );

    alert("❌ Emergency cleared");
  } catch (err) {
    console.error(err);
    alert("Failed to clear alert.");
  }
};

  
  return (
    <div style={{ padding: '1rem'}}>
      <h2>Emergency Alert</h2>

      <label>Target Area</label>
      <select value={targetArea} onChange={e => setTargetArea(e.target.value)}>
        {areas.map(area => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </select>

      <label>Type</label>
      <select value={type} onChange={e => setType(e.target.value)}>
        <option value="fire">🔥 Fire</option>
        <option value="flood">🌊 Flood</option>
        <option value="quake">🌍 Quake</option>
        <option value="medical">🚑 Medical</option>
        <option value="intruder">🚨 Intruder</option>
      </select>

      <label>Message</label>
      <input
        type="text"
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Enter alert text"
      />

      <div style={{ marginTop: '0.5rem' }}>
        <button onClick={trigger} className="btn btn-danger">🚨 Trigger</button>
        <button onClick={clear} className="btn btn-secondary" style={{ marginLeft: '0.5rem' }}>
          ❌ Clear
        </button>
      </div>
    </div>
  );
}

