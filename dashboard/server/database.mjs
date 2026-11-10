import {MongoClient} from 'mongodb';

let pending;
export function database(){
  return pending ??= connect().catch(error=>{pending=undefined;throw error});
}
async function connect(){
  if(!process.env.MONGODB_URI)throw Error('MONGODB_URI is required');
  const client=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:5000});
  const db=client.db();
  const store={client};
  for(const name of ['jobs','versions','projects','artifacts','workerSlots','preferences'])store[name]=db.collection(name);
  for(const name of ['ideaCommands','ideaLocks','ideaPayloads'])store[name]=db.collection(name);
  try{
    await Promise.all([
      ...['ideaCommands','ideaLocks','ideaPayloads'].map(name=>store[name].createIndex({expiresAt:1},{expireAfterSeconds:0})),
      store.jobs.createIndex({ownerId:1,key:1},{unique:true}),
      store.jobs.createIndex({ownerId:1},{unique:true,partialFilterExpression:{active:true}}),
      store.jobs.createIndex({state:1,createdAt:1,_id:1}),
      store.projects.createIndex({ownerId:1,createdAt:-1,_id:-1}),
      store.jobs.createIndex({projectId:1,ownerId:1,createdAt:-1,_id:-1}),
      store.projects.createIndex({ownerId:1,status:1,updatedAt:-1,_id:-1}),
      store.artifacts.createIndex({expiresAt:1,state:1}),
      db.collection('auth_limits').createIndex({expiresAt:1},{expireAfterSeconds:0}),
      ...[['user','email'],['verification','identifier'],['session','token']].map(([name,key])=>db.collection(name).createIndex({[key]:1},{unique:true}))
    ]);
    return {...store,db};
  }catch(error){await client.close();throw error;}
}
