import React, { useState, useEffect } from "react";
import pb from "./services/pocketbase";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AlertScheduler from "./components/AlertScheduler";
import { Toaster, toast } from 'react-hot-toast';

export default function App() {
  const [user, setUser] = useState(pb.authStore.model);

  // 1. Authentication Listener
  useEffect(() => {
    pb.authStore.onChange(() => {
      setUser(pb.authStore.model);
    });
  }, []);

  // 2. Over-The-Air (OTA) Update Listener — must run unconditionally (hooks order)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.require) {
      try {
        const { ipcRenderer } = window.require('electron');

        const onUpdateAvailable = () => {
          toast('A new version is downloading in the background...', {
            icon: '⬇️',
            duration: 4000,
          });
        };

        const onUpdateDownloaded = () => {
          toast.custom((t) => (
            <div style={{
              background: '#ffffff',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxWidth: '350px',
              border: '1px solid #e2e8f0',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              animation: t.visible ? 'enter 0.2s ease-out' : 'leave 0.2s ease-in forwards'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>🚀</span>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: '600' }}>Update Ready</h3>
              </div>
              
              <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: '1.5' }}>
                A new version of Ad Player Pro is ready. Restart now to apply the latest features.
              </p>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  onClick={() => {
                    ipcRenderer.send('restart_app');
                    toast.dismiss(t.id);
                  }}
                  style={{ flex: 1, padding: '10px 16px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Restart Now
                </button>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  style={{ flex: 1, padding: '10px 16px', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Later
                </button>
              </div>
            </div>
          ), { duration: Infinity, position: 'bottom-right' }); // Moved to bottom-right so it doesn't block the top menu
        };

        ipcRenderer.on('update_available', onUpdateAvailable);
        ipcRenderer.on('update_downloaded', onUpdateDownloaded);

        return () => {
          ipcRenderer.removeAllListeners('update_available');
          ipcRenderer.removeAllListeners('update_downloaded');
        };
      } catch (err) {
        console.warn("Not running in Electron environment. Skipping OTA updates.");
      }
    }
  }, []);

  if (!user) {
    return (
      <>
        <Toaster position="top-center" />
        <Login onLogin={setUser} />
      </>
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
