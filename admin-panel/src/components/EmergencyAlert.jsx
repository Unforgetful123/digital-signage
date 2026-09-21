import React from 'react';

export default function EmergencyAlert() {
  return (
    <div style={{ width: '100%', height: 'calc(100vh - 80px)', overflow: 'hidden', borderRadius: '12px' }}>
      <iframe 
        src="/emergency-alert.html" 
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Emergency Operations"
      />
    </div>
  );
}