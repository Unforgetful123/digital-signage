import React from 'react';

export default function EmergencyAlert() {
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#ffffff' }}>
      <iframe 
        src="/emergency-alert.html" 
        style={{ width: '100%', height: '100%', minHeight: '600px', border: 'none', display: 'block' }}
        title="Emergency Operations"
      />
    </div>
  );
}