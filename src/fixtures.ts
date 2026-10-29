import {validatePlan,scriptFor,type Alignment} from './contracts';

// Authored fixture: never presented as AI output or a factual benchmark result.
export const demoPlan=validatePlan({
  title:'The water cycle',learningObjective:'Understand how water moves between the surface and the atmosphere.',
  scenes:[
    {id:'intro',layout:'icon_text',heading:'One planet. Water on the move.',narration:'The water in a river, a cloud, and a raindrop is part of the same journey. Water keeps moving between the surface of the Earth and the atmosphere. This journey is called the water cycle.',nodes:[{id:'world',iconId:'globe',label:'The water cycle'}],edges:[],cues:[{phrase:'water cycle',occurrence:1,targetId:'world'}]},
    {id:'evaporation',layout:'process_diagram',heading:'Warm water becomes vapor',narration:'Energy from the sun warms water in oceans, lakes, and rivers. Some liquid water becomes an invisible gas called water vapor. This change is evaporation. The vapor mixes into the air above the surface.',nodes:[{id:'sun',iconId:'sun',label:'Energy from the sun'},{id:'water',iconId:'water',label:'Liquid water'},{id:'vapor',iconId:'vapor',label:'Water vapor'}],edges:[{from:'sun',to:'water'},{from:'water',to:'vapor'}],cues:[{phrase:'sun',occurrence:1,targetId:'sun'},{phrase:'liquid water',occurrence:1,targetId:'water'},{phrase:'water vapor',occurrence:1,targetId:'vapor'}]},
    {id:'condensation',layout:'comparison',heading:'An invisible gas. Tiny droplets.',narration:'When moist air cools enough, water vapor changes into tiny liquid droplets. This is condensation. Clouds contain these tiny droplets, ice crystals, or both. The visible cloud is not the invisible water vapor itself.',nodes:[{id:'gas',iconId:'vapor',label:'Invisible vapor'},{id:'cloud',iconId:'cloud',label:'Cloud droplets'}],edges:[],cues:[{phrase:'water vapor',occurrence:1,targetId:'gas'},{phrase:'tiny liquid droplets',occurrence:1,targetId:'cloud'}]},
    {id:'rainfall',layout:'process_diagram',heading:'Water returns to the surface',narration:'As droplets or ice particles grow, they can fall from clouds as precipitation, such as rain or snow. Water may collect in rivers and oceans, soak into the ground, or be taken up by plants.',nodes:[{id:'cloud',iconId:'cloud',label:'Clouds'},{id:'rain',iconId:'rain',label:'Precipitation'},{id:'water',iconId:'water',label:'Surface and ground'}],edges:[{from:'cloud',to:'rain'},{from:'rain',to:'water'}],cues:[{phrase:'clouds',occurrence:1,targetId:'cloud'},{phrase:'precipitation',occurrence:1,targetId:'rain'},{phrase:'ground',occurrence:1,targetId:'water'}]},
    {id:'takeaway',layout:'icon_text',heading:'The journey keeps going',narration:'The sun supplies energy, and gravity brings water back down. Evaporation, condensation, and precipitation keep water moving. There is no single starting point. The cycle continues all around us.',nodes:[{id:'cycle',iconId:'globe',label:'A continuous cycle'}],edges:[],cues:[{phrase:'cycle continues',occurrence:1,targetId:'cycle'}]}
  ]
});
const demoPhases=['overview','evaporation','condensation','precipitation','overview'] as const;
demoPlan.scenes.forEach((scene,i)=>{scene.motion={kind:'water_cycle',phase:demoPhases[i],triggerPhrase:scene.cues[0].phrase,occurrence:scene.cues[0].occurrence};});
export function fixtureAlignment(duration=75):Alignment {
  const characters=Array.from(scriptFor(demoPlan));
  return {characters,character_start_times_seconds:characters.map((_,i)=>i/characters.length*duration),character_end_times_seconds:characters.map((_,i)=>(i+1)/characters.length*duration)};
}
