import test from 'node:test';
import assert from 'node:assert/strict';
import {app} from '../src/index.js';
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

test('a production API keeps checkout and local private storage disabled even with local flags',()=>{
  const env={
    NODE_ENV:'production',CHECKOUT_ENABLED:'true',LOCAL_PRIVATE_UPLOADS:'true',
    SHIPPING_FEE_EGP:'30',LOCAL_SHIPPING_GOVERNORATES:'Cairo'
  };
  const previous=Object.fromEntries(Object.keys(env).map(key=>[key,process.env[key]]));
  Object.assign(process.env,env);
  try{assert.deepEqual(commerceConfig(),{checkoutEnabled:false,currency:'EGP',customizationAvailable:false,governorates:[]});}
  finally{for(const [key,value] of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
