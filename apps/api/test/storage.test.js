import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createR2Storage,digest,r2Config} from '../src/storage.js';
import {smtpConfig} from '../src/email.js';

const env={
 R2_ACCOUNT_ID:'fixture',R2_ACCESS_KEY_ID:'test',R2_SECRET_ACCESS_KEY:'fixture-only',
 R2_PUBLIC_BUCKET:'catalog-fixture',R2_PRIVATE_BUCKET:'private-fixture',
 PUBLIC_MEDIA_BASE_URL:'https://media.example.invalid'
};
test('mock R2 adapter keeps payment and artwork private and stores integrity metadata',async()=>{
 const config=r2Config(env);
 assert.equal(r2Config({...env,R2_PRIVATE_BUCKET:env.R2_PUBLIC_BUCKET}),null);
 const calls=[];
 const bytes=Buffer.from('fixture bytes');
 const client={async send(command){
   const {input}=command;
   calls.push({name:command.constructor.name,input});
   if(input.Key==='missing')throw {$metadata:{httpStatusCode:404}};
   if(command.constructor.name==='GetObjectCommand')return {Body:Readable.from([bytes])};
   return {ContentLength:bytes.length};
 }};
 const storage=createR2Storage(config,client);
 await storage.put('private','payment/fixture.webp',bytes);
 await storage.put('private','artwork/fixture.webp',bytes);
 await storage.put('public','catalog/fixture.webp',bytes);
 assert.equal(await storage.head('private','missing'),null);
 await storage.remove('private','payment/fixture.webp');
 const stream=await storage.stream('private','artwork/fixture.webp');
 const chunks=[];
 for await(const chunk of stream)chunks.push(chunk);
 assert.deepEqual(Buffer.concat(chunks),bytes);
 assert.deepEqual(calls.slice(0,3).map(call=>call.input.Bucket),[env.R2_PRIVATE_BUCKET,env.R2_PRIVATE_BUCKET,env.R2_PUBLIC_BUCKET]);
 assert.ok(calls.slice(0,3).every(call=>call.input.Metadata.sha256===digest(bytes)&&!call.input.ACL));
 assert.throws(()=>storage.publicUrl('payment/fixture.webp'));
 assert.match(storage.publicUrl('catalog/fixture.webp'),/^https:\/\/media\.example\.invalid\//);
});
test('Gmail requires TLS under both supported submission modes',()=>{
 const gmail={SMTP_USER:'fixture@example.invalid',SMTP_APP_PASSWORD:'fixture-only'};
 assert.equal(smtpConfig(gmail).secure,true);
 assert.equal(smtpConfig({...gmail,SMTP_PORT:'587',SMTP_SECURE:'false'}).requireTLS,true);
 assert.throws(()=>smtpConfig({...gmail,SMTP_PORT:'587',SMTP_SECURE:'true'}));
});
