import {createHash, randomBytes} from 'node:crypto';
import {pipeline} from 'node:stream/promises';
import {getStorage,r2Config,storageDriver} from './storage.js';
import express from 'express';
import {rateLimit} from 'express-rate-limit';
import sharp from 'sharp';
import {PrivateAsset,Order} from './models.js';
import {findProduct,slug} from './catalog.js';

const guestCookie='gallermo_guest';
const root=()=>process.env.NODE_ENV==='test'&&process.env.GALLERMO_TEST_PRIVATE_ROOT || fileURLToPath(new URL('../.private/',import.meta.url));
const maxBytes=10*1024*1024;
const lifetime=24*60*60*1000;
const assetId=/^[a-f0-9]{48}$/;
export const privateStorageAvailable=()=>storageDriver()==='r2'?!!r2Config():
  storageDriver()==='local'&&process.env.NODE_ENV!=='production'&&process.env.LOCAL_PRIVATE_UPLOADS==='true';
const storageKey=asset=>asset.purpose+'/'+asset._id+'.webp';
export function commerceError(status,code,message){
  return Object.assign(new Error(message),{status,code});
}
export function commerceOwner(req,res,{create=false}={}){
  if(req.user?.role==='admin')throw commerceError(403,'FORBIDDEN','Administrators cannot place customer orders');
  if(req.user?.role==='customer')return 'customer:'+req.user.id;
  let token=req.cookies[guestCookie];
  if(!/^[a-zA-Z0-9_-]{43}$/.test(token||'')){
    if(!create)return null;
    token=randomBytes(32).toString('base64url');
    res.cookie(guestCookie,token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:7*lifetime});
  }
  return 'guest:'+createHash('sha256').update(token).digest('hex');
}

export async function normalizeImage(bytes){
  if(!Buffer.isBuffer(bytes)||bytes.length<12||bytes.length>maxBytes)
    throw commerceError(400,'INVALID_IMAGE','Choose a JPEG, PNG or WebP image up to 10 MB');
  const signature=bytes.subarray(0,8).toString('hex');
  const expected=signature.startsWith('ffd8ff')?'jpeg':signature==='89504e470d0a1a0a'?'png':
    bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'?'webp':null;
  const complete=expected==='jpeg'?bytes.readUInt16BE(bytes.length-2)===0xffd9:
    expected==='png'?bytes.subarray(-12).toString('hex')==='0000000049454e44ae426082':
    expected==='webp'&&bytes.readUInt32LE(4)+8===bytes.length;
  if(!expected||!complete)throw commerceError(400,'INVALID_IMAGE','Choose a JPEG, PNG or WebP image');
  try{
    const image=sharp(bytes,{failOn:'warning',limitInputPixels:25000000});
    const meta=await image.metadata();
    if(meta.format!==expected||meta.width>8000||meta.height>8000||meta.pages>1)throw new Error('Unsupported image');
    const {data,info}=await image.rotate().webp({quality:91}).toBuffer({resolveWithObject:true});
    if(data.length>maxBytes)throw new Error('Output too large');
    return {data,width:info.width,height:info.height};
  }catch{
    throw commerceError(400,'INVALID_IMAGE','The image could not be decoded or exceeds the size limit');
  }
}
const wrapped=handler=>(req,res,next)=>Promise.resolve(handler(req,res)).catch(next);
function uploadAvailable(_req,_res,next){
  next(privateStorageAvailable()?undefined:commerceError(503,'STORAGE_UNAVAILABLE','Private uploads are temporarily unavailable'));
}
export const privateFiles=express.Router();
privateFiles.post('/:purpose',uploadAvailable,rateLimit({windowMs:15*60*1000,limit:12,standardHeaders:'draft-7',legacyHeaders:false}),
  express.raw({type:['image/jpeg','image/png','image/webp','application/octet-stream'],limit:maxBytes}),wrapped(async(req,res)=>{
    const {purpose}=req.params;
    if(!['artwork','payment'].includes(purpose))throw commerceError(404,'NOT_FOUND','Upload type not found');
    const owner=commerceOwner(req,res,{create:true});
    let productSlug,variantSku;
    if(purpose==='artwork'){
      productSlug=req.query.slug;
      variantSku=req.query.sku;
      if(!slug.safeParse(productSlug).success||typeof variantSku!=='string'||variantSku.length>90)
        throw commerceError(400,'INVALID_VARIANT','Select an available variant');
      const product=await findProduct(productSlug);
      if(!product?.category.customizationEnabled||!product.variants.some(variant=>variant.sku===variantSku&&variant.stock!==0))
        throw commerceError(409,'CUSTOMIZATION_UNAVAILABLE','Customization is unavailable for this option');
    }
    const {data,width,height}=await normalizeImage(req.body);
    const id=randomBytes(24).toString('hex');
    const driver=storageDriver();
    const storage=getStorage(driver);
    const key=storageKey({_id:id,purpose});
    await storage.put('private',key,data);
    try{
      await PrivateAsset.create({_id:id,owner,purpose,driver,productSlug,variantSku,width,height,expiresAt:new Date(Date.now()+lifetime)});
    }catch(error){
      await storage.remove('private',key).catch(()=>{console.warn('[storage] private upload cleanup failed');});
      throw error;
    }
    res.status(201).json({id,width,height});
  })
);
privateFiles.get('/:id',wrapped(async(req,res)=>{
  const {id}=req.params;
  if(!assetId.test(id))return res.sendStatus(404);
  const asset=await PrivateAsset.findById(id).lean();
  if(!asset)return res.sendStatus(404);
  const allowed=req.user?.role==='admin'
    ? asset.orderNumber && await Order.exists({number:asset.orderNumber})
    : asset.purpose==='artwork'&&asset.owner===commerceOwner(req,res)&&
      (asset.orderNumber||asset.expiresAt>new Date());
  if(!allowed)return res.sendStatus(404);
  if((asset.driver||'local')==='local'&&process.env.NODE_ENV==='production')return res.sendStatus(404);
  const storage=getStorage(asset.driver||'local');
  const key=storageKey(asset);
  if(!(await storage.head('private',key)))return res.sendStatus(404);
  const stream=await storage.stream('private',key);
  res.type('image/webp');
  await pipeline(stream,res);
}));

