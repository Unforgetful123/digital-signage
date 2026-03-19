// src/services/pocketbase.js
import PocketBase from 'pocketbase';

const serverIp = window.location.hostname; 
const pb = new PocketBase(`http://${serverIp}:8090`);

export default pb;