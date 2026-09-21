import React, { useState, useEffect } from "react";
import pb from "./services/pocketbase";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AlertScheduler from "./components/AlertScheduler";
import EmergencyAlert from "./components/EmergencyAlert"; // 🎯 NEW: Imported directly
import { Toaster, toast } from 'react-hot-toast';

export default function App() {
  const [user, setUser] = useState(pb.authStore.model);
  const [appMode, setAppMode] = useState(null); // null (select screen) | 'admin' | 'emergency'

  // 1. Authentication Listener
  useEffect(() => {
    pb.authStore.onChange(() => {
      setUser(pb.authStore.model);
    });
  }, []);

  // 2. Over-The-Air (OTA) Update Listener
  useEffect(() => {
    if (typeof window !== 'undefined' && window.require) {
      try {
        const { ipcRenderer } = window.require('electron');

        const onUpdateAvailable = () => {
          toast('A new version is downloading in the background...', { icon: '⬇️', duration: 4000 });
        };

        const onUpdateDownloaded = () => {
          toast.custom((t) => (
            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '350px', border: '1px solid #e2e8f0', fontFamily: 'system-ui' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>🚀</span>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>Update Ready</h3>
              </div>
              <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>A new version is ready. Restart now to apply.</p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button onClick={() => { ipcRenderer.send('restart_app'); toast.dismiss(t.id); }} style={{ flex: 1, padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Restart Now</button>
                <button onClick={() => toast.dismiss(t.id)} style={{ flex: 1, padding: '10px', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}>Later</button>
              </div>
            </div>
          ), { duration: Infinity, position: 'bottom-right' });
        };

        ipcRenderer.on('update_available', onUpdateAvailable);
        ipcRenderer.on('update_downloaded', onUpdateDownloaded);

        return () => {
          ipcRenderer.removeAllListeners('update_available');
          ipcRenderer.removeAllListeners('update_downloaded');
        };
      } catch (err) {
        console.warn("Not running in Electron environment.");
      }
    }
  }, []);

  /* =========================================
     🎯 TABLET SELECTION SCREEN (THEMED)
  ========================================= */
  if (!appMode) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#172533', padding: '40px', boxSizing: 'border-box', fontFamily: 'system-ui', position: 'relative' }}>
        
        {/* BRANDING HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '50px' }}>
          {/* Logo reads from public/logo.png */}
          <img src="/logo.png" alt="VRL" style={{ height: '60px', objectFit: 'contain' }} onError={(e) => e.target.style.display='none'} />
          <h1 style={{ color: '#ffffff', margin: 0, fontSize: '2.5rem' }}>VRL Smart Digital Signage</h1>
        </div>

        <div style={{ display: 'flex', gap: '30px', flex: 1, paddingBottom: '60px' }}>
          {/* TEAL ADMIN BUTTON */}
          <button 
            onClick={() => setAppMode('admin')} 
            style={{ flex: 1, backgroundColor: '#00a887', color: 'white', borderRadius: '24px', border: 'none', fontSize: '2rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', boxShadow: '0 10px 25px rgba(0, 168, 135, 0.3)' }}
          >
            <span style={{ fontSize: '5rem' }}>🔐</span>
            Admin Panel
          </button>
          
          {/* DANGER EMERGENCY BUTTON */}
          <button 
            onClick={() => setAppMode('emergency')} 
            style={{ flex: 1, backgroundColor: '#dc2626', color: 'white', borderRadius: '24px', border: 'none', fontSize: '2rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', boxShadow: '0 10px 25px rgba(220, 38, 38, 0.4)' }}
          >
            <span style={{ fontSize: '5rem' }}>🚨</span>
            Emergency Alert
          </button>
        </div>

        {/* COPYRIGHT FOOTER */}
        <div style={{ position: 'absolute', bottom: '20px', width: '100%', left: 0, textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', fontWeight: '500' }}>
          &copy; {new Date().getFullYear()} VRL Smart Digital Signage. All rights reserved.
        </div>
      </div>
    );
  }

  /* =========================================
     🚨 EMERGENCY BYPASS ROUTE
  ========================================= */
  if (appMode === 'emergency') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
        
        {/* 🎯 SYMMETRICAL NAVY/TEAL HEADER */}
        <div style={{ height: '72px', backgroundColor: '#172533', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px', borderBottom: '4px solid #00a887', zIndex: 10, position: 'relative' }}>
          
          {/* ABSOLUTE LEFT: Back Button */}
          <button 
            onClick={() => setAppMode(null)} 
            style={{ 
              position: 'absolute', left: '24px',
              padding: '8px 16px', fontSize: '0.95rem', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to Menu
          </button>
          
          {/* CENTER: Logo & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img src="/logo.png" alt="VRL Logo" style={{ height: '36px', objectFit: 'contain' }} onError={(e) => e.target.style.display='none'} />
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#ffffff', fontWeight: '800', letterSpacing: '0.5px' }}>Emergency Operations</h1>
          </div>

          {/* ABSOLUTE RIGHT: Settings Button */}
          <button 
            onClick={() => {
              // Reaches into the iframe and clicks the hidden settings button
              const iframe = document.getElementById('emergency-iframe');
              if (iframe && iframe.contentWindow) {
                const btn = iframe.contentWindow.document.getElementById('settingsBtn');
                if (btn) btn.click();
              }
            }}
            style={{ 
              position: 'absolute', right: '24px',
              padding: '8px 16px', fontSize: '0.95rem', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Settings
          </button>
        </div>
        
        {/* Iframe for the wizard */}
        <div style={{ flex: 1, width: '100%', overflow: 'hidden' }}>
          <iframe 
            id="emergency-iframe"
            src="/emergency-alert.html" 
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            title="Emergency Operations"
          />
        </div>
      </div>
    );
  }

  /* =========================================
     🔐 STANDARD ADMIN ROUTE
  ========================================= */
  if (!user) {
    return (
      <div style={{ position: 'relative', height: '100vh', backgroundColor: '#f1f5f9' }}>
        <Toaster position="top-center" />
        
        {/* 🎯 PREMIUM FLOATING BACK BUTTON */}
        <button 
          onClick={() => setAppMode(null)} 
          style={{ 
            position: 'absolute',
            top: '24px',
            left: '24px',
            padding: '10px 20px', 
            fontSize: '0.95rem', 
            backgroundColor: '#ffffff', 
            border: '1px solid #e2e8f0', 
            borderRadius: '999px', /* Modern pill shape */
            cursor: 'pointer', 
            fontWeight: '600', 
            color: '#172533', /* VRL Navy */
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease',
            zIndex: 10
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#f8fafc';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Menu
        </button>
        
        <Login onLogin={setUser} />
      </div>
    );
  }

  // 🎯 NEW: Unified Logout Function
  const handleLogout = () => {
    pb.authStore.clear();
    setUser(null);
    setAppMode('admin'); 
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
      <Toaster position="top-center" />
      
      {/* 🎯 HIGH-CONTRAST HEADER */}
      <header style={{ 
        backgroundColor: '#ffffff', 
        padding: '0 24px', 
        height: '72px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        borderBottom: '4px solid #00a887', 
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        flexShrink: 0 
      }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
           <img src="/logo.png" alt="VRL" style={{ height: '36px', objectFit: 'contain' }} onError={(e) => e.target.style.display='none'} />
           {/* Navy Text for maximum readability against white */}
           <h1 style={{ color: '#172533', margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>VRL Smart Signage Dashboard</h1>
         </div>
         
         <button onClick={handleLogout} style={{ 
           padding: '8px 20px', 
           borderRadius: '8px', 
           backgroundColor: '#fef2f2', 
           border: '1px solid #f87171', 
           color: '#dc2626', 
           cursor: 'pointer', 
           fontWeight: 'bold',
           transition: 'all 0.2s'
         }}>
           Logout
         </button>
      </header>

      {/* Main Admin Content */}
      <div style={{ flex: 1, height: 'calc(100vh - 76px)' }}>
        <Dashboard user={user} />
        <AlertScheduler />
      </div>
    </div>
  );
}