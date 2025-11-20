// src/components/SetupScreen.jsx
import React, { useState } from "react";
import pb from "../services/pocketbase";
import { setDisplayConfig } from "./Player";

export default function SetupScreen({ onComplete }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  async function handleRegister() {
    if (!name || !location) return alert("Fill all fields.");

    try {
      const hostname = window.location.hostname;
      const code = `${hostname}-${Math.random().toString(36).slice(2, 8)}`;
      const record = await pb.collection("displays").create({
        name,
        location,
        code,
        device_info: navigator.userAgent,
        last_seen: new Date().toISOString(),
      });

      const config = {
        id: record.id,
        code,
        name,
        location,
      };
      setDisplayConfig(config);
      onComplete(config);
    } catch (err) {
      console.error("Registration failed:", err);
      alert("Could not register display.");
    }
  }

  return (
    <div style={{ padding: "40px", color: "white", background: "#111", height: "100vh" }}>
      <h2>Register Display</h2>
      <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} /><br /><br />
      <input placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} /><br /><br />
      <button onClick={handleRegister}>Register</button>
    </div>
  );
}
