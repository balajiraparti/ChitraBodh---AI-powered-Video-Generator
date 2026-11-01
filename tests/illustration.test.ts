import test from 'node:test';
import assert from 'node:assert/strict';
import {validateIllustration,objectPose,type Illustration} from '../src/illustration';
const sample=():Illustration=>({background:'paper',objects:[
 {id:'tree',kind:'tree',x:200,y:400,width:140,height:200,label:'Tree',color:'green'},
 {id:'atom',kind:'atom',x:650,y:150,width:100,height:100,label:'Carbon',color:'blue'},
 {id:'transfer',kind:'arrow',x:600,y:200,width:40,height:40,label:'Transfer',color:'teal',toId:'tree'}
],actions:[{targetId:'transfer',action:'flow',phrase:'moves into plants',occurrence:1,duration:3,repeat:true}]});
test('illustration rejects invalid geometry, references and decorative-only animation',()=>{
 validateIllustration(sample());
 const outside=sample();outside.objects[0].x=30;assert.throws(()=>validateIllustration(outside),/outside/);
 const dangling=sample();dangling.objects[2].toId='missing';assert.throws(()=>validateIllustration(dangling),/destination/);
 const wrong=sample();wrong.actions[0].targetId='tree';assert.throws(()=>validateIllustration(wrong),/Flow/);
 const still=sample();still.actions[0].action='pulse';assert.throws(()=>validateIllustration(still),/meaningful/);
 const move=sample();move.actions[0]={...move.actions[0],targetId:'tree',action:'move',toX:30,toY:400};assert.throws(()=>validateIllustration(move),/leaves/);
});
test('AI movement starts at its speech cue and reaches the requested destination',()=>{
 const object=sample().objects[1];
 const actions=[{targetId:'atom',action:'move' as const,phrase:'moves',occurrence:1,duration:3,repeat:false,toX:200,toY:300,at:5}];
 assert.equal(objectPose(object,actions,4).x,650);
 assert.ok(objectPose(object,actions,6).x<650);
 assert.equal(objectPose(object,actions,8).x,200);
 assert.equal(objectPose(object,actions,8).y,300);
});