export async function checkAsset(id,criteria,session){
  if(!assetId.test(id||'')||!privateStorageAvailable())
    throw commerceError(409,'UPLOAD_UNAVAILABLE','The required image is unavailable');
  const asset=await PrivateAsset.findOne({_id:id,...criteria,orderNumber:null,cleanupClaimed:{$ne:true},expiresAt:{$gt:new Date()}}).session(session).lean();
  if(!asset)throw commerceError(409,'UPLOAD_UNAVAILABLE','The required image is unavailable');
  const file=await getStorage(asset.driver||'local').head('private',storageKey(asset));
  if(!file?.ContentLength)
    throw commerceError(409,'UPLOAD_UNAVAILABLE','The required image is unavailable');
  return asset;
}
export async function bindAsset(asset,number,session){
  const update=await PrivateAsset.updateOne({_id:asset._id,orderNumber:null,cleanupClaimed:{$ne:true},expiresAt:{$gt:new Date()}},{$set:{orderNumber:number}},{session});
  if(!update.modifiedCount)throw commerceError(409,'UPLOAD_UNAVAILABLE','The required image is unavailable');
}
export async function removeExpiredAssets(now=new Date()){
  const expired=await PrivateAsset.find({orderNumber:null,expiresAt:{$lte:now}}).select('_id purpose driver').limit(500).lean();
  for(const asset of expired){
    if(!assetId.test(asset._id))continue;
    // Claim the record before deleting bytes so an in-flight order cannot bind it.
    const claim={_id:asset._id,orderNumber:null,expiresAt:{$lte:now}};
    const claimed=await PrivateAsset.findOneAndUpdate(claim,{$set:{cleanupClaimed:true}}).lean();
    if(!claimed)continue;
    await getStorage(asset.driver||'local').remove('private',storageKey(asset));
    await PrivateAsset.deleteOne({...claim,cleanupClaimed:true});
  }
  return expired.length;
}
