import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir,writeFile,unlink,lstat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {S3Client,HeadBucketCommand,HeadObjectCommand,GetObjectCommand,PutObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';

const fileRoot=()=>process.env.NODE_ENV==='test'&&process.env.GALLERMO_TEST_PRIVATE_ROOT||
  fileURLToPath(new URL('../.private/',import.meta.url));
const publicRoot=()=>fileURLToPath(new URL('../.public-media/',import.meta.url));
const mediaKey=/^(?:catalog|categories)\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\.webp$/;
const adminMediaKey=/^[a-f0-9]{64}\.webp$/;
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export const storageDriver=()=>process.env.STORAGE_DRIVER||'local';
export function r2Config(env=process.env){
  const {R2_ACCOUNT_ID,R2_ENDPOINT,R2_ACCESS_KEY_ID,R2_SECRET_ACCESS_KEY,R2_PUBLIC_BUCKET,R2_PRIVATE_BUCKET,PUBLIC_MEDIA_BASE_URL}=env;
  try{
    if(!(R2_ACCOUNT_ID||R2_ENDPOINT)||!R2_ACCESS_KEY_ID||!R2_SECRET_ACCESS_KEY||!R2_PUBLIC_BUCKET||
      !R2_PRIVATE_BUCKET||R2_PRIVATE_BUCKET===R2_PUBLIC_BUCKET)return null;
    const endpoint=new URL(R2_ENDPOINT||'https://'+R2_ACCOUNT_ID+'.r2.cloudflarestorage.com');
    const publicBase=new URL(PUBLIC_MEDIA_BASE_URL);
    if([endpoint,publicBase].some(url=>url.protocol!=='https:'||url.username||url.password||url.search||url.hash)||
      endpoint.pathname!=='/'||endpoint.origin===publicBase.origin)return null;
    return {endpoint:endpoint.origin,credentials:{accessKeyId:R2_ACCESS_KEY_ID,secretAccessKey:R2_SECRET_ACCESS_KEY},
      publicBucket:R2_PUBLIC_BUCKET,privateBucket:R2_PRIVATE_BUCKET,publicBase:publicBase.href.replace(/\/$/,'')};
  }catch{return null;}
}
const isMissing=error=>error.$metadata?.httpStatusCode===404||error.code==='ENOENT';
export function createR2Storage(config,client=new S3Client({
  region:'auto',endpoint:config.endpoint,credentials:config.credentials,maxAttempts:3,
  requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED'
})){
  const object=(scope,key)=>({Bucket:scope==='public'?config.publicBucket:config.privateBucket,Key:key});
  return {
    async verifyBuckets(){
      await Promise.all([config.publicBucket,config.privateBucket].map(Bucket=>client.send(new HeadBucketCommand({Bucket}),{abortSignal:AbortSignal.timeout(3500)})));
    },
    async head(scope,key){
      try{return await client.send(new HeadObjectCommand(object(scope,key)));}
      catch(error){if(isMissing(error))return null;throw error;}
    },
    async put(scope,key,bytes){
      await client.send(new PutObjectCommand({...object(scope,key),Body:bytes,ContentType:'image/webp',
        CacheControl:scope==='public'?'public,max-age=31536000,immutable':'private,no-store',
        Metadata:{sha256:digest(bytes)}}));
    },
    async stream(scope,key){
      const result=await client.send(new GetObjectCommand(object(scope,key)));
      return result.Body;
    },
    async remove(scope,key){await client.send(new DeleteObjectCommand(object(scope,key)));},
    publicUrl(key){
      if(!mediaKey.test(key))throw new Error('Invalid public media key');
      return config.publicBase+'/'+key;
    }
  };
}

let r2;
export function configuredR2(){
  const config=r2Config();
  if(!config)throw new Error('Configure separate public and private R2 buckets');
  return r2??=createR2Storage(config);
}

const scopedFile=(scope,key)=>path.join(scope==='public'?publicRoot():fileRoot(),path.basename(key));
const local={
  async head(scope,key){
    try{
      const file=await lstat(scopedFile(scope,key));
      return file.isFile()?{ContentLength:file.size}:null;
    }catch(error){if(isMissing(error))return null;throw error;}
  },
  async put(scope,key,bytes){
    await mkdir(scope==='public'?publicRoot():fileRoot(),{recursive:true,mode:0o700});
    try{await writeFile(scopedFile(scope,key),bytes,{flag:'wx',mode:0o600});}
    catch(error){if(scope!=='public'||error.code!=='EEXIST')throw error;}
  },
  stream(scope,key){return createReadStream(scopedFile(scope,key));},
  async remove(scope,key){try{await unlink(scopedFile(scope,key));}catch(error){if(!isMissing(error))throw error;}},
  publicUrl:key=>'/api/media/'+path.basename(key)
};
export function getStorage(driver=storageDriver()){
  if(driver==='r2')return configuredR2();
  if(driver==='local')return local;
  throw new Error('Unsupported storage driver');
}
export function isPublicMediaUrl(value){
  if(typeof value!=='string')return false;
  if(value.startsWith('/api/media/'))return adminMediaKey.test(value.slice('/api/media/'.length));
  if(value.startsWith('/'))return mediaKey.test(value.slice(1));
  const base=r2Config()?.publicBase;
  return !!base&&value.startsWith(base+'/')&&mediaKey.test(value.slice(base.length+1));
}
export const isAdminMediaKey=key=>adminMediaKey.test(key);
