// src/services/pocketbase.js
import PocketBase from 'pocketbase';

const serverIp = window.location.hostname; 
const pb = new PocketBase('https://chan-tip-patricia-ellis.trycloudflare.com');

export default pb;