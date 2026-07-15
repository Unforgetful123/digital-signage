import React, { useState, useEffect } from "react";
import pb from "./services/pocketbase";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { Toaster, toast } from 'react-hot-toast'; // ✅ Added Toaster import

export default function App() {
  const [user, setUser] = useState(pb.authStore.model);

  // 1. Authentication Listener
  useEffect(() => {
    pb.authStore.onChange(() => {
      setUser(pb.authStore.model);
    });
  }, []);

  // 2. Over-The-Air (OTA) Update Listener
  useEffect(() => {
    // ✅ SAFETY CHECK: Only run this if we are inside the Windows .exe!
    // If you open this on a phone or Chrome, it safely skips it.
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
          toast((t) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span><b>Update Ready!</b> Restart now to apply changes?</span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => {
                    ipcRenderer.send('restart_app'); 
                    toast.dismiss(t.id);
                  }}
                  style={{ padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Restart & Update
                </button>
                <button 
                  onClick={() => toast.dismiss(t.id)}
                  style={{ padding: '6px 12px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Later
                </button>
              </div>
            </div>
          ), { duration: Infinity }); 
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

  // 3. Routing
  if (!user) {
    return <Login onLogin={setUser} />;
  }

  useEffect(() => {
    // Check if we are running inside Electron (bypasses browser errors)
    if (window.require) {
      const { ipcRenderer } = window.require('electron');

      // 1. Listen for the "Update Found" signal
      ipcRenderer.on('update_available', () => {
        toast('A new update is available. Downloading in the background...', {
          icon: '☁️',
          duration: 4000,
        });
      });

      // 2. Listen for the "Download Complete" signal
      ipcRenderer.on('update_downloaded', () => {
        toast.success(
          (t) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <strong>Update Ready!</strong>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Restart the app to apply the latest features.</p>
              <button 
                onClick={() => ipcRenderer.send('restart_app')}
                style={{ padding: '8px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Restart Now
              </button>
            </div>
          ),
          { duration: Infinity } // Keeps the toast open until they click it
        );
      });

      // Cleanup listeners
      return () => {
        ipcRenderer.removeAllListeners('update_available');
        ipcRenderer.removeAllListeners('update_downloaded');
      };
    }
  }, []);

  return (
    <>
      {/* ✅ The Toaster must sit at the top level so notifications work everywhere */}
      <Toaster position="top-center" />
      <Dashboard user={user} />
    </>
  );
}