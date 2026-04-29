import PocketBase from 'pocketbase';

const url = localStorage.getItem('server_url') || "";
const pb = new PocketBase(url);

export default pb;