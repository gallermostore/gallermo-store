import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm,unlink} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {Category,Discount,Order,Product} from '../src/models.js';
import {address,adminEmail,artLine,first,flagLine,startFixture,testPassword,trackedSku} from './fixtures.js';

const origin='http://127.0.0.1:55173';
let base,server,stop,root,image;
before(async()=>{
 root=await mkdtemp(path.join(os.tmpdir(),'gallermo-acceptance-'));
 process.env.GALLERMO_TEST_PRIVATE_ROOT=root;
 stop=await startFixture({origin});
 const {app}=await import('../src/index.js');
 server=await new Promise(resolve=>{const listener=app.listen(0,'127.0.0.1',()=>resolve(listener));});
 base='http://127.0.0.1:'+server.address().port+'/api';
 image=await sharp({create:{width:10,height:10,channels:3,background:'#392535'}}).png().toBuffer();
});
after(async()=>{
 if(server)await new Promise(resolve=>server.close(resolve));
 await stop?.();
 if(root)await rm(root,{recursive:true,force:true});
});
function client(){
 const jar=new Map();
 return async(route,body,method=body===undefined?'GET':'POST')=>{
  const raw=Buffer.isBuffer(body);
  const response=await fetch(base+route,{
   method,headers:{Origin:origin,Cookie:[...jar.values()].join('; '),...(body===undefined?{}:{'Content-Type':raw?'application/octet-stream':'application/json'})},
   body:raw?body:JSON.stringify(body)
  });
  for(const cookie of response.headers.getSetCookie()){
   const pair=cookie.split(';')[0];
   jar.set(pair.split('=')[0],pair);
  }
  return {status:response.status,data:response.headers.get('content-type')?.includes('json')?await response.json():null};
 };
}
const quote=(buyer,lines,discountCode)=>buyer('/orders/quote',{lines,discountCode,governorate:'cairo'});
const order=(lines,quote,other={})=>({idempotencyKey:randomUUID(),lines,customer:address,quoteToken:quote.data.quoteToken,paymentMethod:'cod',...other});
const uploadArtwork=buyer=>buyer('/private/artwork?'+new URLSearchParams({slug:first.slug,sku:trackedSku}),image);
async function customer(label){
 const buyer=client();
 const registered=await buyer('/auth/register',{name:'Fixture buyer '+label,email:label+'@example.invalid',password:testPassword});
 assert.equal(registered.status,201);
 return buyer;
}
const stock=async()=> (await Product.findOne({slug:first.slug})).variants[0].stock;

test('session polling does not consume the credential submission limit',async()=>{
 const buyer=client();
 for(let i=0;i<25;i++){
  const response=await buyer('/auth/me');
  assert.equal(response.status,200);
  assert.equal(response.data.user,null);
 }
 const login=await buyer('/auth/login',{email:'unregistered@example.invalid',password:'fixture-only'});
 assert.equal(login.status,401);
});

test('stale price invalidates a signed quote before stock or payment changes',async()=>{
 const buyer=client();
 const initial=await quote(buyer,[artLine]);
 assert.equal(initial.status,200);
 const original=first.variants[0].priceEGP;
 await Product.updateOne({slug:first.slug},{$set:{'variants.0.priceEGP':original+1}});
 try{
  const beforeStock=await stock();
  const response=await buyer('/orders',order([artLine],initial,{paymentMethod:'instapay_deposit'}));
  assert.equal(response.status,409);
  assert.equal(response.data.code,'STALE_QUOTE');
  assert.equal(await stock(),beforeStock);
 }finally{await Product.updateOne({slug:first.slug},{$set:{'variants.0.priceEGP':original}});}
});

test('independent buyers competing for the last coupon use cannot over-redeem it',async()=>{
 await Discount.create({code:'ONEACCEPTANCE',kind:'fixed',amount:10,maxUses:1,enabled:true});
 const buyers=[client(),client()];
 const quotes=await Promise.all(buyers.map(buyer=>quote(buyer,[flagLine],'ONEACCEPTANCE')));
 assert.ok(quotes.every(response=>response.status===200));
 const outcomes=await Promise.all(buyers.map((buyer,i)=>buyer('/orders',order([flagLine],quotes[i],{discountCode:'ONEACCEPTANCE'}))));
 assert.deepEqual(outcomes.map(outcome=>outcome.status).sort(),[201,409]);
 assert.equal(outcomes.find(outcome=>outcome.status===409).data.code,'DISCOUNT_UNAVAILABLE');
 assert.equal(await Order.countDocuments({discountCode:'ONEACCEPTANCE'}),1);
 assert.equal((await Discount.findOne({code:'ONEACCEPTANCE'})).usedCount,1);
});

