import React, { useEffect, useRef } from "react";
import pb from "../services/pocketbase";
import ContentUpload from "../components/ContentUpload";
import BirthdayUpload from "../components/BirthdayUpload";
import EmergencyAlert from "../components/EmergencyAlert";
import "./Dashboard.css";

export default function Dashboard({ user }) {
  const timerRef = useRef(null);

  // 🔐 Auto-logout after 10 minutes of inactivity
  useEffect(() => {
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        pb.authStore.clear();
        window.location.reload();
      }, 10 * 60 * 1000); // 10 minutes
    };

    // events that reset the timer
    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((evt) => window.addEventListener(evt, resetTimer));

    resetTimer(); // initialize timer

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleLogout = () => {
    pb.authStore.clear();
    window.location.reload();
  };

  return (
    <div className="dashboard-wrapper">
      {/* ===== Top Header ===== */}
      <header className="dashboard-header">
        <h1 className="dashboard-title">VRL Smart Digital Signage</h1>
        <div className="admin-info">
          <span className="admin-email">👤 {user?.email}</span>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* ===== Main Grid ===== */}
      <div className="dashboard-grid">
        <div className="card">
          <ContentUpload />
        </div>
        <div className="card">
          <BirthdayUpload />
        </div>
        <div className="card emergency-card">
          <EmergencyAlert />
        </div>
      </div>
    </div>
  );
}
