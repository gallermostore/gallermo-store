import React,{createContext,lazy,Suspense,useContext,useEffect,useRef,useState} from 'react';
import {Link,NavLink,Route,Routes,useLocation,useNavigate,useNavigationType} from 'react-router-dom';
import {ShoppingBag,Sun,Moon,Languages,ChevronDown,UserRound,X} from 'lucide-react';
import {strings} from './i18n/strings.js';
import {savePreference} from './preferences.js';
import {Footer,Information} from './components/Information.jsx';
import {StoreImage,RetryState,LoadingState} from './components/LoadingState.jsx';
import {variantLabel} from './sizes.js';
import {Announcement} from './components/HomeHighlights.jsx';
import StaggeredMenu from './components/StaggeredMenu.jsx';
import {Home,Shop,ProductPage,BundlePage,CartPage,CheckoutPage,OrderThankYou,TrackPage,MyOrdersPage,AuthPage,NotFound} from './pages/Pages.jsx';
export const Store=createContext(null);
export const useStore=()=>useContext(Store);
export async function api(path,options={}){
 const {headers,signal,...request}=options;
 const deadline=AbortSignal.timeout(12000);
 const result=await fetch('/api'+path,{...request,credentials:'same-origin',signal:signal?AbortSignal.any([signal,deadline]):deadline,headers:{
  ...(typeof request.body==='string'?{'Content-Type':'application/json'}:{}),...headers
 }});
 const json=result.headers.get('content-type')?.includes('application/json')?await result.json().catch(()=>null):null;
 if(!result.ok||json===null)throw Object.assign(new Error(json?.error||'The store service is temporarily unavailable'),{status:result.status,code:json?.code});
 return json;
}
export const money=(n,lang='en')=>new Intl.NumberFormat(lang==='ar'?'ar-EG':'en-EG',{style:'currency',currency:'EGP',minimumFractionDigits:0,maximumFractionDigits:2}).format(n??0);
export const label=(obj,lang)=>(obj?.[lang]||obj?.en||'').replaceAll('—',' - ');
const AdminPage=lazy(()=>import('./pages/AdminPage.jsx'));
function AdminRoute(){
 const {lang,t,user,sessionReady,sessionError,loadSession}=useStore();
 const loading=<LoadingState label={lang==='ar'?'جارٍ التحميل':'Loading administration'}/>;
 if(!sessionReady)return <div className="container page-shell">{sessionError?<RetryState lang={lang} onRetry={()=>loadSession()}/>:loading}</div>;
 if(user?.role!=='admin')return <div className="container page-shell"><h1>{lang==='ar'?'صفحة مخصصة للإدارة':'Restricted admin area'}</h1><Link to="/login" className="button-primary">{t.signIn}</Link></div>;
 return <Suspense fallback={<div className="container page-shell">{loading}</div>}><AdminPage/></Suspense>;
}
const cartKey='gallermo:cart-v1';
export function FlyToCart(ev){
 if(typeof window==='undefined'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const origin=ev?.currentTarget?.closest('.product-card,.product-detail,.bundle-card')?.querySelector('img');
 const target=document.getElementById('nav-cart-icon');if(!origin||!target)return;
 const from=origin.getBoundingClientRect(),to=target.getBoundingClientRect();
 const img=origin.cloneNode();img.className='flying-cart-image';img.style.cssText=`left:${from.left+from.width/2-26}px;top:${from.top+from.height/2-26}px;`;
 document.body.appendChild(img);
 import('gsap').then(({gsap})=>{
  gsap.to(img,{duration:.9,ease:'power2.inOut',keyframes:[
   {x:(to.left+to.width/2-from.left-from.width/2)*.2-36,y:(to.top+to.height/2-from.top-from.height/2)*.25-34,rotation:-16,scale:1.1},
   {x:(to.left+to.width/2-from.left-from.width/2)*.45+34,y:(to.top+to.height/2-from.top-from.height/2)*.48+15,rotation:16,scale:.8},
   {x:(to.left+to.width/2-from.left-from.width/2)*.7-20,y:(to.top+to.height/2-from.top-from.height/2)*.72-22,rotation:-8,scale:.54},
   {x:to.left+to.width/2-from.left-from.width/2,y:to.top+to.height/2-from.top-from.height/2,rotation:0,scale:.1,opacity:0}
  ],onComplete:()=>img.remove(),onInterrupt:()=>img.remove()});
 }).catch(()=>img.remove());
}
export function ProductCard({p}){
 const {lang,t,add}=useStore();
 const [variant,setVariant]=useState(p.displayVariantSku||p.variants?.find(v=>v.stock!==0)?.sku||p.variants?.[0]?.sku||'');
 const choice=p.variants?.find(v=>v.sku===variant)||p.variants?.[0];
 return <article className="product-card">
  <Link to={'/product/'+p.slug} className="product-visual"><StoreImage src={p.images?.[0]?.url} alt={lang==='ar'?label(p.name,lang):p.images?.[0]?.alt||label(p.name,lang)} loading="lazy" decoding="async" width="400" height="400"/></Link>
  <div className="product-info">
   <Link to={'/product/'+p.slug} className="product-title">{label(p.name,lang)}</Link>
   <div className="price">{money(choice?.priceEGP,lang)}</div>
   <div className="card-choice">{p.variants?.length>1&&<label className="card-variant">{lang==='ar'?'اختر المقاس':'Choose size'}<select value={variant} onChange={e=>setVariant(e.target.value)}>{p.variants.map(v=><option value={v.sku} key={v.sku} disabled={v.stock===0}>{variantLabel(v.label,lang,p.categorySlug)} - {money(v.priceEGP,lang)}</option>)}</select></label>}</div>
   <button className="add-btn" disabled={!choice||choice.stock===0} type="button" onClick={e=>{
    const accepted=add({kind:'product',slug:p.slug,variantSku:choice.sku,variantLabel:choice.label,categorySlug:p.categorySlug,stock:choice.stock,quantity:1,addons:[],title:label(p.name,lang),image:p.images?.[0]?.url,unitPriceEGP:choice.priceEGP});
    if(accepted)FlyToCart(e);
   }}>{choice?.stock===0?(lang==='ar'?'غير متاح':'Out of stock'):t.add}<ShoppingBag size={16}/></button>
  </div>
 </article>;
}
export default function App({initial={}}){
 const [lang,setLang]=useState(initial.preferences?.lang||'en');const [theme,setTheme]=useState(initial.preferences?.theme||'light');
 const [user,setUser]=useState(null);const [sessionReady,setSessionReady]=useState(false);const [sessionError,setSessionError]=useState(false);
 const [toast,setToast]=useState(null);
 const toastCounter=useRef(0);
 const notify=(en,ar,error=false)=>{
  const id=++toastCounter.current;
  setToast(previous=>previous?.en===en&&previous.ar===ar&&previous.error===error?previous:{en,ar,error,id});
 };
 useEffect(()=>{
  if(!toast)return;
  const timeout=setTimeout(()=>setToast(null),toast.error?9000:5600);
  return ()=>clearTimeout(timeout);
 },[toast]);
 const sessionVersion=useRef(0);
 const acceptUser=user=>{sessionVersion.current++;setUser(user);setSessionReady(true);setSessionError(false)};
 const [cart,setCart]=useState([]);const [cartReady,setCartReady]=useState(false);
 const cartRef=useRef([]);
 const [categories,setCategories]=useState(initial.categories||[]);
 const config=initial.config||{};
 const loc=useLocation();const navigate=useNavigate();const t=strings[lang];
 useEffect(()=>{
  const params=new URLSearchParams(loc.search);
  const category=categories.find(item=>item.slug===params.get('category'));
  const title=loc.pathname==='/shop'?(category?label(category.name,lang):t.shop):loc.pathname==='/cart'?t.cart:
   loc.pathname==='/checkout'?t.checkout:loc.pathname==='/track-order'?t.track:loc.pathname==='/account/orders'?t.orders:
   loc.pathname==='/admin'?t.admin:loc.pathname==='/login'?t.signIn:loc.pathname==='/register'?t.signUp:null;
  if(!/^\/(product|bundle)\//.test(loc.pathname))document.title=title?title+" | Gallermo Store":"Gallermo Store | It's Not Over Yet";
  const canonical=document.querySelector('link[rel=canonical]');
  if(!canonical)return;
  const isShop=loc.pathname==='/shop';
  const detail=/^\/(product|bundle)\//.test(loc.pathname);
  if(!detail){
   document.getElementById('product-schema')?.remove();
   const description=document.querySelector('meta[name=description]');
   if(description)description.content=t.tagline;
  }
  const url=new URL(canonical.href);
  url.pathname=loc.pathname;
  url.search=isShop&&category?new URLSearchParams({category:category.slug}).toString():'';
  canonical.href=url.href;
  const robots=document.querySelector('meta[name=robots]');
  if(robots)robots.content=initial.staging||!/^\/(?:$|shop$|contact$|product\/|bundle\/)/.test(loc.pathname)||detail&&initial.detailSlug===loc.pathname.split('/')[2]&&initial.detailStatus>=400||
   isShop&&[...params.keys()].some(key=>key!=='category')||isShop&&params.has('category')&&!category?'noindex,nofollow':'index,follow';
 },[loc.pathname,loc.search,lang,categories,t,initial.staging]);
 const loadSession=async signal=>{
  const version=++sessionVersion.current;
  setSessionError(false);
  try{const response=await api('/auth/me',{signal});if(version===sessionVersion.current)acceptUser(response.user);}
  catch(error){if(version===sessionVersion.current&&error.name!=='AbortError'){setSessionReady(false);setSessionError(true);}}
 };
 const refreshCategories=(signal)=>api('/categories',{signal}).then(setCategories);
 useEffect(()=>{
  try {
   const stored=JSON.parse(localStorage.getItem(cartKey)||'[]');
   if(Array.isArray(stored)){cartRef.current=stored;setCart(stored);}
  }catch{}
  setCartReady(true);
  const controller=new AbortController();
  void loadSession(controller.signal);
  return ()=>controller.abort();
 },[]);
 const changeLanguage=()=>{
  const value=lang==='en'?'ar':'en';
  savePreference('lang',value);
  document.documentElement.lang=value;
  document.documentElement.dir=value==='ar'?'rtl':'ltr';
  setLang(value);
 };
 const changeTheme=()=>{
  const value=theme==='light'?'dark':'light';
  savePreference('theme',value);
  document.documentElement.dataset.theme=value;
  setTheme(value);
 };
 useEffect(()=>{if(cartReady)try{localStorage.setItem(cartKey,JSON.stringify(cart));}catch{}},[cart,cartReady]);
 const navigationType=useNavigationType();
 useEffect(()=>{if(navigationType!=='POP')window.scrollTo({top:0,behavior:'instant'});},[loc.pathname,navigationType]);
 const commitCart=next=>{cartRef.current=next;setCart(next);};
 const add=item=>{
  const old=cartRef.current;
  const choices=(item.addons||[]).slice().sort().join(',');
  const index=old.findIndex(row=>row.kind===item.kind&&row.slug===item.slug&&row.variantSku===item.variantSku&&row.customizationId===item.customizationId&&(row.addons||[]).slice().sort().join(',')===choices);
  const quantity=(old[index]?.quantity||0)+item.quantity;
  const sameSku=old.filter(row=>row.slug===item.slug&&row.variantSku===item.variantSku).reduce((total,row)=>total+row.quantity,0);
  if(quantity>10||sameSku+item.quantity>(item.stock??Infinity)||index<0&&old.length>=30)return false;
  commitCart(index<0?[...old,item]:old.map((row,i)=>i===index?{...row,quantity}:row));
  return true;
 };
 const remove=index=>commitCart(cartRef.current.filter((_,i)=>i!==index));
 const quantityLimit=index=>{
  const row=cartRef.current[index];
  if(!row)return 0;
  const others=cartRef.current.reduce((total,item,i)=>total+(i!==index&&item.slug===row.slug&&item.variantSku===row.variantSku?item.quantity:0),0);
  return Math.min(10,(row.stock??Infinity)-others);
 };
 const updateQty=(index,quantity)=>{
  if(quantity>=1&&quantity<=quantityLimit(index))commitCart(cartRef.current.map((row,i)=>i===index?{...row,quantity}:row));
 };
 const replaceArtwork=(index,oldId,newId)=>{
  if(cartRef.current[index]?.customizationId!==oldId)return false;
  commitCart(cartRef.current.map((row,i)=>i===index?{...row,customizationId:newId}:row));
  return true;
 };
 const count=cart.reduce((sum,x)=>sum+x.quantity,0);
 const links=[{to:'/',label:t.home},{to:'/shop',label:t.shop},...(user?.role==='admin'?[{to:'/admin',label:t.admin}]:user?.role==='customer'?[{to:'/account/orders',label:t.orders}]:sessionReady?[{to:'/track-order',label:t.track}]:[])];
 const [logoutError,setLogoutError]=useState(false);
 const loggingOut=useRef(false);
 const value={initial,lang,t,theme,user,setUser:acceptUser,sessionReady,sessionError,loadSession,cart,cartReady,notify,add:item=>{
  const accepted=add(item);
  if(accepted)notify('Added to cart','تمت الإضافة إلى السلة');
  else notify('Cart quantity limit reached','تم بلوغ الحد المتاح في السلة',true);
  return accepted;
 },remove:index=>{remove(index);notify('Item removed','تم حذف المنتج');},updateQty,quantityLimit,replaceArtwork,setCart:commitCart,config,categories,refreshCategories};
 const closeSession=async()=>{
  if(loggingOut.current)return;
  loggingOut.current=true;
  try{
   await api('/auth/logout',{method:'POST'});
   acceptUser(null);setLogoutError(false);notify('Signed out','تم تسجيل الخروج');navigate('/');
  }catch{setLogoutError(true);notify('Could not sign out. Try again.','تعذّر تسجيل الخروج. حاول مرة تانية.',true);}
  finally{loggingOut.current=false;}
 };
 return <Store.Provider value={value}>
  <a className="skip-link" href="#main">{lang==='ar'?'تخطي إلى المحتوى':'Skip to content'}</a>
  <header className="site-header">
   <Announcement lang={lang}/>
   <div className="header-inner">
    <Link className="brand" to="/" aria-label={lang==='ar'?'جاليرمو، الرئيسية':'Gallermo Store home'}><img src="/gallermo-logo-small.webp" alt="" width="52" height="52"/></Link>
    <nav className="desktop-nav" aria-label={lang==='ar'?'التنقل الرئيسي':'Main navigation'}>
      <NavLink to="/" end>{t.home}</NavLink><NavLink to="/shop">{t.shop}</NavLink>
      <div className="categories-dropdown"><button type="button" aria-label={t.categories} aria-haspopup="true">{t.categories}<ChevronDown size={15}/></button><div className="categories-menu">{categories.map(c=><Link key={c.slug} to={'/shop?category='+c.slug}>{label(c.name,lang)}</Link>)}</div></div>
      {user?.role==='admin'?<NavLink to="/admin">{t.admin}</NavLink>:user?.role==='customer'?<NavLink to="/account/orders">{t.orders}</NavLink>:sessionReady?<NavLink to="/track-order">{t.track}</NavLink>:null}
    </nav>
    <div className="header-actions">
     <button type="button" className="icon-button" onClick={changeLanguage} aria-label={t.language} title={t.language}><Languages size={19}/></button>
     <button type="button" className="icon-button" onClick={changeTheme} aria-label={theme==='light'?t.dark:t.light} title={theme==='light'?t.dark:t.light}>{theme==='light'?<Moon size={19}/>:<Sun size={19}/>}</button>
     {user?<button type="button" className="icon-button auth-icon" onClick={closeSession} aria-label={t.logout} title={t.logout}><UserRound size={19}/></button>:sessionReady?<Link className="icon-button auth-icon" to="/login" aria-label={t.signIn} title={t.signIn}><UserRound size={19}/></Link>:null}
     <Link className="icon-button nav-cart" to="/cart" aria-label={`${t.cart}: ${count}`}><ShoppingBag size={20} id="nav-cart-icon"/>{count>0&&<span className="cart-count">{count}</span>}</Link>
     <StaggeredMenu links={links} signIn={!user&&sessionReady} lang={lang} t={t} onLogout={user?closeSession:null} categoryLabel={t.categories} categoryLinks={categories.map(c=>({to:'/shop?category='+c.slug,label:label(c.name,lang)}))}/>
    </div>
   </div>
  </header>
  {logoutError&&<RetryState lang={lang} onRetry={closeSession}/>}
  <main id="main"><Routes>
    <Route path="/" element={<Home/>}/><Route path="/shop" element={<Shop/>}/><Route path="/product/:slug" element={<ProductPage/>}/>
    <Route path="/bundle/:slug" element={<BundlePage/>}/><Route path="/cart" element={<CartPage/>}/><Route path="/checkout" element={<CheckoutPage/>}/><Route path="/order-confirmed/:number" element={<OrderThankYou/>}/>
    <Route path="/track-order" element={<TrackPage/>}/><Route path="/account/orders" element={<MyOrdersPage/>}/>
    <Route path="/login" element={<AuthPage mode="login"/>}/><Route path="/register" element={<AuthPage mode="register"/>}/>
    <Route path="/admin" element={<AdminRoute/>}/><Route path="/contact" element={<Information/>}/><Route path="/information/:page" element={<Information/>}/><Route path="*" element={<NotFound/>}/>
   </Routes></main>
  <Footer/>
  <div className="toast-stack">
    <div role="status" className="sr-only">{toast&&!toast.error&&(lang==='ar'?toast.ar:toast.en)}</div>
    <div role="alert" className="sr-only">{toast?.error&&(lang==='ar'?toast.ar:toast.en)}</div>
    {toast&&<div key={toast.id} className={'store-toast'+(toast.error?' toast-error':'')}>
      <p>{lang==='ar'?toast.ar:toast.en}</p>
      <button type="button" aria-label={lang==='ar'?'إغلاق الإشعار':'Dismiss notification'} onClick={()=>setToast(null)}><X size={17} aria-hidden="true"/></button>
    </div>}
  </div>
 </Store.Provider>;
}
