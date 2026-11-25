import {database} from '../../server/database.mjs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'&&req.method!=='HEAD')return res.status(405).end();
 try{const store=await database();await store.db.command({ping:1},{maxTimeMS:3000});return res.status(200).json({status:'ok'});}
 catch{return res.status(503).json({status:'unavailable'});}
}
