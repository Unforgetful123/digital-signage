// src/services/pocketbase.js
import PocketBase from 'pocketbase';

const url = localStorage.getItem('server_url') || "https://chan-tip-patricia-ellis.trycloudflare.com";
const pb = new PocketBase(url);

export default pb;