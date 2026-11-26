import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import mongoose from 'mongoose';
import sharp from 'sharp';
import {Category,Product,Bundle} from '../src/models.js';
import {configuredR2,digest,isPublicMediaUrl,r2Config} from '../src/storage.js';

const [mode='--dry-run',manifestFile,...extra]=process.argv.slice(2);
const allowed=['--dry-run','--upload','--migrate','--rollback'];
if(!allowed.includes(mode)||extra.length||(['--migrate','--rollback'].includes(mode)!==Boolean(manifestFile))){
  console.error('Use --dry-run, --upload, --migrate MANIFEST.json, or --rollback MANIFEST.json.');
  process.exit(1);
}
const publicRoot=new URL('../../web/public/',import.meta.url);
const seed=JSON.parse(await readFile(new URL('../../../data/catalog.seed.json',import.meta.url),'utf8'));
const sources=new Set(seed.products.flatMap(product=>product.images.map(image=>image.url)));
for(const category of seed.categories){
  if(category.image)sources.add(category.image);
  if(category.published)sources.add('/categories/'+category.slug+'.webp');
}
const objects=new Map();
async function loadObjects(){
  for(const source of sources){
    if(!isPublicMediaUrl(source)||!/^\/(catalog|categories)\//.test(source))throw new Error('Invalid asset path');
    const bytes=await readFile(new URL('.'+source,publicRoot));
    const metadata=await sharp(bytes).metadata();
    if(metadata.format!=='webp'||!metadata.width||!metadata.height)throw new Error('Invalid WebP: '+source);
    const hash=digest(bytes);
    const key=source.slice(1,-5)+'-'+hash+'.webp';
    objects.set(source,{bytes,hash,key});
  }
}
const matches=(head,object)=>head?.Metadata?.sha256===object.hash&&head.ContentLength===object.bytes.length;
async function verifyPublic(url,hash){
  const response=await fetch(url,{signal:AbortSignal.timeout(15_000),redirect:'error'});
  if(!response.ok||digest(Buffer.from(await response.arrayBuffer()))!==hash)throw new Error('Public asset verification failed: '+url);
}

async function upload(storage){
  let uploaded=0;
  for(const asset of objects.values()){
    const head=await storage.head('public',asset.key);
    if(head&&!matches(head,asset))throw new Error('Unexpected bytes at immutable key: '+asset.key);
    if(head)continue;
    await storage.put('public',asset.key,asset.bytes);
    if(!matches(await storage.head('public',asset.key),asset))throw new Error('Upload verification failed: '+asset.key);
    await verifyPublic(storage.publicUrl(asset.key),asset.hash);
    uploaded++;
  }
  console.log({verified:objects.size,uploaded});
}

const models={products:Product,categories:Category,bundles:Bundle};
async function buildChanges(storage){
  const verified=new Set();
  const changes=[];
  const mediaUrl=async source=>{
    const object=objects.get(source);
    if(!object)return source;
    const url=storage.publicUrl(object.key);
    if(!verified.has(url)){
      await verifyPublic(url,object.hash);
      verified.add(url);
    }
    return url;
  };
  for(const [collection,model] of Object.entries(models)){
    const field=collection==='categories'?'image':'images';
    for await(const row of model.find().select(field+' slug published').lean().cursor()){
      const before=row[field]??null;
      const approved='/categories/'+row.slug+'.webp';
      const after=collection==='categories'?await mediaUrl(row.published&&objects.has(approved)?approved:before):
        await Promise.all((before||[]).map(async image=>({...image,url:await mediaUrl(image.url)})));
      if(JSON.stringify(before)!==JSON.stringify(after))changes.push({collection,id:String(row._id),field,before,after});
    }
  }
  return changes;
}

async function apply(changes,rollback){
  await mongoose.connection.transaction(async session=>{
    for(const {collection,id,field,before,after} of changes){
      const model=models[collection];
      if(!model||field!==(collection==='categories'?'image':'images')||!mongoose.isObjectIdOrHexString(id))throw new Error('Invalid manifest');
      const prior=rollback?after:before;
      const next=rollback?before:after;
      const stored=await model.findById(id).select(field).session(session).lean();
      if(stored&&JSON.stringify(stored[field]??null)===JSON.stringify(next))continue;
      if(!stored||JSON.stringify(stored[field]??null)!==JSON.stringify(prior))throw new Error('Media changed since manifest creation: '+collection+'/'+id);
      await model.updateOne({_id:id},next===null?{$unset:{[field]:1}}:{$set:{[field]:next}},{session,timestamps:false});
    }
  });
}
try{
  if(mode!=='--rollback')await loadObjects();
  if(mode==='--dry-run')console.log({validated:objects.size,totalBytes:[...objects.values()].reduce((sum,asset)=>sum+asset.bytes.length,0)});
  if(mode==='--upload')await upload(configuredR2());
  if(mode==='--migrate'||mode==='--rollback'){
    const uri=process.env.MEDIA_MIGRATION_MONGODB_URI;
    if(!uri?.startsWith('mongodb://'))throw new Error('Set the explicit target MEDIA_MIGRATION_MONGODB_URI');
    await mongoose.connect(uri,{autoIndex:false,autoCreate:false,serverSelectionTimeoutMS:5000});
    const database=mongoose.connection.name;
    const {hosts,replicaSet}=mongoose.connection.getClient().options;
    const target=digest(JSON.stringify([database,replicaSet,hosts.map(String).sort()]));
    if(mode==='--migrate'){
      const changes=await buildChanges(configuredR2());
      await writeFile(manifestFile,JSON.stringify({version:1,database,target,publicBase:r2Config().publicBase,changes},null,2),{flag:'wx'});
      await apply(changes,false);
      console.log({migrated:changes.length});
    }else{
      const saved=JSON.parse(await readFile(manifestFile,'utf8'));
      if(saved.version!==1||saved.target!==target)throw new Error('Manifest target mismatch');
      await apply(saved.changes,true);
      console.log({restored:saved.changes.length});
    }
  }
}catch(error){
  console.error('Catalog media operation failed:',error.name,error.code||'');
  process.exitCode=1;
}finally{await mongoose.disconnect();}
