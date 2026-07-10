import PocketBase from 'pocketbase';

// 1. Try to get the URL from localStorage (Great for physical TVs on the network)
let url = localStorage.getItem('server_url');

// 2. The Auto-Fallback Strategy (For Local Testing & Electron)
if (!url) {
  // If running inside the Electron app (file://) or local Vite dev (port 5173)
  if (window.location.protocol === 'file:' || window.location.port === '5173') {
    url = "http://127.0.0.1:8090"; // Assume the database is running on this exact PC
  } else {
    // If you opened this in Chrome via an IP address (e.g., http://192.168.1.35:8090)
    // It automatically uses that exact IP!
    url = window.location.origin; 
  }
}

const pb = new PocketBase(url);

export default pb;