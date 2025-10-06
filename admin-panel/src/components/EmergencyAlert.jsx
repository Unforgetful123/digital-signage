import React, { useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_HOST =
  import.meta?.env?.VITE_SOCKET_HOST || window.location.hostname;
const socket = io(`http://${SOCKET_HOST}:4000`);

export default function EmergencyAlert() {
  const [type, setType] = useState('fire');
  const [message, setMessage] = useState('');

  const trigger = () => {
    if (!message.trim()) return alert('Enter a message');
    socket.emit('triggerEmergency', { type, message });
    alert(`🚨 ${type.toUpperCase()} alert sent!`);
    setMessage('');
  };

  const clear = () => {
    socket.emit('clearEmergency');
    alert('❌ Emergency cleared');
  };

  return (
    <div style={{ padding: '1rem'}}>
      <h2>Emergency Alert</h2>

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
