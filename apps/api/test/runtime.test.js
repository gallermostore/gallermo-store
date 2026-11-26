import test from 'node:test';
import assert from 'node:assert/strict';
import {app} from '../src/index.js';
import {checkoutLaunchReady,checkoutProductionSettings} from '../src/checkout-readiness.js';
import {commerceConfig} from '../src/checkout.js';

test('disconnected API stays live and responds promptly with a typed unavailable result',async()=>{
  const server=await new Promise(resolve=>{const listener=app.listen(0,'127.0.0.1',()=>resolve(listener));});
  try{
    const base='http://127.0.0.1:'+server.address().port+'/api';
    const request=(route,options={})=>fetch(base+route,{...options,signal:AbortSignal.timeout(2000)});
    const health=await request('/health');
    assert.equal(health.status,200);
    assert.deepEqual(await health.json(),{ok:true,db:false});
    assert.equal((await request('/ready')).status,503);
    const login=await request('/auth/login',{method:'POST',headers:{
      Origin:process.env.CLIENT_ORIGIN||'http://localhost:5173','Content-Type':'application/json'
    },body:JSON.stringify({email:'nobody@example.invalid',password:'test-only'})});
    assert.equal(login.status,503);
    assert.equal((await login.json()).code,'DATABASE_UNAVAILABLE');
  }finally{await new Promise(resolve=>server.close(resolve));}
});

test('a production API keeps checkout and local private storage disabled even with local flags',async()=>{
  const env={
    NODE_ENV:'production',CHECKOUT_ENABLED:'true',LOCAL_PRIVATE_UPLOADS:'true',
    CHECKOUT_QUOTE_SECRET:'fixture-only-stable-quote-secret-32-bytes',
  };
  const previous=Object.fromEntries(Object.keys(env).map(key=>[key,process.env[key]]));
  Object.assign(process.env,env);
  try{
   const {checkoutEnabled,customizationAvailable,governorates}=await commerceConfig();
   assert.equal(checkoutEnabled,false);
   assert.equal(customizationAvailable,false);
   assert.equal(governorates.length,27);
 }
  finally{for(const [key,value] of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});

test('production settings require a strong signing key, HTTPS origin and separate R2 buckets',async()=>{
 const settings={CLIENT_ORIGIN:'https://store.example.invalid',STORAGE_DRIVER:'r2',
  CHECKOUT_QUOTE_SECRET:'abcdef0123456789'.repeat(4),R2_ACCOUNT_ID:'fixture',
  R2_ACCESS_KEY_ID:'fixture',R2_SECRET_ACCESS_KEY:'fixture',R2_PUBLIC_BUCKET:'public',R2_PRIVATE_BUCKET:'private',
  PUBLIC_MEDIA_BASE_URL:'https://media.example.invalid'};
 assert.equal(checkoutProductionSettings(settings),true);
 for(const overrides of [{CLIENT_ORIGIN:'http://localhost:5173'},{CHECKOUT_QUOTE_SECRET:'short'},{R2_PRIVATE_BUCKET:'public'}]){
  assert.equal(checkoutProductionSettings({...settings,...overrides}),false);
 }
 assert.equal(await checkoutLaunchReady(),false);
});
