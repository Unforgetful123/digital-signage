import PocketBase from 'pocketbase';

// ✅ Use 127.0.0.1 (not localhost, not 0.0.0.0, not LAN IP)
const pb = new PocketBase("http://127.0.0.1:8090");

// optional: log connectivity
pb.collection('your_collection_name').getList(1, 1).then(() => {
  console.log('✅ Connected to PocketBase');
}).catch(err => {
  console.warn('⚠️ PocketBase unreachable —', err.message);
});

export default pb;
