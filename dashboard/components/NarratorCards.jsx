import React from 'react';
export default function NarratorCards({voices,value,onChange,disabled}){
  return <fieldset className="narrator-cards"><legend>Narrator voice</legend><div>{voices.map(voice=>
    <label key={voice.id} data-selected={value===voice.id}>
      <input type="radio" name="narrator" value={voice.id} checked={value===voice.id} disabled={disabled||!voice.available} onChange={()=>onChange(voice.id)}/>
      <strong>{voice.name}</strong><small>{voice.available?'Available':'Unavailable'}</small>
    </label>)}</div></fieldset>;
}
