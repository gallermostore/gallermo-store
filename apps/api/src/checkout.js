import crypto from 'node:crypto';
import express from 'express';
import mongoose from 'mongoose';
import {z} from 'zod';
import {rateLimit} from 'express-rate-limit';
import {Product,Category,Bundle,Discount,Order,PaymentReference} from './models.js';
import {categoryPolicy,publicProduct,slug} from './catalog.js';
import {safeParse,requireRole} from './security.js';
import {bindAsset,checkAsset,commerceError,commerceOwner,privateStorageAvailable} from './private-assets.js';

const secret=crypto.randomBytes(32);
const duration=10*60*1000;
const imageId=z.string().regex(/^[a-f0-9]{48}$/);
const reference=z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{4,48}$/).transform(value=>value.replaceAll('-','')).pipe(z.string().min(4));
const lineSchema=z.object({
  kind:z.enum(['product','bundle']),slug,variantSku:z.string().min(1).max(90).optional(),
  quantity:z.number().int().min(1).max(10),addons:z.array(z.string().max(30)).max(5).default([]),customizationId:imageId.optional()
}).strict();
const customerSchema=z.object({
  name:z.string().trim().min(2).max(100),email:z.string().email().max(150),phone:z.string().trim().regex(/^\+?[0-9]{10,15}$/),
  governorate:z.string().trim().min(2).max(70),address:z.string().trim().min(8).max(300),notes:z.string().max(500).default('')
}).strict();
const quoteSchema=z.object({lines:z.array(lineSchema).min(1).max(30),discountCode:z.string().trim().max(30).optional(),governorate:z.string().trim().min(2).max(70)}).strict();
const submitSchema=quoteSchema.omit({governorate:true}).extend({
  customer:customerSchema,idempotencyKey:z.string().uuid(),quoteToken:z.string().regex(/^\d{13}\.[a-zA-Z0-9_-]{43}$/),
  paymentMethod:z.enum(['cod','instapay','instapay_deposit']),paymentProofId:imageId.optional(),paymentReference:reference.optional()
}).strict();
const paymentSchema=z.object({paymentReference:reference,paymentProofId:imageId}).strict();
const wrapped=handler=>(req,res,next)=>Promise.resolve(handler(req,res)).catch(next);
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const safetyLimit=2700000000;
const fail=(code,message,status=409)=>{throw commerceError(status,code,message);};

