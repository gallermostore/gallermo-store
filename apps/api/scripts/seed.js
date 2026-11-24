import 'dotenv/config';
import mongoose from 'mongoose';
import {readFile} from 'node:fs/promises';
import {Product,Category} from '../src/models.js';
const uri=process.env.MONGODB_URI;
if(!uri)throw new Error('MONGODB_URI missing');
await mongoose.connect(uri);
const data=JSON.parse(await readFile(new URL('../../../data/catalog.seed.json',import.meta.url),'utf8'));
let categories=0,products=0;
for(const c of data.categories){const r=await Category.updateOne({slug:c.slug},{$setOnInsert:c},{upsert:true});if(r.upsertedCount)categories++}
for(const p of data.products){const r=await Product.updateOne({slug:p.slug},{$setOnInsert:p},{upsert:true});if(r.upsertedCount)products++}
console.log(`Seed complete. Added ${categories} categories and ${products} products. Existing admin edits retained.`);
await mongoose.disconnect();
