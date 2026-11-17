import PocketBase from 'pocketbase';
import { resolveBackend } from '../../../shared/backend-url.mjs';
export const BACKEND_KEY = 'signage_backend_url';
let url;
try {
  url = resolveBackend(window.location, localStorage.getItem(BACKEND_KEY), import.meta.env.VITE_POCKETBASE_URL);
} catch {
  // Keep the connection screen reachable if a saved or legacy address is invalid.
  url = resolveBackend(window.location, null);
}
window.signageBackendUrl = url;
export default new PocketBase(url);
