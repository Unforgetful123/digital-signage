// src/services/pocketbase.js
import PocketBase from 'pocketbase';

const url = localStorage.getItem('server_url') || "https://url-explains-model-forestry.trycloudflare.com";
const pb = new PocketBase(url);

export default pb;