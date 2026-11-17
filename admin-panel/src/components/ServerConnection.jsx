import React, {useState} from 'react';
import PocketBase from 'pocketbase';
import pb, {BACKEND_KEY} from '../services/pocketbase';
import {automaticBackend, validateBackend} from '../../../shared/backend-url.mjs';
export default function ServerConnection() {
  const [value,setValue] = useState(localStorage.getItem(BACKEND_KEY) || pb.baseURL);
  const [busy,setBusy] = useState(false), [error,setError] = useState('');
  async function connect(automatic) {
    setBusy(true); setError('');
    try {
      const url = automatic ? automaticBackend(window.location) : validateBackend(value);
      await new PocketBase(url).health.check({requestKey:null, signal:AbortSignal.timeout(8000)});
      pb.authStore.clear();
      if (automatic && window.location.protocol !== 'file:') localStorage.removeItem(BACKEND_KEY);
      else localStorage.setItem(BACKEND_KEY,url);
      window.location.reload();
    } catch(e) {setError(e.message || 'Server unavailable. Check the address and connection.');}
    finally {setBusy(false);}
  }
  return <section className="server-connection" style={{maxWidth:620,background:'white',padding:24,borderRadius:12}}>
    <h2>Server connection</h2><p>Current server: <strong>{pb.baseURL}</strong></p>
    <p>Browser access automatically follows the server address used to open this website, on port 8090. A saved override takes priority. No .env.local IP is needed.</p>
    <form onSubmit={e=>{e.preventDefault();connect(false);}}>
      <label htmlFor="backend-address">PocketBase address (IP or hostname)</label>
      <input style={{width:'100%',margin:'10px 0'}} id="backend-address" type="url" required value={value} onChange={e=>setValue(e.target.value)} placeholder="http://signage-server:8090" disabled={busy}/>
      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}><button disabled={busy}>Test & save</button><button type="button" disabled={busy} onClick={()=>connect(true)}>Use automatic address</button></div>
    </form>
    <p>Changing the connection signs you out. In Electron, automatic means PocketBase on this PC; use an override for a remote server.</p>
    {error && <p role="alert" style={{color:'#b42335'}}>{error}</p>}
  </section>;
}
