import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import {rateLimit} from 'express-rate-limit';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {startEmailWorker} from './email.js';
import {pipeline} from 'node:stream/promises';
import {getStorage,isAdminMediaKey,isPublicMediaUrl,digest} from './storage.js';
import {commerceOwner,privateFiles,normalizeImage} from './private-assets.js';
import {checkout,adminOrderChanges,commerceConfig} from './checkout.js';
import {pathToFileURL} from 'node:url';
import {slug,categoryRules,categoryPolicy,catalogSchema,listProducts,findProduct,relatedProducts,bestsellers,publicBundles} from './catalog.js';
import {z} from 'zod';
import {Product,Category,Bundle,Discount,User,Order} from './models.js';
import {hashPassword,verifyPassword,createSession,currentUser,logout,requireRole,originGuard,safeParse} from './security.js';

mongoose.set('bufferCommands',false);
export const app=express();
app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:false}));
app.use(compression());
app.use(express.json({limit:'60kb'}));
app.use(cookieParser());
app.use(originGuard);
app.use('/api',rateLimit({windowMs:15*60*1000,limit:400,standardHeaders:'draft-7',legacyHeaders:false}));
app.post(['/api/auth/login','/api/auth/register'],rateLimit({
 windowMs:15*60*1000,limit:20,standardHeaders:'draft-7',legacyHeaders:false
}));
app.use('/api/orders/track',rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:'draft-7',legacyHeaders:false}));
app.get('/api/health',(_req,res)=>res.json({ok:true,db:mongoose.connection.readyState===1}));
app.get('/api/ready',(_req,res)=>res.status(mongoose.connection.readyState===1?200:503).json({ready:mongoose.connection.readyState===1}));
app.use('/api',(_req,res,next)=>{
 if(mongoose.connection.readyState!==1)return res.status(503).set('Cache-Control','no-store').json({code:'DATABASE_UNAVAILABLE',error:'Store data is temporarily unavailable'});
 next();
});
app.use(['/api/auth','/api/orders','/api/admin','/api/private'],(_req,res,next)=>{res.set('Cache-Control','private,no-store');next()},currentUser);
const wrap=(fn)=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const bilingual=z.object({en:z.string().min(1).max(180),ar:z.string().max(180).default('')});
const desc=z.object({en:z.string().max(2500).default(''),ar:z.string().max(2500).default('')}).optional();
const image=z.object({url:z.string().max(300).refine(isPublicMediaUrl),alt:z.string().max(160).default('')});
const productSchema=z.object({slug,name:bilingual,description:desc,categorySlug:slug,images:z.array(image).max(8).default([]),variants:z.array(z.object({sku:z.string().min(2).max(80),label:z.string().min(1).max(100),priceEGP:z.number().int().min(0).max(1000000),stock:z.number().int().min(0).nullable().default(null)})).min(1).max(25),addons:z.array(z.object({code:z.string(),label:bilingual,priceEGP:z.number().int().min(0)})).max(10).default([]),published:z.boolean().default(false),featured:z.boolean().default(false)}).strict();
const categorySchema=z.object({slug,name:bilingual,description:desc,published:z.boolean().default(false),sortOrder:z.number().int().default(0),image:z.string().max(300).refine(isPublicMediaUrl).optional(),...categoryRules}).strict();
const bundleSchema=z.object({slug,name:bilingual,description:desc,items:z.array(z.object({productSlug:slug,variantSku:z.string().min(1),quantity:z.number().int().min(1).max(10)})).min(1).max(20),priceEGP:z.number().int().min(0),images:z.array(image).max(8).default([]),published:z.boolean().default(false)}).strict();
const codeSchema=z.object({code:z.string().min(3).max(30).regex(/^[A-Z0-9_-]+$/),kind:z.enum(['percent','fixed']),amount:z.number().min(0),minimumEGP:z.number().min(0).default(0),maxUses:z.number().int().min(0).nullable().default(null),enabled:z.boolean().default(false),expiresAt:z.coerce.date().nullable().optional()}).strict();
const registerSchema=z.object({name:z.string().trim().min(2).max(80),email:z.string().trim().email().max(160),password:z.string().min(12).max(72).refine(value=>Buffer.byteLength(value,'utf8')<=72)}).strict();
const loginSchema=registerSchema.pick({email:true}).extend({password:z.string().min(1).max(128)});
app.get('/api/config',wrap(async(_req,res)=>res.set('Cache-Control','no-store').json(await commerceConfig())));
app.get('/api/categories',wrap(async(_req,res)=>{
 const categories=await Category.find({published:true}).sort({sortOrder:1,_id:1}).lean();
 res.json(categories.map(category=>({...category,...categoryPolicy(category)})));
}));
app.get('/api/products',wrap(async(req,res)=>{
 const parsed=catalogSchema.safeParse(req.query);
 if(!parsed.success)return res.status(400).json({code:'INVALID_CATALOG_FILTER',error:'Check the catalog filters',details:parsed.error.flatten()});
 res.json(await listProducts(parsed.data));
}));
app.get('/api/products/:slug',wrap(async(req,res)=>{
 const product=await findProduct(req.params.slug);
 if(!product)return res.status(404).json({error:'Product not found'});
 res.json(product);
}));
app.get('/api/products/:slug/related',wrap(async(req,res)=>{
 const product=await findProduct(req.params.slug);
 if(!product)return res.status(404).json({error:'Product not found'});
 res.json(await relatedProducts(product));
}));
app.get('/api/bundles',wrap(async(_req,res)=>res.json(await publicBundles())));
app.get('/api/bundles/:slug',wrap(async(req,res)=>{const item=(await publicBundles(req.params.slug))[0];if(!item)return res.status(404).json({error:'Bundle not found'});res.json(item)}));
app.get('/api/bestsellers',wrap(async(_req,res)=>res.json(await bestsellers())));

