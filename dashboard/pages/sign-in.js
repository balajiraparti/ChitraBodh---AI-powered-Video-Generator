import {useState} from 'react';
import {useRouter} from 'next/router';
export default function SignIn(){
  const [state,setState]=useState('idle');
  const [mode,setMode]=useState('sign-in');
  const router=useRouter();
  async function submit(event){
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const email=form.get('email'), password=form.get('password');
    setState('sending');
    try{
      const response=await fetch('/api/auth/'+(mode==='sign-up'?'sign-up':'sign-in'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      if(response.ok)return router.push('/dashboard');
      setState('error');
    }catch{setState('error')}
  }
  return <div className="auth-layout"><section className="signin"><h1>{mode==='sign-up'?'Create your Chitrabodh account':'Sign in to Chitrabodh'}</h1>
    <form onSubmit={submit}><p>{mode==='sign-up'?'Create an account to start making explainers.':'Use your email and password to continue.'}</p><label htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" autoComplete="email" required/>
      <label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={mode==='sign-up'?'new-password':'current-password'} minLength="12" maxLength="128" required/>
      {state==='error' && <p role="alert">We could not {mode==='sign-up'?'create that account':'sign you in'}. Check your details and try again.</p>}
      <button className="action" disabled={state==='sending'}>{state==='sending'?'Please wait…':mode==='sign-up'?'Create account':'Sign in'}</button>
    </form><p>{mode==='sign-up'?'Already have an account? ':'New to Chitrabodh? '}<button type="button" onClick={()=>{setMode(mode==='sign-up'?'sign-in':'sign-up');setState('idle')}}>{mode==='sign-up'?'Sign in':'Create an account'}</button></p></section></div>;
}
