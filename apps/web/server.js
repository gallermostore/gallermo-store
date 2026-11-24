import express from 'express';
import {createProxyMiddleware} from 'http-proxy-middleware';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import 'dotenv/config';
const root=path.dirname(fileURLToPath(import.meta.url));
const isProd=process.env.NODE_ENV==='production';
const api=process.env.API_INTERNAL_URL||'http://localhost:4000';
const site=(process.env.PUBLIC_SITE_URL||'http://localhost:5173').replace(/\/$/,'');
const app=express();
app.disable('x-powered-by');
app.use(createProxyMiddleware({pathFilter:'/api',target:api,changeOrigin:true}));
let vite;
if(!isProd){
 const {createServer}=await import('vite');
 vite=await createServer({root,server:{middlewareMode:true},appType:'custom'});
 app.use(vite.middlewares);
}else{
 app.use(express.static(path.join(root,'dist/client'),{index:false,maxAge:'1d',setHeaders:(res,filepath)=>{if(/\/assets\//.test(filepath)||/\/catalog\//.test(filepath))res.setHeader('Cache-Control','public,max-age=31536000,immutable')}}));
}
const xmlEscape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
async function getJson(route,defaultValue){try{const response=await fetch(api+route,{signal:AbortSignal.timeout(5000)});return response.ok?await response.json():defaultValue}catch{return defaultValue}}
app.get('/robots.txt',(req,res)=>{
 const locked=site.includes('localhost')||process.env.NO_INDEX==='true';
 res.type('text/plain').send(locked?'User-agent: *\nDisallow: /\n':`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /cart\nDisallow: /checkout\nDisallow: /login\nDisallow: /register\nSitemap: ${site}/sitemap.xml\n`)
});
app.get('/sitemap.xml',async(req,res)=>{
 if(site.includes('localhost')||process.env.NO_INDEX==='true')return res.status(404).end();
 const cats=await getJson('/api/categories',[]);
 const items=[];
 for(let page=1;page<=100;page++){
  const data=await getJson(`/api/products?page=${page}&limit=24`,{items:[]});
  items.push(...data.items);
  if(!data.items.length||items.length>=data.total)break;
 }
 const pages=['/','/shop',...cats.map(c=>'/shop?category='+encodeURIComponent(c.slug)),...items.map(p=>'/product/'+encodeURIComponent(p.slug))];
 res.type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+pages.map(p=>'<url><loc>'+xmlEscape(site+p)+'</loc></url>').join('')+'</urlset>');
});
app.get('*',async(req,res,next)=>{
 try{
  const url=req.originalUrl;
  const pathname=url.split('?')[0];
  const params=new URLSearchParams(url.split('?')[1]||'');
  const [categories,bundles,bestsellers,config,products,product,bundle]=await Promise.all([
   getJson('/api/categories',[]),getJson('/api/bundles',[]),getJson('/api/bestsellers',[]),getJson('/api/config',{checkoutEnabled:false,currency:'EGP',instapayNumber:'+201149504797'}),
   getJson(`/api/products?page=${Number(params.get('page')||1)}&limit=12${pathname==='/'?'&sort=featured':''}${params.get('category')?'&category='+encodeURIComponent(params.get('category')):''}${params.get('q')?'&q='+encodeURIComponent(params.get('q')):''}`,{items:[],total:0,page:1,limit:12}),
   pathname.startsWith('/product/')?getJson('/api/products/'+encodeURIComponent(decodeURIComponent(pathname.slice(9))),null):null,
   pathname.startsWith('/bundle/')?getJson('/api/bundles/'+encodeURIComponent(decodeURIComponent(pathname.slice(8))),null):null
  ]);
  const data={categories,bundles,bestsellers,config,products,product,bundle};
  let template=isProd?await fs.readFile(path.join(root,'dist/client/index.html'),'utf8'):await fs.readFile(path.join(root,'index.html'),'utf8');
  if(vite)template=await vite.transformIndexHtml(url,template);
  const render=isProd?(await import('./dist/server/entry-server.js')).render:(await vite.ssrLoadModule('/src/entry-server.jsx')).render;
  const html=render(url,data);
  const title=(product||bundle)?`${(product||bundle).name.en} | Gallermo Store`:pathname==='/shop'?'Shop | Gallermo Store':'Gallermo Store | It’s Not Over Yet';
  const description=(product?.description?.en||bundle?.description?.en||'Explore expressive wall art, neon frames, laptop sleeves and creative accessories at Gallermo Store.').replace(/<[^>]+>/g,'').slice(0,155);
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const privateRoute=/^\/(admin|account|login|register|cart|checkout|track-order)(\/|$)/.test(pathname);
  const canonical=site+pathname+(pathname==='/shop'&&params.get('category')?'?category='+encodeURIComponent(params.get('category')):'');
  const noindex=privateRoute||site.includes('localhost')||process.env.NO_INDEX==='true';
  let structured='';
  if(product&&product.images?.[0]&&!noindex&&config.checkoutEnabled){
   const p=product;
   const info={'@context':'https://schema.org','@type':'Product',name:p.name.en,description:p.description?.en||p.name.en,image:p.images.map(im=>site+im.url),sku:p.variants?.[0]?.sku,brand:{'@type':'Brand',name:'Gallermo Store'},offers:{'@type':'Offer',url:canonical,priceCurrency:'EGP',price:p.variants?.[0]?.priceEGP,availability:p.variants?.[0]?.stock===0?'https://schema.org/OutOfStock':'https://schema.org/InStock'}};
   structured='<script type="application/ld+json">'+JSON.stringify(info).replace(/</g,'\\u003c')+'</script>';
  }
  const head=`<title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="${noindex?'noindex,nofollow':'index,follow'}"><link rel="canonical" href="${esc(canonical)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="${product?'product':'website'}">${structured}`;
  template=template.replace('<!--dynamic-head-->',head).replace('<!--ssr-outlet-->',()=>html).replace('<!--initial-data-->',()=>`<script>window.__GALLERMO_INITIAL__=${JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')}</script>`);
  res.status(pathname.startsWith('/product/')&&!product||pathname.startsWith('/bundle/')&&!bundle?404:200).set({'Content-Type':'text/html; charset=utf-8','Cache-Control':'private,no-cache'}).end(template);
 }catch(error){vite?.ssrFixStacktrace(error);next(error)}
});
app.listen(Number(process.env.PORT||5173),()=>console.log(`Gallermo Web http://localhost:${process.env.PORT||5173}`));
