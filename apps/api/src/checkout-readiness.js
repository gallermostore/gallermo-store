import mongoose from 'mongoose';
import {configuredR2,r2Config,storageDriver} from './storage.js';
import {smtpConfig} from './email.js';
import {governorates} from './shipping.js';
import * as models from './models.js';

export async function missingIndexes(){
  const missing=[];
  await Promise.all(Object.values(models).map(async model=>{
    const existing=await model.listIndexes().catch(error=>{if(error.code===26)return [];throw error;});
    for(const [spec,options] of model.schema.indexes()){
      const matches=existing.some(index=>JSON.stringify(index.key)===JSON.stringify(spec)&&
        Boolean(index.unique)===Boolean(options.unique)&&Boolean(index.sparse)===Boolean(options.sparse)&&
        index.expireAfterSeconds===options.expireAfterSeconds&&!index.partialFilterExpression);
      if(!matches)missing.push({collection:model.collection.name,spec});
    }
  }));
  return missing;
}

export const quoteSecret=()=>process.env.CHECKOUT_QUOTE_SECRET;

export function checkoutProductionSettings(env=process.env){
  let secureOrigin=false;
  try{
    const url=new URL(env.CLIENT_ORIGIN);
    secureOrigin=url.protocol==='https:'&&url.origin===env.CLIENT_ORIGIN&&
      !['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  }catch{}
  const shippingReady=governorates.length===27&&new Set(governorates.map(zone=>zone.id)).size===27&&
    governorates.every(zone=>zone.shippingPiastres===(['cairo','giza'].includes(zone.id)?9000:12000));
  const secret=env.CHECKOUT_QUOTE_SECRET||'';
  return secureOrigin&&shippingReady&&/^[a-f0-9]{64}$/i.test(secret)&&new Set(secret).size>=8&&
    env.STORAGE_DRIVER==='r2'&&!!r2Config(env);
}

async function verifyProductionInfrastructure(){
  if(process.env.EMAIL_ENABLED==='true')smtpConfig();
  const [hello,missing]=await Promise.all([
    mongoose.connection.db.admin().command({hello:1}),
    missingIndexes(),
    configuredR2().verifyBuckets()
  ]);
  return Boolean(hello.isWritablePrimary&&hello.setName&&hello.logicalSessionTimeoutMinutes&&missing.length===0);
}

let pending;
let availableUntil=0;
let retryAfter=0;
export async function checkoutLaunchReady({fresh=false}={}){
  if(process.env.NODE_ENV!=='production'||process.env.CHECKOUT_ENABLED!=='true'||
     process.env.CHECKOUT_LAUNCH_AUTHORIZED!=='true'||process.env.R2_PRIVATE_ACCESS_VERIFIED!=='true'||
     !checkoutProductionSettings()||storageDriver()!=='r2'||mongoose.connection.readyState!==1)return false;
  if(!fresh&&Date.now()<availableUntil)return true;
  if(Date.now()<retryAfter)return false;
  pending??=verifyProductionInfrastructure().then(ready=>{
    if(ready)availableUntil=Date.now()+30_000;
    else{availableUntil=0;retryAfter=Date.now()+5_000;}
    return ready;
  }).catch(()=>{
    availableUntil=0;
    retryAfter=Date.now()+5_000;
    return false;
  }).finally(()=>{pending=undefined;});
  return pending;
}