function shippingConfig(){
  const fee=process.env.SHIPPING_FEE_EGP;
  const governorates=(process.env.LOCAL_SHIPPING_GOVERNORATES||'').split(',').map(value=>value.trim()).filter(Boolean);
  return fee&&/^\d{1,6}$/.test(fee)&&governorates.length?{fee:Number(fee)*100,governorates}:null;
}
export function commerceConfig(){
  const shipping=shippingConfig();
  const checkoutEnabled=process.env.NODE_ENV!=='production'&&process.env.CHECKOUT_ENABLED==='true'&&privateStorageAvailable()&&!!shipping;
  return {checkoutEnabled,currency:'EGP',customizationAvailable:privateStorageAvailable(),governorates:checkoutEnabled?shipping.governorates:[]};
}
function requireCheckout(_req,_res,next){
  next(commerceConfig().checkoutEnabled?undefined:commerceError(503,'CHECKOUT_DISABLED','Checkout is not enabled yet'));
}
export function paymentPlans(totalPiastres,requiresPrepayment){
  const upfront=requiresPrepayment?Math.ceil(totalPiastres/2):0;
  return requiresPrepayment
    ? [{method:'instapay_deposit',requiredUpfrontPiastres:upfront,balancePiastres:totalPiastres-upfront}]
    : [{method:'cod',requiredUpfrontPiastres:0,balancePiastres:totalPiastres},{method:'instapay',requiredUpfrontPiastres:totalPiastres,balancePiastres:0}];
}
export function moneyTotals(subtotal,discount,shipping,requiresPrepayment){
  const deduction=discount?Math.min(subtotal,discount.kind==='percent'
    ? Math.floor((subtotal*Math.round(discount.amount*100)+5000)/10000)
    : Math.round(discount.amount*100)):0;
  const total=subtotal-deduction+shipping;
  return {
    subtotalEGP:subtotal/100,discountEGP:deduction/100,shippingEGP:shipping/100,totalEGP:total/100,totalPiastres:total,currency:'EGP',
    requiresPrepayment,plans:paymentPlans(total,requiresPrepayment)
  };
}
async function resolveCart(lines,owner,session){
  const products=new Map(),categories=new Map(),stocks=new Map(),assets=new Map();
  const result=[];
  let subtotal=0;
  let requiresPrepayment=false;
  async function resolve(productSlug,sku,quantity){
    if(!products.has(productSlug))products.set(productSlug,await Product.findOne({slug:productSlug,...publicProduct}).session(session).lean());
    const product=products.get(productSlug);
    if(!product)fail('PRODUCT_UNAVAILABLE','A product is unavailable');
    if(!categories.has(product.categorySlug))categories.set(product.categorySlug,await Category.findOne({slug:product.categorySlug,published:true}).session(session).lean());
    const category=categories.get(product.categorySlug);
    if(!category)fail('PRODUCT_UNAVAILABLE','A product category is unavailable');
    const variant=product.variants.find(item=>item.sku===sku);
    if(!variant)fail('SKU_UNAVAILABLE','An option is unavailable');
    const policy={slug:category.slug,...categoryPolicy(category)};
    requiresPrepayment ||= policy.requiresPrepayment;
    if(variant.stock!=null){
      const key=productSlug+':'+sku;
      const demand=(stocks.get(key)?.quantity??0)+quantity;
      if(variant.stock<demand)fail('STOCK_UNAVAILABLE','There is insufficient stock for a selected option');
      stocks.set(key,{productId:product._id,sku,quantity:demand});
    }
    return {product,variant,policy};
  }
  for(const line of lines){
    let snapshot;
    if(line.kind==='product'){
      const {product,variant,policy}=await resolve(line.slug,line.variantSku,line.quantity);
      const addons=line.addons.map(code=>product.addons.find(addon=>addon.code===code));
      if(addons.some(addon=>!addon)||new Set(line.addons).size!==line.addons.length)fail('INVALID_ADDONS','An extra is unavailable',400);
      const unitPriceEGP=variant.priceEGP+addons.reduce((total,addon)=>total+addon.priceEGP,0);
      snapshot={kind:'product',slug:product.slug,title:product.name.en,variantSku:variant.sku,
        variantLabel:variant.label.replaceAll('—',' - '),addons:line.addons,unitPriceEGP,category:policy};
      if(line.customizationId){
        if(!policy.customizationEnabled||assets.has(line.customizationId))fail('CUSTOMIZATION_UNAVAILABLE','A custom design is unavailable or was used twice');
        const asset=await checkAsset(line.customizationId,{owner,purpose:'artwork',productSlug:product.slug,variantSku:variant.sku},session);
        assets.set(asset._id,asset);
        snapshot.customization={assetId:asset._id,width:asset.width,height:asset.height};
      }
    }else{
      if(line.customizationId||line.addons.length||line.variantSku)fail('INVALID_BUNDLE','Bundles only support standard items',400);
      const bundle=await Bundle.findOne({slug:line.slug,published:true}).session(session).lean();
      if(!bundle?.items.length)fail('BUNDLE_UNAVAILABLE','A bundle is unavailable');
      const components=[];
      for(const item of bundle.items){
        const {policy}=await resolve(item.productSlug,item.variantSku,item.quantity*line.quantity);
        components.push({slug:item.productSlug,sku:item.variantSku,quantity:item.quantity,category:policy});
      }
      snapshot={kind:'bundle',slug:bundle.slug,title:bundle.name.en,unitPriceEGP:bundle.priceEGP,components};
    }
    const lineTotal=Math.round(snapshot.unitPriceEGP*100)*line.quantity;
    if(!Number.isSafeInteger(lineTotal)||lineTotal<0||subtotal+lineTotal>safetyLimit)fail('INVALID_TOTAL','The order total is outside the supported range');
    subtotal+=lineTotal;
    result.push({...snapshot,quantity:line.quantity,lineTotalEGP:lineTotal/100});
  }
  return {subtotal,requiresPrepayment,result,stocks:[...stocks.values()],assets:[...assets.values()]};
}
async function calculate({lines,discountCode,governorate},owner,session){
  const shipping=shippingConfig();
  if(!shipping?.governorates.includes(governorate))fail('SHIPPING_UNAVAILABLE','Shipping is unavailable for that governorate',400);
  const {subtotal,requiresPrepayment,result,stocks,assets}=await resolveCart(lines,owner,session);
  let discount=null;
  if(discountCode){
    discount=await Discount.findOne({code:discountCode.toUpperCase(),enabled:true}).session(session).lean();
    if(!discount||(discount.expiresAt&&discount.expiresAt<=new Date())||
      (discount.maxUses!=null&&discount.usedCount>=discount.maxUses)||subtotal<Math.round(discount.minimumEGP*100))
      fail('DISCOUNT_UNAVAILABLE','The discount code is unavailable');
  }
  return {
    quote:{...moneyTotals(subtotal,discount,shipping.fee,requiresPrepayment),lines:result,discountCode:discount?.code||'',governorate},
    discount,stocks,assets
  };
}
function signedQuote(quote,owner,expires){
  return expires+'.'+crypto.createHmac('sha256',secret).update(JSON.stringify([owner,expires,quote])).digest('base64url');
}
function requireMatchingQuote(quote,owner,received){
  const expires=Number(received.split('.')[0]);
  const expected=signedQuote(quote,owner,expires);
  if(!Number.isSafeInteger(expires)||expires<=Date.now()||received.length!==expected.length||
    !crypto.timingSafeEqual(Buffer.from(received,'utf8'),Buffer.from(expected,'utf8')))fail('STALE_QUOTE','Refresh your quote before placing the order');
}
async function reserveStock(stocks,session){
  for(const {productId,sku,quantity} of stocks){
    const saved=await Product.updateOne({_id:productId,variants:{$elemMatch:{sku,stock:{$gte:quantity}}}},{$inc:{'variants.$.stock':-quantity}},{session});
    if(!saved.modifiedCount)fail('STOCK_UNAVAILABLE','A selected option has insufficient stock');
  }
}
async function releaseInventory(order,session){
  if(order.inventoryReleasedAt)return;
  for(const {productId,sku,quantity} of order.stockReservations||[]){
    const update=await Product.updateOne({_id:productId,variants:{$elemMatch:{sku,stock:{$type:'number'}}}},{$inc:{'variants.$.stock':quantity}},{session});
    if(!update.modifiedCount)fail('INVENTORY_REVIEW','An item requires inventory review before cancellation');
  }
  if(order.discountId)await Discount.updateOne({_id:order.discountId,usedCount:{$gt:0}},{$inc:{usedCount:-1}},{session});
  order.inventoryReleasedAt=new Date();
}
const receipt=order=>({
  number:order.number,totalEGP:order.totalEGP,paymentStatus:order.paymentStatus,paymentMethod:order.paymentMethod,
  requiredUpfrontPiastres:order.requiredUpfrontPiastres,verifiedPiastres:order.verifiedPiastres,balancePiastres:order.balancePiastres
});
const idempotencyHash=(owner,key)=>hash(JSON.stringify([owner,key]));
const submissionLimit=rateLimit({windowMs:15*60*1000,limit:20,standardHeaders:'draft-7',legacyHeaders:false});
export const checkout=express.Router();
checkout.post('/cart-policy',wrapped(async(req,res)=>{
  const {lines}=safeParse(quoteSchema.pick({lines:true}),req.body);
  const {requiresPrepayment}=await resolveCart(lines,commerceOwner(req,res),null);
  res.json({requiresPrepayment});
}));
checkout.post('/quote',requireCheckout,wrapped(async(req,res)=>{
  const body=safeParse(quoteSchema,req.body);
  const owner=commerceOwner(req,res,{create:true});
  const {quote}=await calculate(body,owner,null);
  const expiresAt=Date.now()+duration;
  res.json({...quote,expiresAt,quoteToken:signedQuote(quote,owner,expiresAt),instapayNumber:'+201149504797'});
}));
checkout.post('/recover',submissionLimit,wrapped(async(req,res)=>{
  const {key}=safeParse(z.object({key:z.string().uuid()}).strict(),req.body);
  const owner=commerceOwner(req,res);
  if(!owner)fail('NOT_FOUND','Order not found',404);
  const order=await Order.findOne({ownerKey:owner,idempotencyKey:idempotencyHash(owner,key)}).lean();
  if(!order)fail('NOT_FOUND','Order not found',404);
  res.json(receipt(order));
}));
checkout.post('/',requireCheckout,submissionLimit,wrapped(async(req,res)=>{
  const body=safeParse(submitSchema,req.body);
  const owner=commerceOwner(req,res);
  if(!owner)fail('STALE_QUOTE','Refresh your quote before placing the order');
  const idempotencyKey=idempotencyHash(owner,body.idempotencyKey);
  const fingerprint=hash(JSON.stringify({...body,quoteToken:undefined}));
  const previous=async()=>{
    const order=await Order.findOne({idempotencyKey,ownerKey:owner}).lean();
    if(order&&order.requestFingerprint!==fingerprint)fail('RETRY_MISMATCH','This order request has already been used');
    return order;
  };
  let existing=await previous();
  if(existing)return res.json(receipt(existing));
  try{
    const order=await mongoose.connection.transaction(async session=>{
      const result=await calculate({...body,governorate:body.customer.governorate},owner,session);
      const {quote,assets,stocks,discount}=result;
      const plan=quote.plans.find(plan=>plan.method===body.paymentMethod);
      if(!plan)fail('PAYMENT_PLAN_CHANGED','Choose a permitted payment method');
      requireMatchingQuote(quote,owner,body.quoteToken);
      const transfer=plan.method!=='cod'&&plan.requiredUpfrontPiastres>0;
      const proof=transfer?await checkAsset(body.paymentProofId,{owner,purpose:'payment'},session):null;
      if(transfer&&!body.paymentReference||!transfer&&(body.paymentReference||body.paymentProofId))
        fail('INVALID_PAYMENT','Review the payment method and transfer details',400);
      const number='GL-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+crypto.randomBytes(5).toString('hex').toUpperCase();
      if(transfer)await PaymentReference.create([{_id:body.paymentReference,orderNumber:number}],{session});
      for(const asset of [...assets,...(proof?[proof]:[])])await bindAsset(asset,number,session);
      await reserveStock(stocks,session);
      if(discount){
        const updated=await Discount.updateOne({_id:discount._id,enabled:true,usedCount:discount.usedCount},{$inc:{usedCount:1}},{session});
        if(!updated.modifiedCount)fail('DISCOUNT_UNAVAILABLE','The discount code is unavailable');
      }
      const [created]=await Order.create([{
        ...quote,number,ownerKey:owner,requestFingerprint:fingerprint,idempotencyKey,discountId:discount?._id,stockReservations:stocks,
        customer:body.customer,userId:req.user?.id||null,paymentMethod:plan.method,paymentStatus:transfer?'proof_submitted':plan.method==='cod'?'unpaid':'verified',
        requiredUpfrontPiastres:plan.requiredUpfrontPiastres,verifiedPiastres:0,balancePiastres:quote.totalPiastres,
        paymentReference:body.paymentReference,paymentProofKey:proof?._id,events:[{status:'pending',note:'Order received'}]
      }],{session});
      return created;
    });
    res.status(201).json(receipt(order));
  }catch(error){
    existing=await previous();
    if(existing)return res.json(receipt(existing));
    if(error.code===11000)fail('REFERENCE_USED','The transfer reference already belongs to an order');
    if(error.code===20)fail('TRANSACTIONS_UNAVAILABLE','Checkout requires a transaction-capable database',503);
    throw error;
  }
}));
checkout.post('/:number/payment',requireCheckout,submissionLimit,wrapped(async(req,res)=>{
  const body=safeParse(paymentSchema,req.body);
  const owner=commerceOwner(req,res);
  if(!owner)fail('NOT_FOUND','Order not found',404);
  const updated=await mongoose.connection.transaction(async session=>{
    const order=await Order.findOne({number:req.params.number,ownerKey:owner}).session(session);
    if(!order)fail('NOT_FOUND','Order not found',404);
    if(order.paymentStatus!=='rejected'||order.status==='cancelled')fail('INVALID_PAYMENT','This payment is not eligible for replacement');
    const proof=await checkAsset(body.paymentProofId,{owner,purpose:'payment'},session);
    const known=await PaymentReference.findById(body.paymentReference).session(session);
    if(known&&known.orderNumber!==order.number)fail('REFERENCE_USED','The transfer reference already belongs to an order');
    if(!known)await PaymentReference.create([{_id:body.paymentReference,orderNumber:order.number}],{session});
    await bindAsset(proof,order.number,session);
    order.paymentReference=body.paymentReference;
    order.paymentProofKey=proof._id;
    order.paymentStatus='proof_submitted';
    order.events.push({status:'proof_submitted',note:'Replacement evidence received'});
    return order.save({session});
  });
  res.json(receipt(updated));
}));

