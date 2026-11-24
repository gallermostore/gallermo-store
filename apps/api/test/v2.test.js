import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {catalogSchema,categoryPolicy} from '../src/catalog.js';
import {moneyTotals,paymentPlans} from '../src/checkout.js';
import {normalizeImage} from '../src/private-assets.js';
import {Category,Discount,Product,Order} from '../src/models.js';
import {sizeInfo} from '../../web/src/sizes.js';
import {startFixture,seed,first,flag,artLine,flagLine,fixtureBundle,address,trackedSku,testPassword,adminEmail} from './fixtures.js';

const origin='http://127.0.0.1:55173';
let url,listener,stop,artwork,privateRoot;
before(async()=>{
  privateRoot=await mkdtemp(path.join(os.tmpdir(),'gallermo-test-'));
  process.env.GALLERMO_TEST_PRIVATE_ROOT=privateRoot;
  stop=await startFixture({origin});
  const {app}=await import('../src/index.js');
  listener=await new Promise(resolve=>{const server=app.listen(0,'127.0.0.1',()=>resolve(server));});
  url='http://127.0.0.1:'+listener.address().port;
  artwork=await sharp({create:{width:50,height:20,channels:3,background:'#83324f'}}).png().toBuffer();
});
after(async()=>{
  if(listener)await new Promise(resolve=>listener.close(resolve));
  await stop?.();
  if(privateRoot)await rm(privateRoot,{recursive:true,force:true});
});
function client(){
  const cookies=new Map();
  return async(path,{method='GET',body,headers={},raw}={})=>{
    const response=await fetch(url+'/api'+path,{method,headers:{
      Origin:origin,Cookie:[...cookies.values()].join('; '),...(body===undefined?{}:{'Content-Type':'application/json'}),...headers
    },body:raw||JSON.stringify(body)});
    for(const cookie of response.headers.getSetCookie()){
      const pair=cookie.split(';')[0];
      cookies.set(pair.split('=')[0],pair);
    }
    const data=response.headers.get('content-type')?.includes('application/json')?await response.json():await response.arrayBuffer();
    return {status:response.status,data,headers:response.headers};
  };
}
const guest=client(),admin=client(),customer=client(),stranger=client();
const post=(agent,path,body)=>agent(path,{method:'POST',body});
const upload=(agent,path,raw=artwork)=>agent('/private/'+path,{method:'POST',raw,headers:{'Content-Type':'application/octet-stream'}});
const quote=(agent,lines,discountCode)=>post(agent,'/orders/quote',{lines,discountCode,governorate:'Cairo'});
const stock=async()=> (await Product.findOne({slug:first.slug}).lean()).variants.find(v=>v.sku===trackedSku).stock;
function orderBody(lines,data,details={}){
  return {idempotencyKey:randomUUID(),customer:address,lines,quoteToken:data.quoteToken,paymentMethod:'cod',...details};
}

