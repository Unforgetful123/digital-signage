// src/services/pocketbase.js
import PocketBase from 'pocketbase';

const url = localStorage.getItem('server_url') || "https://concept-flow-okay-meals.trycloudflare.com";
const pb = new PocketBase(url);

export default pb;