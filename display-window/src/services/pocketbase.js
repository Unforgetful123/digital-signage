// src/services/pocketbase.js
import PocketBase from 'pocketbase';

const url = localStorage.getItem('server_url') || "https://postilioned-ema-nebulously.ngrok-free.dev";
const pb = new PocketBase(url);

export default pb;