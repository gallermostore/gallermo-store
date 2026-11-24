import express from 'express';
import {createProxyMiddleware} from 'http-proxy-middleware';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import 'dotenv/config';
import {catalogQuery} from './src/catalog-query.js';
import {readPreferences} from './src/preferences.js';
import {productStructuredData} from './src/product-metadata.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const api = process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000';
const site = (process.env.PUBLIC_SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
const staging = /^(localhost|127\.0\.0\.1)$/.test(new URL(site).hostname) || process.env.NO_INDEX === 'true';
const assetExists = async file => fs.access(path.join(root, isProd ? 'dist/client' : 'public', file)).then(() => true, () => false);
const [hero, chart] = await Promise.all([assetExists('hero/gallermo-hero.webp'), assetExists('size-charts/frames-sizechart.webp')]);
const app = express();
app.disable('x-powered-by');
app.use((_req,res,next)=>{
  res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});
  if (isProd) res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  next();
});
app.use(createProxyMiddleware({
  pathFilter: pathname => pathname === '/api' || pathname.startsWith('/api/'),
  target: api, changeOrigin: true, proxyTimeout: 8000, timeout: 10000,
  on: {
    error(error, req, res) {
      console.error('[proxy]', req.method, req.url.split('/')[2]?.split('?')[0] || 'api', error.code || error.name);
      if (!res.headersSent) res.writeHead(503, {'Content-Type':'application/json','Cache-Control':'no-store'});
      res.end(JSON.stringify({code:'API_UNAVAILABLE',error:'The store service is temporarily unavailable'}));
    }
  }
}));
let vite;
if (!isProd) {
  const {createServer} = await import('vite');
  vite = await createServer({root,configLoader:'runner',server:{middlewareMode:true,hmr:{port:Number(process.env.GALLERMO_HMR_PORT||24678)}},appType:'custom'});
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(root,'dist/client'),{index:false,maxAge:'1d',setHeaders(res,file){
    if (/[\\/](assets|catalog)[\\/]/.test(file)) res.setHeader('Cache-Control','public,max-age=31536000,immutable');
  }}));
}
const escape = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]);
const safeJSON = value => JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
async function getJson(route) {
  try {
    const response = await fetch(api + route, {signal:AbortSignal.timeout(4500)});
    const body = await response.json();
    return response.ok ? {value:body,status:200} : {status:response.status,error:body.error || 'Request failed'};
  } catch {
    return {status:503,error:'The store service is temporarily unavailable'};
  }
}
app.get('/robots.txt',(_req,res)=>res.type('text/plain').send(staging ? 'User-agent: *\nDisallow: /\n' :
  `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /cart\nDisallow: /checkout\nSitemap: ${site}/sitemap.xml\n`));