app.post('/api/auth/register',wrap(async(req,res)=>{
 const body=safeParse(registerSchema,req.body);
 const email=body.email.toLowerCase();
 if(await User.exists({email}))return res.status(409).json({error:'Email already registered'});
 const user=await User.create({name:body.name.trim(),email,passwordHash:await hashPassword(body.password),role:'customer'});
 await createSession(res,user);
 res.status(201).json({id:user.id,name:user.name,email:user.email,role:'customer'});
}));
const dummyPasswordHash=await bcrypt.hash('gallermo-invalid-account',12);
app.post('/api/auth/login',wrap(async(req,res)=>{
 const body=safeParse(loginSchema,req.body);
 const user=await User.findOne({email:body.email.toLowerCase().trim()}).select('+passwordHash');
 const valid=await verifyPassword(body.password,user?.passwordHash||dummyPasswordHash);
 if(!user||!valid)return res.status(401).json({error:'Invalid email or password'});
 await createSession(res,user);
 res.json({id:user.id,name:user.name,email:user.email,role:user.role});
}));
app.post('/api/auth/logout',wrap(async(req,res)=>{await logout(req,res);res.json({ok:true})}));
app.get('/api/auth/me',(req,res)=>res.json({user:req.user||null}));

app.use('/api/private',privateFiles);
app.use('/api/orders',checkout);
app.get('/api/orders/mine',requireRole('customer'),wrap(async(req,res)=>res.json(await Order.find({userId:req.user._id}).select('number status paymentStatus paymentMethod requiredUpfrontPiastres verifiedPiastres balancePiastres totalEGP createdAt').sort({createdAt:-1}).limit(100).lean())));
app.post('/api/orders/track',wrap(async(req,res)=>{
 if(req.user)return res.status(403).json({error:'Guest tracking only'});
 const body=safeParse(z.object({number:z.string().min(8).max(40),phone:z.string().min(10).max(20)}),req.body);
 const o=await Order.findOne({number:body.number.trim().toUpperCase(),userId:null,'customer.phone':body.phone.trim()}).select('number status paymentStatus createdAt ownerKey paymentMethod requiredUpfrontPiastres verifiedPiastres balancePiastres totalEGP').lean();
 if(!o)return res.status(404).json({error:'No matching order'});
 const {ownerKey,...tracking}=o;
 res.json({...tracking,canReplacePayment:!!ownerKey&&ownerKey===commerceOwner(req,res)&&o.paymentStatus==='rejected'});
}));

app.get('/api/media/:key',wrap(async(req,res)=>{
 const {key}=req.params;
 if(!isAdminMediaKey(key)||!(await getStorage('local').head('public',key)))return res.sendStatus(404);
 res.type('image/webp').set('Cache-Control','public,max-age=31536000,immutable');
 await pipeline(getStorage('local').stream('public',key),res);
}));
app.use('/api/admin',requireRole('admin'));
app.post('/api/admin/media',express.raw({type:['image/jpeg','image/png','image/webp','application/octet-stream'],limit:'10mb'}),
 wrap(async(req,res)=>{
  const {data}=await normalizeImage(req.body);
  const key='catalog/admin/'+digest(data)+'.webp';
  const storage=getStorage();
  const existing=await storage.head('public',key);
  if(!existing)await storage.put('public',key,data);
  res.status(201).json({url:storage.publicUrl(key)});
 }));

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
app.use('/api/admin/orders',adminOrderChanges);
app.use((err,req,res,next)=>{
 if(res.headersSent||res.destroyed)return next(err);
 if(err.code===11000)return res.status(409).json({error:'Duplicate record'});
 if(err.name==='CastError')return res.status(400).json({error:'Invalid identifier'});
 if(err.name==='ValidationError')return res.status(400).json({error:'Validation failed'});
 const unavailable=/^Mongo(Network|ServerSelection|PoolCleared)/.test(err.name)||err.code===50;
 const status=unavailable?503:err.status||500;
 if(status>=500)console.error('[api]',req.method,req.route?.path||req.path.split('/').slice(0,3).join('/'),err.name,err.code||'');
 res.status(status).json({code:unavailable?'DATABASE_UNAVAILABLE':typeof err.code==='string'&&err.status?err.code:undefined,error:status===503&&!err.status?'Store data is temporarily unavailable':status>=500&&!err.status?'Unexpected server error':err.message,details:status<500?err.details:undefined});
});
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 const uri = process.env.MONGODB_URI;
 if (!uri?.startsWith('mongodb://')) {
  console.error('A standard mongodb:// seedlist URI is required');
  process.exit(1);
 }
 const port = Number(process.env.PORT || 4000);
 app.listen(port,process.env.API_HOST || (process.env.NODE_ENV==='production'?'0.0.0.0':'127.0.0.1'),()=>console.log('Gallermo API listening on port '+port));
 const connect = async () => {
  try {
   await mongoose.connect(uri,{serverSelectionTimeoutMS:4500,connectTimeoutMS:4000,socketTimeoutMS:5000,waitQueueTimeoutMS:3500,autoIndex:process.env.NODE_ENV!=='production'});
   console.log('Gallermo database ready');
  } catch(error) {
   console.error('Gallermo database unavailable:',error.name,error.code||'');
   setTimeout(connect,10000).unref();
  }
 };
 startEmailWorker();
 void connect();
}
