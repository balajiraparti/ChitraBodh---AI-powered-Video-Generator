import {narratorChoices} from './narrators.mjs';
import {preferences} from './preferences.mjs';
import {readDraft} from './drafts.mjs';

export async function createPage({projects,jobs,versions,preferences:collection}, owner, query) {
  if(query.draft!==undefined && typeof query.draft!=='string')return {notFound:true};
  const activeJob=await jobs.findOne({ownerId:owner,active:true},{projection:{_id:1}});
  const activeJobId=activeJob ? String(activeJob._id) : null;
  if(activeJob && query.draft===undefined && query.fromJob===undefined)return {redirect:{destination:'/jobs/'+activeJob._id,permanent:false}};
  if(query.fromJob!==undefined){
    if(typeof query.fromJob!=='string')return {notFound:true};
    const source=await jobs.findOne({_id:query.fromJob,ownerId:owner,state:'succeeded'});
    const version=source && await versions.findOne({_id:source.versionId,ownerId:owner});
    if(!version)return {notFound:true};
    const seed={sourceJobId:source._id,topic:version.topic,voiceCatalogId:version.settingsSnapshot.voiceCatalogId,captions:version.settingsSnapshot.captions};
    return {props:{initial:null,seed,activeJobId,voices:narratorChoices()}};
  }
  const initial=query.new==='1' && query.draft===undefined ? null : await readDraft(projects,owner,query.draft);
  if(query.draft!==undefined && !initial)return {notFound:true};
  return {props:{initial,seed:initial?null:await preferences(collection,owner),activeJobId,voices:narratorChoices()}};
}