app.get('/sitemap.xml',async(_req,res)=>{
  if (staging) return res.sendStatus(404);
  const categories = await getJson('/api/categories');
  if (!categories.value) return res.sendStatus(503);
  const pages = ['/','/shop','/contact',...categories.value.map(c=>'/shop?category='+encodeURIComponent(c.slug))];
  for (let page=1;page<=500;page++) {
    const {value} = await getJson(`/api/products?page=${page}&limit=24`);
    if (!value) return res.sendStatus(503);
    pages.push(...value.items.map(p=>'/product/'+encodeURIComponent(p.slug)));
    if (page * value.limit >= value.total) break;
  }
  res.type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+pages.map(p=>'<url><loc>'+escape(site+p)+'</loc></url>').join('')+'</urlset>');
});
app.get('*',async(req,res,next)=>{
  try {
    const url = req.originalUrl;
    const pathname = req.path.replace(/\/+$/,'') || '/';
    const params = new URLSearchParams(url.split('?').slice(1).join('?'));
    const productPath = /^\/product\/[^/]+\/?$/.test(pathname);
    const bundlePath = /^\/bundle\/[^/]+\/?$/.test(pathname);
    const home = pathname === '/';
    const shop = pathname === '/shop';
    const shopQuery = catalogQuery(params);
    const [categories,bundles,bestsellers,config,products,detail] = await Promise.all([
      getJson('/api/categories'),
      home ? getJson('/api/bundles') : {},
      home ? getJson('/api/bestsellers') : {},
      getJson('/api/config'),
      shop ? getJson('/api/products?'+shopQuery) : home ? getJson('/api/products?limit=16&availability=in_stock') : {},
      productPath ? getJson('/api/products/'+pathname.split('/')[2]) : bundlePath ? getJson('/api/bundles/'+pathname.split('/')[2]) : {}
    ]);
    const product = productPath ? detail.value : null;
    const bundle = bundlePath ? detail.value : null;
    const related = product ? await getJson('/api/products/'+encodeURIComponent(product.slug)+'/related') : {};
    const data = {home,staging,categories:categories.value || [],bundles:bundles.value || [],bestsellers:bestsellers.value || [],
      config:config.value || {checkoutEnabled:false,currency:'EGP'},products:products.value,product,bundle,related:related.value || [],
      detailSlug:productPath||bundlePath?decodeURIComponent(pathname.split('/')[2]):null,detailStatus:detail.status, productsStatus:products.status,productsError:products.error,shopQuery:shop ? shopQuery : null,
      homeError:home && (products.error || categories.error),preferences:readPreferences(req.headers.cookie),hero,chart};
    let template = await fs.readFile(path.join(root,isProd?'dist/client/index.html':'index.html'),'utf8');
    if (vite) template = await vite.transformIndexHtml(url,template);
    const {render} = isProd ? await import('./dist/server/entry-server.js') : await vite.ssrLoadModule('/src/entry-server.jsx');
    const {lang,theme} = data.preferences;
    const category = (categories.value || []).find(c=>c.slug===params.get('category'));
    const displayedName=entry=>entry.name[lang]||entry.name.en;
    const title = product || bundle ? displayedName(product || bundle)+' | Gallermo Store' :
      shop ? (category ? displayedName(category) : lang === 'ar' ? 'تسوق' : 'Shop')+' | Gallermo Store' : "Gallermo Store | It's Not Over Yet";
    const description = ((product || bundle)?.description?.[lang] ||
      (lang === 'ar' ? 'اكتشف اللوحات والإطارات والإكسسوارات الإبداعية من جاليرمو.' : 'Explore wall art, neon frames, laptop sleeves and accessories at Gallermo Store.')).replace(/<[^>]+>/g,'').slice(0,155);
    const canonical = site+pathname+(shop && category ? '?category='+encodeURIComponent(category.slug) : '');
    const known = home || shop || productPath || bundlePath || /^\/(cart|checkout|track-order|account\/orders|login|register|admin|contact|information\/(privacy|returns|shipping|terms)|order-confirmed\/[^/]+)$/.test(pathname);
    const upstreamStatus = detail.status || (shop ? products.status : data.homeError ? 503 : 200);
    const status = !known ? 404 : upstreamStatus >= 500 ? 503 : upstreamStatus || 200;
    const noindex = staging || status !== 200 || /^\/(admin|account|login|register|cart|checkout|track-order|order-confirmed|information)(\/|$)/.test(pathname)
      || (shop && [...params.keys()].some(key=>key !== 'category')) || (shop && params.has('category') && !category);
    const structured=product&&!noindex?productStructuredData({
      product,name:displayedName(product),description,canonical,checkoutEnabled:config.value?.checkoutEnabled
    }):null;
    const head = (data.preferences.missing.length ? '<script src="/preferences-bootstrap.js"></script>' : '') + `<title>${escape(title.replaceAll('—',' - '))}</title><meta name="description" content="${escape(description.replaceAll('—',' - '))}"><meta name="robots" content="${noindex?'noindex,nofollow':'index,follow'}"><link rel="canonical" href="${escape(canonical)}"><meta property="og:title" content="${escape(title.replaceAll('—',' - '))}"><meta property="og:type" content="${product?'product':'website'}">`;
    const markup = render(url,data);
    const schema = structured ? '<script type="application/ld+json" id="product-schema">'+safeJSON(structured)+'</script>' : '';
    template = template.replace('<html lang="en">',`<html lang="${lang}" dir="${lang==='ar'?'rtl':'ltr'}" data-theme="${theme}">`)
      .replace('<!--dynamic-head-->',()=>head+schema).replace('<!--ssr-outlet-->',()=>markup)
      .replace('<!--initial-data-->',()=>`<script type="application/json" id="initial-data">${safeJSON(data)}</script>`);
    res.status(status).set({'Content-Type':'text/html; charset=utf-8','Cache-Control':'private,no-store','Vary':'Cookie'}).end(template);
  } catch(error) {
    vite?.ssrFixStacktrace(error);
    next(error);
  }
});
app.use((error,req,res,_next)=>{
  console.error('[web]',req.method,req.path,error.name);
  if(res.headersSent)return res.end();
  res.status(error instanceof URIError?400:500).type('text/plain').send('The store could not load this page.');
});
app.listen(Number(process.env.PORT||5173),()=>console.log('Gallermo Web listening on port '+String(process.env.PORT||5173)));
