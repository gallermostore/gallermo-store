import 'dotenv/config';
import mongoose from 'mongoose';
import {configuredR2,r2Config} from '../src/storage.js';
import {smtpConfig} from '../src/email.js';
import {checkoutProductionSettings,missingIndexes} from '../src/checkout-readiness.js';
import * as models from '../src/models.js';

const [mode='--verify']=process.argv.slice(2);
if(!['--verify','--apply','--release-check'].includes(mode)||process.argv.length>3||!process.env.MONGODB_URI?.startsWith('mongodb://')){
  console.error('Use --verify, --apply, or --release-check with an explicit standard mongodb:// URI.');
  process.exit(1);
}
try{
  await mongoose.connect(process.env.MONGODB_URI,{autoIndex:false,autoCreate:false,serverSelectionTimeoutMS:5000});
  if(mode==='--apply')for(const model of Object.values(models))await model.createIndexes();
  const missing=await missingIndexes();
  for(const {collection,spec} of missing)console.error('Missing or incompatible index',collection,spec);
  if(mode==='--release-check'){
    const issues=[];
    if(process.env.NODE_ENV!=='production'||process.env.CHECKOUT_ENABLED!=='false')issues.push('Use production mode with checkout disabled during release checks');
    if(!checkoutProductionSettings())issues.push('Configure the stable hex signing secret, HTTPS origin, shipping zones and R2');
    try{if(new URL(process.env.CLIENT_ORIGIN).origin!==process.env.CLIENT_ORIGIN||!process.env.CLIENT_ORIGIN.startsWith('https://'))throw new Error();}
    catch{issues.push('Configure the exact HTTPS storefront origin');}
    const hello=await mongoose.connection.db.admin().command({hello:1});
    if(!hello.isWritablePrimary||!hello.setName)issues.push('A writable replica set is required');
    if(process.env.STORAGE_DRIVER!=='r2'||!r2Config())issues.push('Configure the two R2 buckets');
    else try{await configuredR2().verifyBuckets();}catch{issues.push('R2 bucket credentials failed a read-only check');}
    if(process.env.EMAIL_ENABLED==='true')try{smtpConfig();}catch{issues.push('Gmail SMTP settings are invalid');}
    for(const issue of issues)console.error(issue);
    if(issues.length)process.exitCode=1;
  }
  if(missing.length)process.exitCode=1;
  else console.log('All required indexes verified.');
}catch(error){
  console.error('Index operation failed:',error.name,error.code||'');
  process.exitCode=1;
}finally{await mongoose.disconnect();}