export const adminOrderChanges=express.Router();
const transitions={pending:['confirmed','cancelled'],confirmed:['processing','cancelled'],processing:['shipped','cancelled'],shipped:['delivered'],delivered:[],cancelled:[]};
adminOrderChanges.patch('/:id',requireRole('admin'),wrapped(async(req,res)=>{
  const body=safeParse(z.object({
    status:z.enum(['confirmed','processing','shipped','delivered','cancelled']).optional(),
    paymentStatus:z.enum(['verified','rejected']).optional(),
    verifiedPiastres:z.number().int().min(0).max(safetyLimit).optional(),
    collectedAtDeliveryPiastres:z.number().int().min(0).max(safetyLimit).optional()
  }).strict().refine(value=>value.status||value.paymentStatus),req.body);
  const saved=await mongoose.connection.transaction(async session=>{
    const order=await Order.findById(req.params.id).session(session);
    if(!order)fail('NOT_FOUND','Order not found',404);
    if(body.paymentStatus){
      if(order.status==='cancelled'||order.paymentStatus!=='proof_submitted'||!order.paymentProofKey||!order.paymentReference)
        fail('INVALID_PAYMENT','This payment is not awaiting verification');
      if(body.paymentStatus==='verified'){
        if(!Number.isInteger(body.verifiedPiastres)||body.verifiedPiastres<order.requiredUpfrontPiastres||body.verifiedPiastres>order.totalPiastres)
          fail('INVALID_PAYMENT','Enter the amount actually received, within the outstanding payment terms',400);
        order.verifiedPiastres=body.verifiedPiastres;
        order.balancePiastres=order.totalPiastres-body.verifiedPiastres;
      }
      order.paymentStatus=body.paymentStatus;
    }
    if(body.status&&body.status!==order.status){
      if(!transitions[order.status]?.includes(body.status))fail('INVALID_STATUS','That order status transition is unavailable');
      if(body.status!=='cancelled'&&order.paymentMethod!=='cod'&&
        (order.paymentStatus!=='verified'||order.requiredUpfrontPiastres!=null&&!(order.verifiedPiastres>=order.requiredUpfrontPiastres)))
        fail('PAYMENT_REQUIRED','Verify the minimum payment before fulfillment');
      if(body.status==='delivered'&&order.balancePiastres>0){
        if(body.collectedAtDeliveryPiastres!==order.balancePiastres)
          fail('BALANCE_REQUIRED','Record the balance actually collected at delivery',400);
        order.collectedAtDeliveryPiastres=body.collectedAtDeliveryPiastres;
        order.balancePiastres=0;
      }
      if(body.status==='cancelled')await releaseInventory(order,session);
      order.status=body.status;
    }
    order.events.push({status:body.status||body.paymentStatus,note:'Changed by administrator'});
    return order.save({session});
  });
  res.json(saved);
}));
