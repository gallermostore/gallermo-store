import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import {rateLimit} from 'express-rate-limit';
import mongoose from 'mongoose';
import crypto from 'node:crypto';
import {z} from 'zod';
import {Product,Category,Bundle,Discount,User,Order} from './models.js';
import {hashPassword,verifyPassword,createSession,currentUser,logout,requireRole,originGuard,safeParse} from './security.js';

const app=express();
app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:false}));
app.use(compression());
app.use(express.json({limit:'60kb'}));
app.use(cookieParser());
app.use(originGuard);
app.use('/api',rateLimit({windowMs:15*60*1000,limit:400,standardHeaders:'draft-7',legacyHeaders:false}));
app.use('/api/auth',rateLimit({windowMs:15*60*1000,limit:20,standardHeaders:'draft-7',legacyHeaders:false}));
app.use('/api/orders/track',rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:'draft-7',legacyHeaders:false}));
app.use(currentUser);
const wrap=(fn)=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const bilingual=z.object({en:z.string().min(1).max(180),ar:z.string().max(180).default('')});
const desc=z.object({en:z.string().max(2500).default(''),ar:z.string().max(2500).default('')}).optional();
const slug=z.string().regex(/^[a-z0-9][a-z0-9-]{1,95}$/);
const image=z.object({url:z.string().startsWith('/catalog/'),alt:z.string().max(160).default('')});
const productSchema=z.object({slug,name:bilingual,description:desc,categorySlug:slug,images:z.array(image).max(8).default([]),variants:z.array(z.object({sku:z.string().min(2).max(80),label:z.string().min(1).max(100),priceEGP:z.number().int().min(0).max(1000000),stock:z.number().int().min(0).nullable().default(null)})).min(1).max(25),addons:z.array(z.object({code:z.string(),label:bilingual,priceEGP:z.number().int().min(0)})).max(10).default([]),published:z.boolean().default(false),featured:z.boolean().default(false)}).strict();
const categorySchema=z.object({slug,name:bilingual,description:desc,published:z.boolean().default(false),sortOrder:z.number().int().default(0),image:z.string().optional()}).strict();
const bundleSchema=z.object({slug,name:bilingual,description:desc,items:z.array(z.object({productSlug:slug,variantSku:z.string().min(1),quantity:z.number().int().min(1).max(10)})).min(1).max(20),priceEGP:z.number().int().min(0),images:z.array(image).max(8).default([]),published:z.boolean().default(false)}).strict();
const codeSchema=z.object({code:z.string().min(3).max(30).regex(/^[A-Z0-9_-]+$/),kind:z.enum(['percent','fixed']),amount:z.number().min(0),minimumEGP:z.number().min(0).default(0),maxUses:z.number().int().min(0).nullable().default(null),enabled:z.boolean().default(false),expiresAt:z.coerce.date().nullable().optional()}).strict();
const registerSchema=z.object({name:z.string().min(2).max(80),email:z.string().email().max(160),password:z.string().min(12).max(128)}).strict();
const loginSchema=registerSchema.pick({email:true,password:true});
const publicProduct={deletedAt:null,published:true};
app.get('/api/health',(_req,res)=>res.json({ok:true,db:mongoose.connection.readyState===1}));
app.get('/api/config',(_req,res)=>res.json({checkoutEnabled:process.env.CHECKOUT_ENABLED==='true'&&Number.isSafeInteger(Number(process.env.SHIPPING_FEE_EGP))&&Number(process.env.SHIPPING_FEE_EGP)>=0,instapayNumber:process.env.INSTAPAY_NUMBER||'+201149504797',currency:'EGP'}));
app.get('/api/categories',wrap(async(_req,res)=>res.json(await Category.find({published:true}).sort({sortOrder:1}).lean())));
app.get('/api/products',wrap(async(req,res)=>{
 const query={...publicProduct};
 if(req.query.category)query.categorySlug=String(req.query.category).slice(0,100);
 if(req.query.q)query['name.en']={$regex:String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&').slice(0,75),$options:'i'};
 const page=Math.max(1,Math.min(500,Number.parseInt(req.query.page,10)||1));
 const limit=Math.max(1,Math.min(24,Number.parseInt(req.query.limit,10)||12));
 const sort=req.query.sort==='price_asc'?{'variants.0.priceEGP':1}:req.query.sort==='price_desc'?{'variants.0.priceEGP':-1}:req.query.sort==='featured'?{featured:-1,createdAt:-1}:{createdAt:-1};
 const [items,total]=await Promise.all([Product.find(query).sort(sort).skip((page-1)*limit).limit(limit).lean(),Product.countDocuments(query)]);
 res.json({items,total,page,limit});
}));
app.get('/api/products/:slug',wrap(async(req,res)=>{
 const p=await Product.findOne({slug:req.params.slug,...publicProduct}).lean();
 if(!p)return res.status(404).json({error:'Product not found'});
 res.json(p);
}));
app.get('/api/bundles',wrap(async(_req,res)=>res.json(await Bundle.find({published:true}).lean())));
app.get('/api/bundles/:slug',wrap(async(req,res)=>{const item=await Bundle.findOne({slug:req.params.slug,published:true}).lean();if(!item)return res.status(404).json({error:'Bundle not found'});res.json(item)}));
app.get('/api/bestsellers',wrap(async(_req,res)=>{
 const winners=await Order.aggregate([{$match:{status:'delivered'}},{$unwind:'$lines'},{$match:{'lines.kind':'product'}},{$group:{_id:'$lines.slug',sold:{$sum:'$lines.quantity'}}},{$sort:{sold:-1}},{$limit:8}]);
 if(!winners.length)return res.json([]);
 const found=await Product.find({slug:{$in:winners.map(x=>x._id)},...publicProduct}).lean();
 const bySlug=new Map(found.map(x=>[x.slug,x]));
 res.json(winners.map(x=>bySlug.get(x._id)).filter(Boolean));
}));

app.post('/api/auth/register',wrap(async(req,res)=>{
 const body=safeParse(registerSchema,req.body);
 const email=body.email.trim().toLowerCase();
 if(await User.exists({email}))return res.status(409).json({error:'Email already registered'});
 const user=await User.create({name:body.name.trim(),email,passwordHash:await hashPassword(body.password),role:'customer'});
 await createSession(res,user);
 res.status(201).json({id:user.id,name:user.name,email:user.email,role:'customer'});
}));
app.post('/api/auth/login',wrap(async(req,res)=>{
 const body=safeParse(loginSchema,req.body);
 const user=await User.findOne({email:body.email.toLowerCase().trim()}).select('+passwordHash');
 const valid=user&&await verifyPassword(body.password,user.passwordHash);
 if(!valid)return res.status(401).json({error:'Invalid email or password'});
 await createSession(res,user);
 res.json({id:user.id,name:user.name,email:user.email,role:user.role});
}));
app.post('/api/auth/logout',wrap(async(req,res)=>{await logout(req,res);res.json({ok:true})}));
app.get('/api/auth/me',(req,res)=>res.json({user:req.user||null}));

const cartLine=z.object({kind:z.enum(['product','bundle']),slug:slug,variantSku:z.string().max(90).optional(),quantity:z.number().int().min(1).max(10),addons:z.array(z.string().max(30)).max(5).default([])});
const orderSchema=z.object({idempotencyKey:z.string().uuid(),lines:z.array(cartLine).min(1).max(30),customer:z.object({name:z.string().min(2).max(100),email:z.string().email().max(150),phone:z.string().min(10).max(20),governorate:z.string().min(2).max(70),address:z.string().min(8).max(300),notes:z.string().max(500).default('')}),discountCode:z.string().max(30).optional(),paymentMethod:z.enum(['cod','instapay'])}).strict();
const checkoutEnabled=()=>process.env.CHECKOUT_ENABLED==='true'&&Number.isSafeInteger(Number(process.env.SHIPPING_FEE_EGP))&&Number(process.env.SHIPPING_FEE_EGP)>=0;
async function calculate(lines,discountCode){
 let subtotal=0;const result=[];
 for(const line of lines){
  if(line.kind==='product'){
   const p=await Product.findOne({slug:line.slug,...publicProduct}).lean();
   if(!p)throw Object.assign(new Error('Product unavailable'),{status:409});
   const v=p.variants.find(x=>x.sku===line.variantSku);
   if(!v)throw Object.assign(new Error('Option unavailable'),{status:409});
   if(v.stock!==null && v.stock<line.quantity)throw Object.assign(new Error('Not enough stock'),{status:409});
   const addonSet=new Set(line.addons);
   if(addonSet.size!==line.addons.length || [...addonSet].some(a=>!p.addons.some(b=>b.code===a)))throw Object.assign(new Error('Invalid add-on'),{status:400});
   const unit=v.priceEGP+p.addons.filter(x=>addonSet.has(x.code)).reduce((sum,x)=>sum+x.priceEGP,0);
   const amount=unit*line.quantity;subtotal+=amount;
   result.push({kind:'product',slug:p.slug,title:p.name.en,variantSku:v.sku,variantLabel:v.label,addons:line.addons,unitPriceEGP:unit,quantity:line.quantity,lineTotalEGP:amount});
  }else{
   const b=await Bundle.findOne({slug:line.slug,published:true}).lean();
   if(!b)throw Object.assign(new Error('Bundle unavailable'),{status:409});
   const amount=b.priceEGP*line.quantity;subtotal+=amount;
   result.push({kind:'bundle',slug:b.slug,title:b.name.en,variantSku:'',variantLabel:'',addons:[],unitPriceEGP:b.priceEGP,quantity:line.quantity,lineTotalEGP:amount});
  }
 }
 let discount=0;let code='';
 if(discountCode){
  const d=await Discount.findOne({code:discountCode.trim().toUpperCase(),enabled:true}).lean();
  if(!d||d.expiresAt&&d.expiresAt<new Date()||d.maxUses!==null&&d.usedCount>=d.maxUses||subtotal<d.minimumEGP)
   throw Object.assign(new Error('Discount code is unavailable'),{status:400});
  discount=Math.min(subtotal,Math.floor(d.kind==='percent'?subtotal*Math.min(d.amount,100)/100:d.amount));code=d.code;
 }
 const shipping=Number(process.env.SHIPPING_FEE_EGP);
 return {lines:result,subtotalEGP:subtotal,discountEGP:discount,shippingEGP:shipping,totalEGP:subtotal-discount+shipping,discountCode:code};
}
app.post('/api/orders/quote',wrap(async(req,res)=>{
 if(!checkoutEnabled())return res.status(503).json({error:'Checkout is not enabled yet'});
 const body=safeParse(orderSchema.omit({idempotencyKey:true,customer:true,paymentMethod:true}).extend({lines:z.array(cartLine).min(1).max(30)}),req.body);
 res.json(await calculate(body.lines,body.discountCode));
}));
app.post('/api/orders',wrap(async(req,res)=>{
 if(!checkoutEnabled())return res.status(503).json({error:'Checkout is not enabled yet'});
 const body=safeParse(orderSchema,req.body);
 const existing=await Order.findOne({idempotencyKey:body.idempotencyKey}).lean();
 if(existing)return res.json({number:existing.number,totalEGP:existing.totalEGP,paymentStatus:existing.paymentStatus});
 const totals=await calculate(body.lines,body.discountCode);
 const number='GL-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+crypto.randomBytes(5).toString('hex').toUpperCase();
 const paymentStatus=body.paymentMethod==='instapay'?'awaiting_transfer':'unpaid';
 // Payment evidence is not auto-approved. Inventory reservation and proof upload require the next hardening phase.
 const order=await Order.create({...totals,number,customer:body.customer,userId:req.user?.role==='customer'?req.user._id:null,paymentMethod:body.paymentMethod,paymentStatus,idempotencyKey:body.idempotencyKey,events:[{status:'pending',note:'Order received'}]});
 res.status(201).json({number:order.number,totalEGP:order.totalEGP,paymentStatus});
}));
app.get('/api/orders/mine',requireRole('customer'),wrap(async(req,res)=>res.json(await Order.find({userId:req.user._id}).select('-customer.address -paymentProofKey -events').sort({createdAt:-1}).limit(100).lean())));
app.post('/api/orders/track',wrap(async(req,res)=>{
 if(req.user)return res.status(403).json({error:'Guest tracking only'});
 const body=safeParse(z.object({number:z.string().min(8).max(40),phone:z.string().min(10).max(20)}),req.body);
 const o=await Order.findOne({number:body.number.toUpperCase(), 'customer.phone':body.phone}).select('number status paymentStatus createdAt events').lean();
 if(!o)return res.status(404).json({error:'No matching order'});
 res.json(o);
}));

app.use('/api/admin',requireRole('admin'));
const adminModels={products:{model:Product,schema:productSchema},categories:{model:Category,schema:categorySchema},bundles:{model:Bundle,schema:bundleSchema},codes:{model:Discount,schema:codeSchema}};
for(const [key,{model,schema}] of Object.entries(adminModels)){
 const path='/api/admin/'+key;
 app.get(path,wrap(async(req,res)=>res.json(await model.find({}).sort({createdAt:-1}).limit(1000).lean())));
 app.post(path,wrap(async(req,res)=>{
  const data=safeParse(schema,req.body);
  if(key==='codes'){data.code=data.code.toUpperCase();if(data.kind==='percent'&&data.amount>100)return res.status(400).json({error:'Percent above 100'})}
  if(key==='products'&&!(await Category.exists({slug:data.categorySlug})))return res.status(400).json({error:'Category does not exist'});
  res.status(201).json(await model.create(data));
 }));
 app.put(path+'/:id',wrap(async(req,res)=>{
  const data=safeParse(schema,req.body);
  if(key==='codes'){data.code=data.code.toUpperCase();if(data.kind==='percent'&&data.amount>100)return res.status(400).json({error:'Percent above 100'})}
  const doc=await model.findByIdAndUpdate(req.params.id,{$set:data},{new:true,runValidators:true});
  if(!doc)return res.status(404).json({error:'Not found'});
  res.json(doc);
 }));
 app.delete(path+'/:id',wrap(async(req,res)=>{
  if(key==='categories'){const c=await Category.findById(req.params.id).lean();if(c&&await Product.exists({categorySlug:c.slug,deletedAt:null}))return res.status(409).json({error:'Remove or reassign products before deleting this category'});}
  if(key==='products'){
   const item=await model.findByIdAndUpdate(req.params.id,{$set:{published:false,deletedAt:new Date()}},{new:true});
   if(!item)return res.status(404).json({error:'Not found'});
  }else{
   const item=await model.findByIdAndDelete(req.params.id);
   if(!item)return res.status(404).json({error:'Not found'});
  }
  res.json({ok:true});
 }));
}
app.get('/api/admin/orders',wrap(async(_req,res)=>res.json(await Order.find().sort({createdAt:-1}).limit(500).lean())));
app.patch('/api/admin/orders/:id',wrap(async(req,res)=>{
 const data=safeParse(z.object({status:z.enum(['pending','confirmed','processing','shipped','delivered','cancelled']).optional(),paymentStatus:z.enum(['unpaid','awaiting_transfer','proof_submitted','verified','rejected']).optional()}).refine(x=>Object.keys(x).length>0),req.body);
 const item=await Order.findByIdAndUpdate(req.params.id,{$set:data,$push:{events:{status:data.status||data.paymentStatus,note:'Changed by administrator'}}},{new:true});
 if(!item)return res.status(404).json({error:'Not found'});
 res.json(item);
}));
app.use((err,req,res,_next)=>{
 if(err.code===11000)return res.status(409).json({error:'Duplicate record'});
 if(err.name==='CastError')return res.status(400).json({error:'Invalid identifier'});
 if(err.name==='ValidationError')return res.status(400).json({error:'Validation failed'});
 const status=err.status||500;
 if(status>=500)console.error('[api]',err);
 res.status(status).json({error:status>=500?'Unexpected server error':err.message,details:status<500?err.details:undefined});
});
const uri=process.env.MONGODB_URI;
if(!uri){console.error('Missing MONGODB_URI: copy apps/api/.env.example to apps/api/.env');process.exit(1)}
try{
 await mongoose.connect(uri,{serverSelectionTimeoutMS:10000,autoIndex:process.env.NODE_ENV!=='production'});
 app.listen(Number(process.env.PORT||4000),()=>console.log('Gallermo API listening on http://localhost:'+String(process.env.PORT||4000)));
}catch(err){console.error('MongoDB connection failed:',err.message);process.exit(1)}
