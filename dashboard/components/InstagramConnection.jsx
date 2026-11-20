import {useEffect,useState} from 'react';
const outcomes={connected:'Instagram connected.',cancelled:'Connection cancelled. Your previous connection is unchanged.',failed:'Could not connect Instagram. Try a fresh connection.',invalid:'This connection link expired or was already used. Please try again.',different_account:'Reconnect the same account, or disconnect it first to choose another account.',superseded:'Your connection changed in another tab. Check the current account below.'};
export default function InstagramConnection(){
  const [data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(false);
  async function load(){const r=await fetch('/api/v1/instagram/connection');if(!r.ok)throw Error();setData(await r.json());}
  useEffect(()=>{load().catch(()=>setError('Could not load Instagram. Reload to try again.'));const outcome=new URLSearchParams(window.location.search).get('instagram');if(outcome)setError(outcomes[outcome]??'');},[]);
  async function act(disconnect=false){
    setBusy(true);setError('');
    try{
      const r=await fetch(`/api/v1/instagram/${disconnect?'connection':'connect'}`,{method:disconnect?'DELETE':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(disconnect?{expectedRevision:data.connection.revision}:{returnPath:'/settings'})});
      if(!r.ok){setError(r.status===409?'Connection changed in another tab. Reload before trying again.':r.status===429?'Please wait a minute before trying again.':'Could not update Instagram. Please try again.');return;}
      const result=await r.json();
      if(!disconnect)window.location.assign(result.authorizationUrl);
      else{setConfirm(false);await load();setError('Instagram disconnected. Existing Instagram posts are unchanged.');}
    }catch{setError('Could not confirm the change. Reload to check the connection.');}
    finally{setBusy(false);}
  }
  const connection=data?.connection;
  return <section className="instagram-card" aria-labelledby="instagram-title"><span className="eyebrow">CONNECTED ACCOUNTS</span><h2 id="instagram-title">Your Instagram, connected.</h2><p>Bring your explainers to your audience. Connect a Business or Creator account.</p>
    {!data?<p>Loading connection…</p>:<>
      <div className="instagram-identity"><span className="material-symbols-outlined" aria-hidden="true">photo_camera</span><div><strong>{connection?`@${connection.username}`:'Instagram'}</strong><p>{connection?(connection.status==='connected'?'Connected':'Connection expired — reconnect to continue'):'Not connected yet'}</p></div></div>
      {!data.configured&&<p role="status">Instagram setup is not complete. Your administrator needs to configure the app credentials and callback URL.</p>}
      <div className="instagram-actions"><button className="action" disabled={busy||!data.configured} onClick={()=>act()}>{busy?'Please wait…':connection?'Reconnect Instagram':'Connect Instagram'}</button>{connection&&<button disabled={busy} onClick={()=>setConfirm(true)}>Disconnect</button>}</div>
      {confirm&&<div className="instagram-confirm"><p>Disconnect @{connection.username}? Existing Instagram posts stay published. Connecting another account will not retarget existing posts or resume scheduled work.</p><button disabled={busy} onClick={()=>act(true)}>Confirm disconnect</button> <button disabled={busy} onClick={()=>setConfirm(false)}>Keep connected</button></div>}
    </>}
    <p role="status">{error}</p><small>Connecting does not publish a video. Publishing and scheduling will be added in the next features.</small>
  </section>;
}
