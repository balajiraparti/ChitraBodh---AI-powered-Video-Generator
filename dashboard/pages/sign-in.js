import {useState} from 'react';
import {useRouter} from 'next/router';
export default function SignIn(){
  const [state,setState]=useState('idle');
  const {query}=useRouter();
  async function submit(event){
    event.preventDefault();
    const email=new FormData(event.currentTarget).get('email');
    setState('sending');
    try{
      const response=await fetch('/api/auth/email-links',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
      setState(response.ok?'sent':'error');
    }catch{setState('error')}
  }
  return <><h1>Sign in to Chitrabodh</h1><section className="signin">
    {query.error && <p role="alert">This link has expired or has already been used. Request a new one.</p>}
    {state==='sent'?<><p role="status">If this email has access, you’ll receive a sign-in link. It expires in ten minutes.</p><button onClick={()=>setState('idle')}>Change email or request another link</button></>:
    <form onSubmit={submit}><p>Invited creators sign in by email.</p><label htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" autoComplete="email" required/>
      {state==='error' && <p role="alert">Sign-in is temporarily unavailable. Please try again.</p>}
      <button className="action" disabled={state==='sending'}>{state==='sending'?'Requesting link…':'Send sign-in link'}</button>
    </form>}</section></>;
}
