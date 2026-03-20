// src/services/pocketbase.js
import PocketBase from 'pocketbase';

const serverIp = window.location.hostname; 
const pb = new PocketBase('https://postilioned-ema-nebulously.ngrok-free.dev');

export default pb;