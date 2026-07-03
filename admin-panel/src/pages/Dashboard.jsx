// admin-panel/src/components/Dashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import pb from "../services/pocketbase";
import ContentUpload from "../components/ContentUpload";
import BirthdayUpload from "../components/BirthdayUpload";
import EmergencyAlert from "../components/EmergencyAlert";
import DisplayMonitor from "../components/DisplayMonitor";
import PlaylistManager from "../components/PlaylistManager";
import "./Dashboard.css"; // (Assuming your CSS file moved to tl

export default function Dashboard({ user }) {
  const [activeTab, setActiveTab] = useState("home");
  
  // 🎯 NEW: Sub-tab state for the Home screen
  const [homeAction, setHomeAction] = useState("content"); 
  
  const timerRef = useRef(null);

  useEffect(() => {
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        pb.authStore.clear();
        window.location.reload();
      }, 10 * 60 * 1000); 
    };

    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((evt) => window.addEventListener(evt, resetTimer));
    resetTimer(); 

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleLogout = () => {
    pb.authStore.clear();
    window.location.reload();
  };

  // 🎯 NEW: Unified Action Center for the Home Tab
  const renderHomeActions = () => (
    <div className="action-center">
      {/* Mini-Navigation for Forms */}
      <div className="action-tabs">
        <button 
          className={`action-btn ${homeAction === 'content' ? 'active-action' : ''}`}
          onClick={() => setHomeAction('content')}
        >
          📁 Upload Media
        </button>
        <button 
          className={`action-btn ${homeAction === 'birthday' ? 'active-action' : ''}`}
          onClick={() => setHomeAction('birthday')}
        >
          🎂 Add Birthday
        </button>
        <button 
          className={`action-btn ${homeAction === 'alert' ? 'active-action' : ''}`}
          onClick={() => setHomeAction('alert')}
        >
          🚨 Trigger Alert
        </button>
      </div>

      {/* Dynamic Form Container */}
      <div className="action-form-container">
        {homeAction === 'content' && <ContentUpload />}
        {homeAction === 'birthday' && <BirthdayUpload />}
        {homeAction === 'alert' && <EmergencyAlert />}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "playlist":
        return <PlaylistManager />;
      case "monitor":
        return <DisplayMonitor />;
      case "home":
      default:
        return renderHomeActions(); // Uses our new compact layout
    }
  };

  return (
    <div className="admin-layout">
      {/* ===== Left Sidebar ===== */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-title">VRL Signage</h2>
        </div>
        
        <nav className="sidebar-nav">
          <button className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
            🏠 Home (Uploads)
          </button>
          <button className={`nav-btn ${activeTab === 'playlist' ? 'active' : ''}`} onClick={() => setActiveTab('playlist')}>
            📋 Live Playlist
          </button>
          <button className={`nav-btn ${activeTab === 'monitor' ? 'active' : ''}`} onClick={() => setActiveTab('monitor')}>
            📺 Display Monitor
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="admin-email">👤 {user?.email}</div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      {/* ===== Right Main Content Area ===== */}
      <main className="main-content">
        <header className="content-header">
          <h1>
            {activeTab === 'home' && "Content & Alert Management"}
            {activeTab === 'playlist' && "Live Playlist Manager"}
            {activeTab === 'monitor' && "Display Monitor"}
          </h1>
        </header>
        
        <div className="content-area">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}