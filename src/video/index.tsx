import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {Explainer} from './Explainer';
import {demoPlan,fixtureAlignment} from '../fixtures';
import {buildTimeline} from '../timing';
const defaults={plan:demoPlan,timeline:buildTimeline(demoPlan,fixtureAlignment(),75),captions:true,demo:true};
registerRoot(()=> <Composition id="Explainer" component={Explainer} width={1080} height={1920} fps={30} durationInFrames={2250} defaultProps={defaults} calculateMetadata={({props})=>({durationInFrames:Math.ceil(props.timeline.duration*30)})}/>);
