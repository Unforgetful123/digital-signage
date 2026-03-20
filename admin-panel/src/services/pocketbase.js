// src/services/pocketbase.js
import PocketBase from 'pocketbase';

const serverIp = window.location.hostname; 
const pb = new PocketBase('https://concept-flow-okay-meals.trycloudflare.com');

export default pb;