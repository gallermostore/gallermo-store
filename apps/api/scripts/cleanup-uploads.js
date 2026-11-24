import 'dotenv/config';
import mongoose from 'mongoose';
import {privateStorageAvailable,removeExpiredAssets} from '../src/private-assets.js';

if(!privateStorageAvailable()||!process.env.MONGODB_URI?.startsWith('mongodb://')){
  console.error('Local private storage and a standard MongoDB seedlist URI are required.');
  process.exitCode=1;
}else{
  try{
    await mongoose.connect(process.env.MONGODB_URI,{autoIndex:false,serverSelectionTimeoutMS:4500});
    console.log('Expired unbound uploads removed:',await removeExpiredAssets());
  }catch(error){console.error('Cleanup failed:',error.name);process.exitCode=1;}
  finally{await mongoose.disconnect();}
}
