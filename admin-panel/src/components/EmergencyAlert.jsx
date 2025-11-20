import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import pb from '../services/pocketbase';

const SOCKET_HOST =
  import.meta?.env?.VITE_SOCKET_HOST || window.location.hostname;
const socket = io(`http://${SOCKET_HOST}:4000`);

// Define ALL as a constant
const ALL_AREA = { id: 'all', name: '📢 All Areas' };

export default function EmergencyAlert() {
  const [type, setType] = useState('fire');
  const [message, setMessage] = useState('');
  const [targetArea, setTargetArea] = useState(ALL_AREA.id);
  const [areas, setAreas] = useState([ALL_AREA]); // 3. State for dynamic areas

    // 4. Effect to fetch unique locations from PocketBase
  useEffect(() => {
      async function fetchLocations() {
          try {
              // Fetch all displays
              const displays = await pb.collection("displays").getFullList({
                  fields: 'location', // Only fetch the location field
              });

              // Extract unique, non-empty locations
              const uniqueLocations = new Set();
              displays.forEach(d => {
                  const loc = (d.location || '').trim().toLowerCase();
                  if (loc) {
                      uniqueLocations.add(loc);
                  }
              });

              // Convert set to array of area objects
              const fetchedAreas = Array.from(uniqueLocations).map(loc => ({
                  id: loc,
                  // Capitalize first letter for display
                  name: loc.charAt(0).toUpperCase() + loc.slice(1) 
              }));

              // Combine 'All Areas' with fetched locations
              setAreas([ALL_AREA, ...fetchedAreas.sort((a, b) => a.name.localeCompare(b.name))]);

          } catch (err) {
              console.error("Failed to fetch display locations:", err);
              // Keep default 'All Areas' if fetch fails
              setAreas([ALL_AREA]);
          }
      }
      fetchLocations();
  }, []); // Run only on mount

  const trigger = () => {
      if (!message.trim()) return alert('Enter a message');

      // Pass the target area
      socket.emit('triggerEmergency', { 
          type, 
          message, 
          area: targetArea 
      });

      alert(`🚨 ${type.toUpperCase()} alert sent to area: ${targetArea}!`);
      setMessage('');
  };

  const clear = () => {
      // Pass the target area
      socket.emit('clearEmergency', { area: targetArea });
      alert(`❌ Emergency cleared for area: ${targetArea}`);
  };

  return (
      <div style={{ padding: '1rem'}}>
        <h2>Emergency Alert</h2>

        {/* Target Area Dropdown uses dynamic state */}
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
