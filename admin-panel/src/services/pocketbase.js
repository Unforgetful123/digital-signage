// src/services/pocketbase.js
import PocketBase from 'pocketbase';

const url = localStorage.getItem('server_url') || "http://127.0.0.1:8090";
const pb = new PocketBase(url);

export default pb;