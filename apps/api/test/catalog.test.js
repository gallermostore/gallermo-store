import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../../../data/catalog.seed.json',import.meta.url),'utf8'));
const root=new URL('../../web/public/',import.meta.url);
test('336 distinct catalog design images across 7 publishable image categories',()=>{
 assert.equal(data.products.length,336);
 assert.equal(new Set(data.products.map(p=>p.slug)).size,336);
 assert.equal(data.categories.filter(c=>c.published).length,7);
});
test('each imported product has an image and an accurate positive variant price',()=>{
 for(const item of data.products){
  assert.ok(item.images.length>0,item.slug);
  assert.ok(item.variants.length>0,item.slug);
  assert.ok(item.variants.every(v=>Number.isInteger(v.priceEGP)&&v.priceEGP>0),item.slug);
  assert.ok(existsSync(new URL('.'+item.images[0].url,root)),item.slug);
 }
});
test('no fake bundles, discounts or coasters are imported',()=>{
 assert.equal(data.bundles.length,0);
 assert.equal(data.discountCodes.length,0);
 assert.equal(data.products.filter(p=>p.categorySlug==='acrylic-coasters').length,0);
});
test('every supplied price group has the expected price options',()=>{
 const expected={'normal-frames':[250,350,560,740,850,1020],'anime-neon-art':[2800,3250,3820,4120,4530],
 'supercar-neon-frames':[675,825,980,1190],'canvas-prints':[600,900,1100,1300,1500,1600,1800,2200,2600],
 'laptop-sleeves':[500,500,600,600,600],'mouse-pads':[250],'flags':[450,600]};
 for(const [key,prices] of Object.entries(expected)){
  const p=data.products.find(x=>x.categorySlug===key);
  assert.deepEqual(p.variants.map(v=>v.priceEGP),prices,key);
 }
 assert.deepEqual(data.products.find(x=>x.categorySlug==='laptop-sleeves').addons.map(x=>x.priceEGP),[100]);
});
