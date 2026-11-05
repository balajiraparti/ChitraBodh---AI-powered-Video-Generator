export const defaultVoice = 'adam';

export function narratorChoices() {
  return [
    {id:defaultVoice, name:'Adam', available:true},
    {id:'monika-sogam', name:'Monika Sogam', available:process.env.MONIKA_VOICE_ENABLED === 'true'}
  ];
}
