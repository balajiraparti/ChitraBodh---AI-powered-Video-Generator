import NarratorCards from '../components/NarratorCards';
import {useState} from 'react';
import {currentOwner,services} from '../server/auth.mjs';
import {preferences} from '../server/preferences.mjs';
import {narratorChoices} from '../server/narrators.mjs';
export async function getServerSideProps({req,res}){
  res.setHeader('Cache-Control','private, no-store');
  const owner=await currentOwner(req);
  if(!owner)return {redirect:{destination:'/sign-in',permanent:false}};
  const initial=await preferences((await services()).preferences,owner);
  return {props:{initial,voices:narratorChoices(),zones:[...new Set([initial.timezone,'Asia/Kolkata','UTC',...Intl.supportedValuesOf('timeZone')])].sort()}};
}
export default function Settings({initial,voices,zones}){
  const [values,setValues]=useState(initial),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  function change(key,value){setValues({...values,[key]:value});setMessage('');}
  async function save(event){
    event.preventDefault();setBusy(true);setMessage('');
    try{
      const {voiceCatalogId,captions,timezone,revision}=values;
      const response=await fetch('/api/v1/me/preferences',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({voiceCatalogId,captions,timezone,expectedRevision:revision})});
      if(response.ok){setValues(await response.json());setMessage('Preferences saved.');}
      else setMessage(response.status===409?'Settings changed in another tab. Reload before saving.':response.status===401?'Sign in again to save.':'Check your settings and try again.');
    }catch{setMessage('Could not confirm the save. Reload to check your preferences.');}
    finally{setBusy(false);}
  }
  return <><h1>Preferences</h1><p>Choose defaults for new videos.</p><div className="prefs-grid"><section><form className="draft-form" onSubmit={save}>
    <h2>1. Default narrator voice</h2><NarratorCards voices={voices} value={values.voiceCatalogId} disabled={busy} onChange={v=>change('voiceCatalogId',v)}/>
    <h2>2. Burned-in captions default</h2>
    <label><input type="checkbox" checked={values.captions} disabled={busy} onChange={e=>change('captions',e.target.checked)}/> Include synchronized captions</label>
    <h2>3. Timezone &amp; retention display</h2><label htmlFor="zone">Workspace time zone</label><select id="zone" value={values.timezone} disabled={busy} onChange={e=>change('timezone',e.target.value)}>{zones.map(zone=><option key={zone}>{zone}</option>)}</select>
    <button className="action" disabled={busy}>{busy?'Saving…':'Save preferences'}</button><span role="status">{message}</span>
  </form></section><aside className="studio-note"><h2>Account</h2><form method="post" action="/api/auth/sign-out"><button type="submit">Sign out</button></form></aside></div></>;
}
