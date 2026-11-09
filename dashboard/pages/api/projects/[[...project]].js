import {currentOwner,services} from '../../../server/auth.mjs';
import {projectPage,LibraryQueryError} from '../../../server/library.mjs';
import {readDraft,saveDraft} from '../../../server/drafts.mjs';

export default async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store');
  try {
    const owner=await currentOwner(req);
    if(!owner)return res.status(401).end();
    const store=await services(); const {projects,origin}=store;
    const parts=req.query.project || [];
    if(parts.length>1)return res.status(404).end();
    const [id]=parts;
    if(req.method==='GET' && !id)return res.json(await projectPage(store,owner,req.query));
    if(req.method==='GET' && id){
      const data=await readDraft(projects,owner,id);
      return data?res.json(data):res.status(404).end();
    }
    if(req.method!==(id?'PATCH':'POST'))return res.status(405).end();
    if(req.headers.origin!==origin)return res.status(403).end();
    const result=await saveDraft(projects,owner,id,req.body,req.headers['idempotency-key']);
    if(!result.data)return res.status(result.status).end();
    if(result.status===201)res.setHeader('Location','/api/projects/'+result.data.id);
    return res.status(result.status).json(result.data);
  }catch(error){if(error instanceof LibraryQueryError)return res.status(400).json({code:error.message});return res.status(503).end();}
}
