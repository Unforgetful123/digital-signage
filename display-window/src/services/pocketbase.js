import PocketBase from 'pocketbase';
import {automaticBackend} from '../../../shared/backend-url.mjs';
const url = localStorage.getItem('server_url') || automaticBackend(window.location);
export default new PocketBase(url);