test('catalog query rejects invalid bounds, duplicate keys and unsafe sort',()=>{
  for(const invalid of [{page:'0'},{limit:'99'},{q:['x','y']},{sort:'__proto__'},{minPrice:'1e3'},{minPrice:'90',maxPrice:'80'},{availability:'all'}])
    assert.equal(catalogSchema.safeParse(invalid).success,false);
  assert.equal(catalogSchema.parse({q:'  لوحة  ',minPrice:'12.50'}).q,'لوحة');
});
test('variant size formatting covers every real seed label with safe chart gating',()=>{
  for (const product of seed.products) for(const variant of product.variants){
    for(const language of ['en','ar']){
      const pretty=sizeInfo(variant.label,product.categorySlug,language);
      assert.ok(pretty.label.trim());
      if(pretty.chart)assert.match(product.categorySlug,/frames|anime-neon-art/);
    }
  }
  assert.equal(sizeInfo('50*70','normal-frames').label,'50 × 70 cm');
  assert.equal(sizeInfo('18*20','mouse-pads').chart,false);
  assert.equal(sizeInfo('unknown','laptop-sleeves').comparison,undefined);
});
test('integer money conserves cents and rounds a half-piastre deposit up',()=>{
  assert.deepEqual(paymentPlans(101,true),[{method:'instapay_deposit',requiredUpfrontPiastres:51,balancePiastres:50}]);
  const value=moneyTotals(10001,{kind:'percent',amount:12.5},3000,true);
  assert.equal(value.totalPiastres,11751);
  assert.equal(value.plans[0].requiredUpfrontPiastres+value.plans[0].balancePiastres,value.totalPiastres);
});
test('auth, cookies, origin guard, logout and exact role isolation',async()=>{
  const failed=await post(guest,'/auth/login',{email:adminEmail,password:'incorrect'});
  assert.equal(failed.status,401);
  assert.equal((await guest('/orders/mine')).status,401);
  const registered=await post(customer,'/auth/register',{name:'Fixture customer',email:address.email,password:testPassword});
  assert.equal(registered.status,201);
  assert.match(registered.headers.get('set-cookie'),/HttpOnly/i);
  assert.match(registered.headers.get('cache-control'),/no-store/);
  assert.equal((await customer('/auth/me')).data.user.role,'customer');
  assert.equal((await customer('/admin/categories')).status,403);
  assert.equal((await post(customer,'/orders/track',{number:'GL-UNUSED',phone:address.phone})).status,403);
  assert.equal((await post(admin,'/auth/login',{email:adminEmail,password:testPassword})).status,200);
  assert.equal((await admin('/orders/mine')).status,403);
  assert.equal((await quote(admin,[flagLine])).status,403);
  assert.equal((await admin('/admin/categories')).status,200);
  assert.equal((await customer('/auth/logout',{method:'POST',headers:{Origin:'https://example.invalid'}})).status,403);
  assert.equal((await post(customer,'/auth/logout')).status,200);
  assert.equal((await customer('/auth/me')).data.user,null);
  assert.equal((await post(customer,'/auth/login',{email:address.email,password:testPassword})).status,200);
});
test('category booleans persist independently and legacy records map false',async()=>{
  const old=(await Category.collection.findOne({slug:'flags'}));
  assert.deepEqual(categoryPolicy(old),{requiresPrepayment:false,customizationEnabled:false});
  const base={slug:'fixture-section',name:{en:'Fixture category',ar:'فئة تجريبية'},published:true};
  assert.equal((await post(guest,'/admin/categories',base)).status,401);
  assert.equal((await post(admin,'/admin/categories',{...base,requiresPrepayment:'false'})).status,400);
  const created=await post(admin,'/admin/categories',base);
  assert.equal(created.status,201);
  assert.equal(created.data.requiresPrepayment,false);
  const updated=await admin('/admin/categories/'+created.data._id,{method:'PUT',body:{...base,customizationEnabled:true}});
  assert.equal(updated.status,200);
  const value=(await guest('/categories')).data.find(c=>c.slug===base.slug);
  assert.equal(value.customizationEnabled,true);
  assert.equal(value.requiresPrepayment,false);
});
test('published catalog, available-variant price, Arabic search, clamp and related products',async()=>{
  assert.equal((await guest('/products/hidden-fixture')).status,404);
  assert.equal((await guest('/products?minPrice=9&maxPrice=2')).status,400);
  const query=new URLSearchParams({q:first.name.ar,limit:'2'});
  const response=await guest('/products?'+query);
  assert.equal(response.status,200);
  assert.ok(response.data.items.some(item=>item.slug===first.slug));
  const product=await guest('/products/'+first.slug);
  assert.equal(product.data.category.requiresPrepayment,true);
  const price=first.variants[1].priceEGP;
  const filtered=await guest('/products?category=normal-frames&minPrice='+price+'&maxPrice='+price+'&availability=in_stock&sort=price_asc&page=500&limit=2');
  assert.equal(filtered.status,200);
  assert.ok(filtered.data.total>0);
  assert.equal(filtered.data.page,Math.ceil(filtered.data.total/2));
  assert.ok(filtered.data.items.every(p=>p.catalogPrice===price));
  const related=(await guest('/products/'+first.slug+'/related')).data;
  assert.equal(related.length,4);
  assert.ok(related.every(p=>p.categorySlug===first.categorySlug&&p.slug!==first.slug));
  assert.equal((await guest('/bestsellers')).data.length,0);
});
test('image decode and ownership isolation, no upload for a disabled category',async()=>{
  assert.equal((await normalizeImage(artwork)).width,50);
  await assert.rejects(normalizeImage(Buffer.from('89504e470d0a1a0affffffffffff','hex')),error=>error.code==='INVALID_IMAGE');
  assert.equal((await upload(guest,'artwork?'+new URLSearchParams({slug:flag.slug,sku:flagLine.variantSku}))).status,409);
  assert.equal((await upload(guest,'payment',Buffer.from('<html>invalid</html>'))).status,400);
  const accepted=await upload(guest,'artwork?'+new URLSearchParams({slug:first.slug,sku:trackedSku}));
  assert.equal(accepted.status,201);
  assert.equal((await guest('/private/'+accepted.data.id)).status,200);
  for(const other of [stranger,customer,admin])assert.equal((await other('/private/'+accepted.data.id)).status,404);
  assert.equal((await quote(customer,[{...artLine,customizationId:accepted.data.id}])).status,409);
});
test('bundle and mixed checkout reject COD, oversized duplicate demand and stale terms',async()=>{
  for(const lines of [[fixtureBundle],[flagLine,artLine]]){
    const result=await quote(guest,lines);
    assert.equal(result.status,200);
    assert.equal(result.data.plans.length,1);
    assert.equal(result.data.plans[0].method,'instapay_deposit');
    assert.equal((await post(guest,'/orders',orderBody(lines,result.data))).data.code,'PAYMENT_PLAN_CHANGED');
  }
  assert.equal((await quote(guest,[{...artLine,quantity:9},{...artLine,quantity:5}])).data.code,'STOCK_UNAVAILABLE');
  assert.equal((await post(guest,'/orders/quote',{lines:[artLine],governorate:'Elsewhere'})).data.code,'SHIPPING_UNAVAILABLE');
  const current=await quote(guest,[artLine]);
  await Category.updateOne({slug:first.categorySlug},{$set:{requiresPrepayment:false}});
  const stale=await post(guest,'/orders',orderBody([artLine],current.data));
  assert.equal(stale.data.code,'STALE_QUOTE');
  await Category.updateOne({slug:first.categorySlug},{$set:{requiresPrepayment:true}});
});
test('deposit order links private assets, blocks fulfillment, verifies partial balance and cancels once',async()=>{
  const start=await stock();
  const uploadPath='artwork?'+new URLSearchParams({slug:first.slug,sku:trackedSku});
  const custom=(await upload(guest,uploadPath)).data.id;
  const proof=(await upload(guest,'payment')).data.id;
  const lines=[{...artLine,customizationId:custom},fixtureBundle];
  const estimate=await quote(guest,lines,'FIXTURE10');
  const deposit=estimate.data.plans[0].requiredUpfrontPiastres;
  const body=orderBody(lines,estimate.data,{discountCode:'FIXTURE10',paymentMethod:'instapay_deposit',paymentProofId:proof,paymentReference:'GL-FIXTURE-001'});
  const sent=await post(guest,'/orders',body);
  assert.equal(sent.status,201,JSON.stringify(sent.data));
  assert.equal((await post(guest,'/orders',body)).data.number,sent.data.number);
  assert.equal((await post(stranger,'/orders',body)).status,409);
  assert.equal((await post(guest,'/orders/recover',{key:body.idempotencyKey})).data.number,sent.data.number);
  assert.equal((await post(stranger,'/orders/recover',{key:body.idempotencyKey})).status,404);
  assert.equal(await stock(),start-3);
  assert.equal((await Discount.findOne({code:'FIXTURE10'})).usedCount,1);
  assert.equal((await quote(guest,[flagLine],'FIXTURE10')).data.code,'DISCOUNT_UNAVAILABLE');
  const record=await Order.findOne({number:sent.data.number}).lean();
  assert.equal(record.lines[0].customization.assetId,custom);
  assert.equal(record.lines[1].components[0].category.requiresPrepayment,true);
  assert.equal((await admin('/private/'+custom)).status,200);
  assert.equal((await admin('/private/'+proof)).status,200);
  assert.equal((await guest('/private/'+proof)).status,404);
  const tracked=await post(guest,'/orders/track',{number:record.number,phone:address.phone});
  assert.equal(tracked.status,200);
  assert.equal(tracked.data.paymentProofKey,undefined);
  const patch=body=>admin('/admin/orders/'+record._id,{method:'PATCH',body});
  assert.equal((await patch({status:'confirmed'})).data.code,'PAYMENT_REQUIRED');
  assert.equal((await patch({paymentStatus:'rejected'})).status,200);
  const replacement=(await upload(guest,'payment')).data.id;
  assert.equal((await post(stranger,'/orders/'+record.number+'/payment',{paymentProofId:replacement,paymentReference:'GL-FIXTURE-002'})).status,404);
  assert.equal((await post(guest,'/orders/'+record.number+'/payment',{paymentProofId:replacement,paymentReference:'GL-FIXTURE-002'})).status,200);
  assert.equal((await patch({paymentStatus:'verified',verifiedPiastres:deposit-1})).status,400);
  const verified=await patch({paymentStatus:'verified',verifiedPiastres:deposit,status:'confirmed'});
  assert.equal(verified.status,200);
  assert.equal(verified.data.balancePiastres,record.totalPiastres-deposit);
  assert.ok(verified.data.balancePiastres>0);
  assert.equal((await patch({status:'cancelled'})).status,200);
  assert.equal((await patch({status:'cancelled'})).status,200);
  assert.equal(await stock(),start);
  assert.equal((await Discount.findOne({code:'FIXTURE10'})).usedCount,0);
});
test('ordinary COD, InstaPay duplicate reference rollback and verified sales ranking',async()=>{
  const lines=[flagLine];
  const estimate=await quote(customer,lines);
  assert.deepEqual(estimate.data.plans.map(plan=>plan.method),['cod','instapay']);
  const order=await post(customer,'/orders',orderBody(lines,estimate.data));
  assert.equal(order.status,201);
  assert.equal((await post(guest,'/orders/track',{number:order.data.number,phone:address.phone})).status,404);
  assert.equal((await customer('/orders/mine')).data[0].number,order.data.number);
  const proof=(await upload(customer,'payment')).data.id;
  const duplicate=await post(customer,'/orders',orderBody(lines,estimate.data,{paymentMethod:'instapay',paymentProofId:proof,paymentReference:'GL-FIXTURE-001'}));
  assert.equal(duplicate.data.code,'REFERENCE_USED');
  const bankOrder=await post(customer,'/orders',orderBody(lines,estimate.data,{paymentMethod:'instapay',paymentProofId:proof,paymentReference:'GL-FIXTURE-003'}));
  assert.equal(bankOrder.status,201);
  const known=await Order.findOne({number:order.data.number});
  for(const status of ['confirmed','processing','shipped'])
    assert.equal((await admin('/admin/orders/'+known.id,{method:'PATCH',body:{status}})).status,200);
  assert.equal((await admin('/admin/orders/'+known.id,{method:'PATCH',body:{status:'delivered'}})).data.code,'BALANCE_REQUIRED');
  const delivered=await admin('/admin/orders/'+known.id,{method:'PATCH',body:{status:'delivered',collectedAtDeliveryPiastres:known.balancePiastres}});
  assert.equal(delivered.status,200);
  assert.equal(delivered.data.balancePiastres,0);
  assert.equal((await guest('/bestsellers')).data[0].slug,flag.slug);
});

