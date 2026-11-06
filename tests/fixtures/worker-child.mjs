process.on('message',message=>{
  if(message.type==='cancel'){process.disconnect();process.exitCode=1;return;}
  if(message.type==='start'){
    process.send({type:'stage',stage:'Rendering video'});
    if(!message.options.hang){
      process.send({type:'result',manifest:{id:'test-result'}});
      process.disconnect();
    }
  }
});
