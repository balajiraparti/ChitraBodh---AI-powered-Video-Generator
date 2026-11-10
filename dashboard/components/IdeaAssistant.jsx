import React,{useRef,useState} from 'react';

export default function IdeaAssistant({draftId,topic,disabled,onChoose}){
  const [open,setOpen]=useState(false),[message,setMessage]=useState('');
  const [result,setResult]=useState(null),[notice,setNotice]=useState(''),[pending,setPending]=useState(false);
  const conversation=useRef(null),intent=useRef(null),inFlight=useRef(false);
  async function ask(){
    if(disabled||inFlight.current)return;
    const prompt=message.trim()||topic.trim()||'Suggest three visual topics for a beginner-friendly educational explainer.';
    if([...prompt].length>1000){setNotice('Describe your focus in 1,000 characters or fewer.');return;}
    conversation.current??=crypto.randomUUID();
    const body=JSON.stringify({...(draftId?{draftId}:{conversationId:conversation.current}),message:prompt});
    if(intent.current?.body!==body)intent.current={body,key:crypto.randomUUID()};
    inFlight.current=true;setPending(true);setNotice('');
    try{
      const response=await fetch('/api/v1/ideas/brainstorm',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':intent.current.key},body});
      const data=await response.json().catch(()=>null);
      if(!response.ok){
        if(response.status!==409 && response.status!==429)intent.current=null;
        setNotice(response.status===401?'Sign in again to ask for ideas.':response.status===403?'Ask your team administrator to approve brainstorming for your account.':response.status===429?(data?.error?.code==='GLOBAL_BUDGET_REACHED'?'The team’s daily brainstorming budget has been reached.':'Try again in a minute.'):response.status===409?'Another idea request is in progress. Try again shortly.':({IDEAS_PROVIDER_LIMIT:'The AI provider reached its quota. Try again later.',IDEAS_PROVIDER_CONFIG:'The AI provider rejected its configuration. Ask your administrator to check model access.',IDEAS_INVALID_REPLY:'The AI returned an incomplete set of ideas. Request a fresh set.'}[data?.error?.code] || 'The idea assistant is temporarily unavailable. Try again shortly.'));
        return;
      }
      setResult(data);intent.current=null;setMessage('');
    }catch{setNotice('Could not confirm the response. Try again to recover your suggestions.');}
    finally{inFlight.current=false;setPending(false);}
  }
  return <div className="idea-assistant">
    <button type="button" className="idea-toggle" aria-expanded={open} aria-controls="idea-panel" onClick={()=>setOpen(!open)}>Brainstorm with AI</button>
    <div id="idea-panel" hidden={!open}>
      <label htmlFor="idea-focus">What interests you?</label>
      <textarea id="idea-focus" rows={2} value={message} disabled={disabled||pending} placeholder="Try a subject, ask a follow-up, or leave this blank for ideas." onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();ask();}}}/>
      <button type="button" disabled={disabled||pending} onClick={ask}>{pending?'Finding ideas…':result?'Get more ideas':'Suggest ideas'}</button>
      <div aria-live="polite">{notice || (pending?'Thinking…':'')}</div>
      {result && <><p>{result.reply}</p><ul>{result.suggestions.map(idea=><li key={idea}><strong>{idea.split('\n')[0]}</strong>{idea.includes('\n') && <p>{idea.slice(idea.indexOf('\n')+1)}</p>}<button type="button" disabled={disabled||pending} onClick={()=>{onChoose(idea);setOpen(false);document.getElementById('topic')?.focus();}}>Use this idea</button></li>)}</ul></>}
    </div>
  </div>;
}
