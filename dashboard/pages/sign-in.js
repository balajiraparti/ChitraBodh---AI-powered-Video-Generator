import {useState} from 'react';
import {useRouter} from 'next/router';
export function getServerSideProps({req,query}){
  const origin=new URL(process.env.BETTER_AUTH_URL);
  if(['localhost','127.0.0.1'].includes(origin.hostname) && req.headers.host!==origin.host){
    return {redirect:{destination:origin.origin+'/sign-in'+(query.mode==='sign-up'?'?mode=sign-up':''),permanent:false}};
  }
  return {props:{initialMode:query.mode==='sign-up'?'sign-up':'sign-in'}};
}
export default function SignIn({initialMode='sign-in'}){
  const [state,setState]=useState('idle');
  const [mode,setMode]=useState(initialMode);
  const [error,setError]=useState('');
  const router=useRouter();
  async function submit(event){
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const email=form.get('email'), password=form.get('password');
    setState('sending');
    try{
      const response=await fetch('/api/auth/'+(mode==='sign-up'?'sign-up':'sign-in'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      if(response.ok)return router.push('/dashboard');
      const messages={
        400:'Enter a valid email and a password between 12 and 128 characters.',
        403:'Your sign-in page is on a different address from the server. Reopen the dashboard sign-in link.',
        429:'Too many attempts. Please wait before trying again.',
        503:'The sign-in service is temporarily unavailable. Try again shortly.'
      };
      setError(messages[response.status] || (mode==='sign-up'?'Account creation failed. If you already registered, choose Sign in.':'The email or password did not match. If this is a new account, choose Create an account.'));
      setState('error');
    }catch{setError('Could not reach the dashboard. Check the connection and try again.');setState('error')}
  }
  return <div className="auth-layout"><section className="signin"><h1>{mode==='sign-up'?'Create your Chitrabodh account':'Sign in to Chitrabodh'}</h1>
    <form onSubmit={submit}><p>{mode==='sign-up'?'Create an account to start making explainers.':'Use your email and password to continue.'}</p><label htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" autoComplete="email" required/>
      <label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={mode==='sign-up'?'new-password':'current-password'} minLength="12" maxLength="128" required/>
      {state==='error' && <p role="alert">{error}</p>}
      <button className="action" disabled={state==='sending'}>{state==='sending'?'Please wait…':mode==='sign-up'?'Create account':'Sign in'}</button>
    </form><p>{mode==='sign-up'?'Already have an account? ':'New to Chitrabodh? '}<button type="button" disabled={state==='sending'} onClick={()=>{setMode(mode==='sign-up'?'sign-in':'sign-up');setState('idle')}}>{mode==='sign-up'?'Sign in':'Create an account'}</button></p></section></div>;
}
