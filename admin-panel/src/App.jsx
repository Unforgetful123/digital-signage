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
     🎯 NEW: TABLET SELECTION SCREEN
  ========================================= */
  if (!appMode) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#0f172a', padding: '40px', boxSizing: 'border-box', fontFamily: 'system-ui' }}>
        <h1 style={{ color: '#ffffff', textAlign: 'center', marginBottom: '40px', fontSize: '2.5rem' }}>VRL Digital Signage</h1>
        <div style={{ display: 'flex', gap: '30px', flex: 1 }}>
          <button 
            onClick={() => setAppMode('admin')} 
            style={{ flex: 1, backgroundColor: '#1e293b', color: 'white', borderRadius: '24px', border: '2px solid #334155', fontSize: '2rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', transition: 'background 0.2s' }}
          >
            <span style={{ fontSize: '5rem' }}>🔐</span>
            Admin Panel
          </button>
          
          <button 
            onClick={() => setAppMode('emergency')} 
            style={{ flex: 1, backgroundColor: '#dc2626', color: 'white', borderRadius: '24px', border: 'none', fontSize: '2rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', boxShadow: '0 10px 25px rgba(220, 38, 38, 0.4)' }}
          >
            <span style={{ fontSize: '5rem' }}>🚨</span>
            Emergency Alert
          </button>
        </div>
      </div>
    );
  }

  /* =========================================
     🚨 NEW: EMERGENCY BYPASS ROUTE
  ========================================= */
  if (appMode === 'emergency') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
        <div style={{ padding: '20px', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>
          <button onClick={() => setAppMode(null)} style={{ padding: '12px 24px', fontSize: '1.2rem', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}>
            ⬅️ Back to Menu
          </button>
          <h2 style={{ margin: '0 0 0 20px', color: '#dc2626' }}>Emergency Operations</h2>
        </div>
        
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
          <EmergencyAlert />
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
        <button onClick={() => setAppMode(null)} style={{ position: 'absolute', top: '20px', left: '20px', padding: '10px 20px', fontSize: '1rem', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', zIndex: 10 }}>
          ⬅️ Back
        </button>
        <Login onLogin={setUser} />
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />
      <Dashboard user={user} />
      <AlertScheduler />
    </>
  );
}