import {MongoMemoryReplSet} from 'mongodb-memory-server';
import mongoose from 'mongoose';
import {readFile} from 'node:fs/promises';
import {Category,Product,Bundle,Discount,User,Order,Session,PrivateAsset,PaymentReference,Notification} from '../src/models.js';
import {hashPassword} from '../src/security.js';

export const testPassword='fixture-only-gallermo-2026';
export const adminEmail='staff@example.invalid';
export const seed=JSON.parse(await readFile(new URL('../../../data/catalog.seed.json',import.meta.url),'utf8'));
export const first=seed.products.find(p=>p.categorySlug==='normal-frames');
export const flag=seed.products.find(p=>p.categorySlug==='flags');
export const trackedSku=first.variants[0].sku;
export const artLine={kind:'product',slug:first.slug,variantSku:trackedSku,quantity:1};
export const flagLine={kind:'product',slug:flag.slug,variantSku:flag.variants[0].sku,quantity:1};
export const fixtureBundle={kind:'bundle',slug:'fixture-bundle',quantity:1};
export const address={name:'Fixture buyer',email:'buyer@example.invalid',phone:'01012345678',governorate:'cairo',address:'Fixture street address'};
export const tinyPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5ckAAAAASUVORK5CYII=','base64');
export const models=[Category,Product,Bundle,Discount,User,Order,Session,PrivateAsset,PaymentReference,Notification];

export async function startFixture({origin,full=false}={}){
  Object.assign(process.env,{
    NODE_ENV:'test',EMAIL_ENABLED:'false',STORAGE_DRIVER:'local',CHECKOUT_ENABLED:'true',LOCAL_PRIVATE_UPLOADS:'true',CHECKOUT_QUOTE_SECRET:'fixture-only-stable-quote-secret-32-bytes',
    CLIENT_ORIGIN:origin||'http://127.0.0.1:55173'
  });
  const repl=await MongoMemoryReplSet.create({binary:{version:'8.2.6'},replSet:{count:1}});
  try {
    await mongoose.connect(repl.getUri('gallermo_fixture'));
    await Promise.all(models.map(model=>model.init()));
    await Category.collection.insertMany(seed.categories);
    await Category.updateOne({slug:'normal-frames'},{$set:{requiresPrepayment:true,customizationEnabled:true}});
    const products=full?seed.products:seed.products.slice(0,12).concat(flag);
    await Product.insertMany(products.map(p=>p.slug===first.slug?{
      ...p,
      ...(full?{description:{en:'Illustrative description for the local browser fixture.',ar:'وصف توضيحي لبيانات الاختبار المحلية.'}}:{}),
      variants:p.variants.map((v,i)=>i===0?{...v,stock:12}:v)
    }:p));
    await Product.create({slug:'hidden-fixture',name:{en:'Hidden'},categorySlug:'acrylic-coasters',published:true,
      variants:[{sku:'hidden-v',label:'Standard',priceEGP:1}]});
    await Bundle.create({slug:fixtureBundle.slug,name:{en:'Fixture bundle',ar:'باقة تجريبية'},priceEGP:400,published:true,
      items:[{productSlug:first.slug,variantSku:trackedSku,quantity:2}]});
    await Discount.create({code:'FIXTURE10',kind:'percent',amount:10,enabled:true,maxUses:1});
    await User.create({email:adminEmail,name:'Fixture admin',role:'admin',passwordHash:await hashPassword(testPassword)});
    return async()=>{await mongoose.disconnect();await repl.stop();};
  } catch(error){await mongoose.disconnect();await repl.stop();throw error;}
}