test('concurrent identical requests retain one order and one inventory reservation',async()=>{
 const buyer=client();
 const beforeStock=await stock();
 const estimate=await quote(buyer,[artLine]);
 assert.equal(estimate.status,200);
 const proof=await buyer('/private/payment',image);
 assert.equal(proof.status,201);
 const body=order([artLine],estimate,{paymentMethod:'instapay_deposit',paymentProofId:proof.data.id,paymentReference:'ACCEPT-IDEMPOTENCY'});
 const responses=await Promise.all([buyer('/orders',body),buyer('/orders',body)]);
 assert.deepEqual(responses.map(response=>response.status).sort(),[200,201]);
 assert.equal(responses[0].data.number,responses[1].data.number);
 assert.equal(await Order.countDocuments({paymentReference:'ACCEPTIDEMPOTENCY'}),1);
 assert.equal(await stock(),beforeStock-1);
});

test('customer isolation and accepted snapshots survive category changes',async()=>{
 const owner=await customer('audit-owner');
 const other=await customer('audit-other');
 const artwork=await uploadArtwork(owner);
 const proof=await owner('/private/payment',image);
 assert.equal(artwork.status,201);
 assert.equal(proof.status,201);
 const lines=[{...artLine,customizationId:artwork.data.id}];
 const initial=await quote(owner,lines);
 assert.equal(initial.status,200);
 const request=order(lines,initial,{paymentMethod:'instapay_deposit',paymentProofId:proof.data.id,paymentReference:'ACCEPT-OWNER'});
 const placed=await owner('/orders',request);
 assert.equal(placed.status,201);
 assert.equal(placed.data.paymentStatus,'proof_submitted');
 assert.equal(placed.data.verifiedPiastres,0);
 assert.equal((await other('/private/'+artwork.data.id)).status,404);
 assert.equal((await other('/private/'+proof.data.id)).status,404);
 assert.equal((await owner('/private/'+proof.data.id)).status,404);
 assert.equal((await other('/orders/recover',{key:request.idempotencyKey})).status,404);
 assert.equal((await other('/orders/mine')).data.length,0);
 const own=await owner('/orders/mine');
 assert.equal(own.data[0].number,placed.data.number);
 assert.equal(JSON.stringify(own.data).includes(artwork.data.id),false);
 const original=await Order.findOne({number:placed.data.number}).lean();
 try{
  await Category.updateOne({slug:first.categorySlug},{$set:{requiresPrepayment:false,customizationEnabled:false}});
  const newer=await quote(owner,[artLine]);
  assert.equal(newer.data.requiresPrepayment,false);
  assert.equal((await uploadArtwork(owner)).status,409);
  const historical=await Order.findOne({number:placed.data.number}).lean();
  assert.deepEqual(historical.lines,original.lines);
  assert.equal(historical.requiredUpfrontPiastres,original.requiredUpfrontPiastres);
 }finally{
  await Category.updateOne({slug:first.categorySlug},{$set:{requiresPrepayment:true,customizationEnabled:true}});
 }
});

test('an upload record with a missing local file cannot satisfy an order',async()=>{
 const buyer=client();
 const estimate=await quote(buyer,[artLine]);
 const proof=await buyer('/private/payment',image);
 assert.equal(proof.status,201);
 await unlink(path.join(root,proof.data.id+'.webp'));
 const beforeStock=await stock();
 const rejected=await buyer('/orders',order([artLine],estimate,{paymentMethod:'instapay_deposit',paymentProofId:proof.data.id,paymentReference:'ACCEPT-MISSING'}));
 assert.equal(rejected.status,409);
 assert.equal(rejected.data.code,'UPLOAD_UNAVAILABLE');
 assert.equal(await stock(),beforeStock);
 assert.equal(await Order.countDocuments({paymentReference:'ACCEPTMISSING'}),0);
});

test('simultaneous administrative cancellation releases inventory and coupon at most once',async()=>{
 const buyer=client();
 const admin=client();
 const login=await admin('/auth/login',{email:adminEmail,password:testPassword});
 assert.equal(login.status,200);
 await Discount.create({code:'CANCELACCEPTANCE',kind:'fixed',amount:10,maxUses:1,enabled:true});
 const beforeStock=await stock();
 const estimate=await quote(buyer,[artLine],'CANCELACCEPTANCE');
 const proof=await buyer('/private/payment',image);
 const placed=await buyer('/orders',order([artLine],estimate,{discountCode:'CANCELACCEPTANCE',paymentMethod:'instapay_deposit',paymentProofId:proof.data.id,paymentReference:'ACCEPT-CANCEL'}));
 assert.equal(placed.status,201);
 const record=await Order.findOne({number:placed.data.number});
 const cancel=()=>admin('/admin/orders/'+record.id,{status:'cancelled'},'PATCH');
 const answers=await Promise.all([cancel(),cancel()]);
 assert.ok(answers.every(response=>response.status===200));
 assert.equal(await stock(),beforeStock);
 assert.equal((await Discount.findOne({code:'CANCELACCEPTANCE'})).usedCount,0);
});
