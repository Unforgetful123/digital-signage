// src/services/pocketbase.js
import PocketBase from 'pocketbase';

const serverIp = window.location.hostname; 
const pb = new PocketBase('https://url-explains-model-forestry.trycloudflare.com');

export default pb;