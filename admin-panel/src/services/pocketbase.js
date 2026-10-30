import PocketBase from 'pocketbase';
const fallback = `http://${window.location.hostname || '127.0.0.1'}:8090`;
const url = import.meta.env.VITE_POCKETBASE_URL || fallback;
// Same-origin emergency iframe reads the same backend configuration.
window.signageBackendUrl = url;
export default new PocketBase(url);