test('concurrent submits cannot oversell a shared SKU',async()=>{
 const before=await stock();
 const a=client(),b=client();
 const lines=[{...artLine,quantity:Math.min(10,before)}];
 const quotes=await Promise.all([quote(a,lines),quote(b,lines)]);
 assert.ok(quotes.every(response=>response.status===200));
 const proofs=await Promise.all([upload(a,'payment'),upload(b,'payment')]);
 const requests=[a,b].map((agent,i)=>post(agent,'/orders',orderBody(lines,quotes[i].data,{
  paymentMethod:'instapay_deposit',paymentProofId:proofs[i].data.id,paymentReference:'CONCURRENT-'+i
 })));
 const replies=await Promise.all(requests);
 assert.deepEqual(replies.map(reply=>reply.status).sort(),[201,409]);
 assert.equal(await stock(),before-lines[0].quantity);
 const accepted=await Order.findOne({number:replies.find(reply=>reply.status===201).data.number});
 assert.equal((await admin('/admin/orders/'+accepted.id,{method:'PATCH',body:{status:'cancelled'}})).status,200);
 assert.equal(await stock(),before);
});

test('legacy verified transfers can advance while legacy unverified transfers remain blocked',async()=>{
  const [verified,pending]=await Order.create([
    {number:'GL-LEGACY-VERIFIED',paymentMethod:'instapay',paymentStatus:'verified',totalEGP:200},
    {number:'GL-LEGACY-PENDING',paymentMethod:'instapay',paymentStatus:'awaiting_transfer',totalEGP:200}
  ]);
  const change=order=>admin('/admin/orders/'+order.id,{method:'PATCH',body:{status:'confirmed'}});
  assert.equal((await change(verified)).status,200);
  assert.equal((await change(pending)).data.code,'PAYMENT_REQUIRED');
});
