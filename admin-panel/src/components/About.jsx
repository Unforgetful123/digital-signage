import React, { useState, useEffect } from 'react';

export default function About() {
  const [version, setVersion] = useState('Loading...');
  const [status, setStatus] = useState('idle'); 
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.require) {
      const { ipcRenderer } = window.require('electron');

      // Fetch the current version from main.js
      ipcRenderer.invoke('get_app_version').then(v => setVersion(v));

      // Listeners for the update process
      const onChecking = () => setStatus('checking');
      const onAvailable = () => setStatus('available');
      const onNotAvailable = () => setStatus('up-to-date');
      const onProgress = (e, pct) => {
        setStatus('downloading');
        setProgress(Math.round(pct));
      };
      const onDownloaded = () => setStatus('downloaded');
      const onError = () => setStatus('error');

      ipcRenderer.on('checking_for_update', onChecking);
      ipcRenderer.on('update_available', onAvailable);
      ipcRenderer.on('update_not_available', onNotAvailable);
      ipcRenderer.on('download_progress', onProgress);
      ipcRenderer.on('update_downloaded', onDownloaded);
      ipcRenderer.on('update_error', onError);

      return () => {
        ipcRenderer.removeAllListeners('checking_for_update');
        ipcRenderer.removeAllListeners('update_available');
        ipcRenderer.removeAllListeners('update_not_available');
        ipcRenderer.removeAllListeners('download_progress');
        ipcRenderer.removeAllListeners('update_downloaded');
        ipcRenderer.removeAllListeners('update_error');
      };
    } else {
      setVersion('Browser Mode');
    }
  }, []);

  const handleCheckUpdate = () => {
    if (window.require) {
      window.require('electron').ipcRenderer.send('manual_check_update');
    } else {
      alert("Updates can only be checked from the installed desktop application.");
    }
  };

  const handleRestart = () => {
    if (window.require) {
      window.require('electron').ipcRenderer.send('restart_app');
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#ffffff', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
        <h2 style={{ margin: '0 0 5px 0', color: '#0f172a', fontSize: '24px' }}>Ad Player Pro</h2>
        <p style={{ margin: '0 0 20px 0', color: '#64748b' }}>Developed by VRL Signage</p>
        
        <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '600', color: '#334155' }}>Current Version:</span>
          <span style={{ background: '#e2e8f0', padding: '4px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', color: '#475569' }}>v{version}</span>
        </div>

        {/* Update Status UI */}
        <div style={{ marginBottom: '20px', minHeight: '60px' }}>
          {status === 'idle' && <p style={{ color: '#475569' }}>Ready to check for updates.</p>}
          {status === 'checking' && <p style={{ color: '#0284c7' }}>Checking servers for updates...</p>}
          {status === 'up-to-date' && <p style={{ color: '#16a34a', fontWeight: 'bold' }}>✅ Your app is up to date!</p>}
          {status === 'error' && <p style={{ color: '#dc2626' }}>❌ Error checking for updates. Please try again later.</p>}
          
          {(status === 'available' || status === 'downloading') && (
            <div>
              <p style={{ color: '#2563eb', margin: '0 0 10px 0' }}>⬇️ Downloading update... {progress}%</p>
              <div style={{ width: '100%', background: '#e2e8f0', borderRadius: '10px', height: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, background: '#2563eb', height: '100%', transition: 'width 0.2s ease-out' }}></div>
              </div>
            </div>
          )}

          {status === 'downloaded' && (
            <div style={{ padding: '15px', background: '#dcfce3', border: '1px solid #86efac', borderRadius: '8px', color: '#166534' }}>
              <strong>🎉 Update Ready!</strong> Restart the application to apply the latest features.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '15px' }}>
          {status !== 'downloaded' ? (
            <button 
              onClick={handleCheckUpdate} 
              disabled={status === 'checking' || status === 'downloading'}
              style={{ padding: '12px 24px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: (status === 'checking' || status === 'downloading') ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: (status === 'checking' || status === 'downloading') ? 0.7 : 1 }}
            >
              🔄 Check for Updates
            </button>
          ) : (
            <button 
              onClick={handleRestart}
              style={{ padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', width: '100%' }}
            >
              Restart Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}