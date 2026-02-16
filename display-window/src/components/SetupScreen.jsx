import React, { useState } from "react";
import pb from "../services/pocketbase";
import { setDisplayConfig } from "./Player";
import "./SetupScreen.css";

export default function SetupScreen({ onComplete }) {
  const [ip, setIp] = useState(localStorage.getItem('server_url') || "http://192.168.1.X:8090");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const saveServer = () => {
    if (!ip.startsWith("http")) return alert("Include http://");
    localStorage.setItem('server_url', ip);
    window.location.reload(); 
  };

  async function handleRegister() {
    if (!name || !location) return alert("Please fill in all fields.");
    setLoading(true);
    try {
      const code = `VRL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const record = await pb.collection("displays").create({
        name, location, code,
        device_info: navigator.userAgent,
        last_seen: new Date().toISOString(),
      });
      const config = { id: record.id, code, name, location };
      setDisplayConfig(config);
      onComplete(config);
    } catch (err) {
      alert("Connection failed. Check Admin PC IP.");
    } finally { setLoading(false); }
  }

  return (
    <div className="setup-container">
      <div className="setup-card">
        <div className="setup-header">
          <div className="setup-logo">VRL</div>
          <h2>Signage Setup</h2>
          <p>Configure network and display identity</p>
        </div>

        <div className="setup-form">
          {/* --- SECTION 1: NETWORK --- */}
          <div className="input-group">
            <label>1. Admin Server IP</label>
            <div className="input-row">
              <input 
                type="text" 
                value={ip} 
                onChange={(e) => setIp(e.target.value)} 
                placeholder="http://192.168.1.50:8090"
              />
              <button onClick={saveServer} className="small-btn">Connect</button>
            </div>
            <span className="status-text">
              Current: {localStorage.getItem('server_url') || "localhost"}
            </span>
          </div>

          <div className="divider" />

          {/* --- SECTION 2: IDENTITY --- */}
          <div className="input-group">
            <label>2. Display Name</label>
            <input 
              placeholder="e.g. Lobby TV" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>

          <div className="input-group">
            <label>3. Location</label>
            <input 
              placeholder="e.g. Floor 1" 
              value={location} 
              onChange={e => setLocation(e.target.value)} 
            />
          </div>

          <button 
            className="register-btn" 
            onClick={handleRegister} 
            disabled={loading}
          >
            {loading ? "Registering..." : "Activate Display"}
          </button>
        </div>
        
        <div className="setup-footer">
          Host: {window.location.hostname}
        </div>
      </div>
    </div>
  );
}