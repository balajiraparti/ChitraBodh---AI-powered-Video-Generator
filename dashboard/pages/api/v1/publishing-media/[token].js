import {database} from '../../../../server/database.mjs';
import {artifactStorage} from '../../../../server/filebase.mjs';
import {servePublishingMedia} from '../../../../server/publishing-media.mjs';
export const config={api:{responseLimit:false}};
// Capability URL for Meta only. Reverse proxies must redact the whole path.
export default async function handler(req,res){
  try{await servePublishingMedia(req,res,await database(),artifactStorage,req.query.token);}
  catch{res.setHeader('Cache-Control','private, no-store');res.status(503).end();}
}
