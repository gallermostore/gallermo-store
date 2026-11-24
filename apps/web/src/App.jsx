import React,{createContext,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {Link,NavLink,Route,Routes,useLocation,useNavigate} from 'react-router-dom';
import {ShoppingBag,Search,Sun,Moon,Languages,ChevronDown,UserRound,ArrowRight,Instagram} from 'lucide-react';
import {strings} from './i18n/strings.js';
import StaggeredMenu from './components/StaggeredMenu.jsx';
import {Home,Shop,ProductPage,BundlePage,CartPage,CheckoutPage,OrderThankYou,TrackPage,MyOrdersPage,AuthPage,AdminPage,NotFound} from './pages/Pages.jsx';
export const Store=createContext(null);
export const useStore=()=>useContext(Store);
export async function api(path,options={}){
 const result=await fetch('/api'+path,{credentials:'same-origin',headers:{'Content-Type':'application/json',...options.headers},...options});
 const json=await result.json().catch(()=>({}));
 if(!result.ok)throw new Error(json.error||'Request failed');
 return json;
}
export const money=(n)=>new Intl.NumberFormat('en-EG',{style:'currency',currency:'EGP',maximumFractionDigits:0}).format(n||0);
export const label=(obj,lang)=>obj?.[lang]||obj?.en||'';
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
   {x:(to.left-from.left)*.2-36,y:(to.top-from.top)*.25-34,rotation:-16,scale:1.1},
   {x:(to.left-from.left)*.45+34,y:(to.top-from.top)*.48+15,rotation:16,scale:.8},
   {x:(to.left-from.left)*.7-20,y:(to.top-from.top)*.72-22,rotation:-8,scale:.54},
   {x:to.left-from.left,y:to.top-from.top,rotation:0,scale:.1,opacity:0}
  ],onComplete:()=>img.remove()});
 }).catch(()=>img.remove());
}
export function ProductCard({p}){
 const {lang,t,add}=useStore();
 const [variant,setVariant]=useState(p.variants?.[0]?.sku||'');
 const choice=p.variants?.find(v=>v.sku===variant)||p.variants?.[0];
 return <article className="product-card">
  <Link to={'/product/'+p.slug} className="product-visual"><img src={p.images?.[0]?.url} alt={p.images?.[0]?.alt||label(p.name,lang)} loading="lazy" decoding="async" width="400" height="400"/><span className="view-hint">{lang==='ar'?'التفاصيل':'Explore design'} <ArrowRight size={15}/></span></Link>
  <div className="product-info"><Link to={'/product/'+p.slug} className="product-title">{label(p.name,lang)}</Link><div className="price">{money(choice?.priceEGP)}</div>
   {p.variants?.length>1&&<label className="card-variant">{t.size}<select value={variant} onChange={e=>setVariant(e.target.value)}>{p.variants.map(v=><option value={v.sku} key={v.sku}>{v.label} — {money(v.priceEGP)}</option>)}</select></label>}
   <button className="add-btn" disabled={!choice||choice.stock===0} type="button" onClick={e=>{FlyToCart(e);add({kind:'product',slug:p.slug,variantSku:choice.sku,quantity:1,addons:[],title:label(p.name,lang),image:p.images?.[0]?.url,unitPriceEGP:choice.priceEGP})}}>{t.add}<ShoppingBag size={16}/></button>
  </div>
 </article>
}
export default function App({initial={}}){
 const [lang,setLang]=useState('en');const [theme,setTheme]=useState('light');
 const [user,setUser]=useState(null);const [sessionReady,setSessionReady]=useState(false);
 const [cart,setCart]=useState([]);const [cartReady,setCartReady]=useState(false);
 const [config,setConfig]=useState(initial.config||{});
 const loc=useLocation();const navigate=useNavigate();const t=strings[lang];
 useEffect(()=>{
  const savedLang=localStorage.getItem('gallermo:lang');const savedTheme=localStorage.getItem('gallermo:theme');
  if(savedLang==='ar')setLang('ar');if(savedTheme==='dark')setTheme('dark');
  try{setCart(JSON.parse(localStorage.getItem(cartKey)||'[]'))}catch{setCart([])}
  setCartReady(true);
  api('/auth/me').then(v=>setUser(v.user)).catch(()=>{}).finally(()=>setSessionReady(true));
  api('/config').then(setConfig).catch(()=>{});
 },[]);
 useEffect(()=>{document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';localStorage.setItem('gallermo:lang',lang)},[lang]);
 useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem('gallermo:theme',theme)},[theme]);
 useEffect(()=>{if(cartReady)localStorage.setItem(cartKey,JSON.stringify(cart))},[cart,cartReady]);
 useEffect(()=>{window.scrollTo({top:0,behavior:'instant'})},[loc.pathname]);
 const add=(item)=>setCart(old=>{const index=old.findIndex(i=>i.kind===item.kind&&i.slug===item.slug&&i.variantSku===item.variantSku&&JSON.stringify(i.addons)===JSON.stringify(item.addons));if(index<0)return [...old,item];return old.map((x,j)=>j===index?{...x,quantity:Math.min(10,x.quantity+item.quantity)}:x)});
 const remove=(index)=>setCart(old=>old.filter((_,j)=>j!==index));
 const updateQty=(index,qty)=>setCart(old=>old.map((x,j)=>j===index?{...x,quantity:Math.min(10,Math.max(1,qty))}:x));
 const count=cart.reduce((sum,x)=>sum+x.quantity,0);
 const links=[{to:'/',label:t.home},{to:'/shop',label:t.shop},...(user?.role==='admin'?[{to:'/admin',label:t.admin}]:user?.role==='customer'?[{to:'/account/orders',label:t.orders}]:[{to:'/track-order',label:t.track}])];
 const value=useMemo(()=>({initial,lang,t,theme,user,setUser,sessionReady,cart,add,remove,updateQty,setCart,config}),[initial,lang,theme,user,sessionReady,cart,config]);
 const closeSession=async()=>{try{await api('/auth/logout',{method:'POST'})}catch{}setUser(null);navigate('/')};
 return <Store.Provider value={value}>
  <a className="skip-link" href="#main">{lang==='ar'?'تخطي إلى المحتوى':'Skip to content'}</a>
  <header className="site-header">
   <div className="header-inner">
    <Link className="brand" to="/" aria-label="Gallermo Store home"><img src="/gallermo-logo.webp" alt="" width="45" height="45"/><span>GALLERMO<small>STORE</small></span></Link>
    <nav className="desktop-nav" aria-label="Main navigation">
      <NavLink to="/" end>{t.home}</NavLink><NavLink to="/shop">{t.shop}</NavLink>
      <div className="categories-dropdown"><button type="button" aria-label={t.categories} aria-haspopup="true">{t.categories}<ChevronDown size={15}/></button><div className="categories-menu">{(initial.categories||[]).map(c=><Link key={c.slug} to={'/shop?category='+c.slug}>{label(c.name,lang)}</Link>)}</div></div>
      {user?.role==='admin'?<NavLink to="/admin">{t.admin}</NavLink>:user?.role==='customer'?<NavLink to="/account/orders">{t.orders}</NavLink>:<NavLink to="/track-order">{t.track}</NavLink>}
    </nav>
    <div className="header-actions">
     <button type="button" className="icon-button" onClick={()=>setLang(x=>x==='en'?'ar':'en')} aria-label={t.language} title={t.language}><Languages size={19}/></button>
     <button type="button" className="icon-button" onClick={()=>setTheme(x=>x==='light'?'dark':'light')} aria-label={theme==='light'?t.dark:t.light} title={theme==='light'?t.dark:t.light}>{theme==='light'?<Moon size={19}/>:<Sun size={19}/>}</button>
     {user?<button type="button" className="icon-button auth-icon" onClick={closeSession} aria-label={t.logout} title={t.logout}><UserRound size={19}/></button>:<Link className="icon-button auth-icon" to="/login" aria-label={t.signIn} title={t.signIn}><UserRound size={19}/></Link>}
     <Link className="icon-button nav-cart" to="/cart" aria-label={`${t.cart}: ${count}`}><ShoppingBag size={20} id="nav-cart-icon"/>{count>0&&<span className="cart-count">{count}</span>}</Link>
     <StaggeredMenu links={[...links,{to:'/cart',label:t.cart},...(!user?[{to:'/login',label:t.signIn}]:[])]} lang={lang} label={lang==='ar'?'القائمة':'Menu'} categoryLabel={t.categories} categoryLinks={(initial.categories||[]).filter(c=>c.published).map(c=>({to:'/shop?category='+c.slug,label:label(c.name,lang)}))}/>
    </div>
   </div>
  </header>
  <main id="main"><Routes>
    <Route path="/" element={<Home/>}/><Route path="/shop" element={<Shop/>}/><Route path="/product/:slug" element={<ProductPage/>}/>
    <Route path="/bundle/:slug" element={<BundlePage/>}/><Route path="/cart" element={<CartPage/>}/><Route path="/checkout" element={<CheckoutPage/>}/><Route path="/order-confirmed/:number" element={<OrderThankYou/>}/>
    <Route path="/track-order" element={<TrackPage/>}/><Route path="/account/orders" element={<MyOrdersPage/>}/>
    <Route path="/login" element={<AuthPage mode="login"/>}/><Route path="/register" element={<AuthPage mode="register"/>}/>
    <Route path="/admin" element={<AdminPage/>}/><Route path="*" element={<NotFound/>}/>
   </Routes></main>
  <footer className="footer"><div className="container footer-grid"><div><Link to="/" className="footer-logo">GALLERMO <span>STORE</span></Link><p>{t.footerText}</p><p className="fine-print">© {new Date().getFullYear()} Gallermo Store</p></div><div><strong>{t.shop}</strong><Link to="/shop">{t.all}</Link>{(initial.categories||[]).slice(0,4).map(c=><Link key={c.slug} to={'/shop?category='+c.slug}>{label(c.name,lang)}</Link>)}</div><div><strong>{t.orders}</strong>{user?.role==='customer'?<Link to="/account/orders">{t.myOrders}</Link>:user?.role==='admin'?<Link to="/admin">{t.adminConsole}</Link>:<Link to="/track-order">{t.guestTrack}</Link>}<Link to="/cart">{t.cart}</Link><p>It's not over yet.</p></div></div></footer>
 </Store.Provider>;
}
