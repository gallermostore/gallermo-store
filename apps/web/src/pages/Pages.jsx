import React,{useEffect,useRef,useState} from 'react';
import {Link,useLocation,useNavigate,useParams} from 'react-router-dom';
import {ArrowRight,ChevronLeft,ChevronRight,CheckCircle2,Plus,Minus,Package,ShieldCheck,Sparkles,Trash2} from 'lucide-react';
import {ArtworkDialog} from '../components/Artwork.jsx';
import {Faq} from '../components/Information.jsx';
import {StoreImage,RetryState,LoadingState} from '../components/LoadingState.jsx';
import {variantLabel} from '../sizes.js';
import {orderStatus} from './AdminOrders.jsx';
import {orderError,ReplacePayment} from './Checkout.jsx';
export {CheckoutPage} from './Checkout.jsx';
export {Shop} from './Shop.jsx';
export {ProductPage} from './ProductPage.jsx';
import {api,label,money,ProductCard,FlyToCart,useStore} from '../App.jsx';
function Empty({text}){
 const {lang}=useStore();
 return <div className="empty-state"><Package size={35}/><p>{text}</p><Link to="/shop" className="button-primary">{lang==='ar'?'تصفح المنتجات':'Browse products'} <ArrowRight size={16}/></Link></div>;
}
const SectionTitle=({eyebrow,title,description})=><div className="section-heading">{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{description&&<p>{description}</p>}</div>;
function CategoryCarousel({items}){
 const {lang,t}=useStore();const ref=useRef(null);
 const [edges,setEdges]=useState([true,false]);
 const update=()=>{
  const list=ref.current;if(!list)return;
  const offset=Math.abs(list.scrollLeft);
  setEdges([offset<2,offset+list.clientWidth>=list.scrollWidth-2]);
 };
 useEffect(()=>{const observer=new ResizeObserver(update);if(ref.current)observer.observe(ref.current);update();return()=>observer.disconnect();},[lang,items.length]);
 const scroll=dir=>{
  const list=ref.current;
  const distance=list.firstElementChild?.getBoundingClientRect().width||250;
  list.scrollBy({left:dir*(lang==='ar'?-1:1)*(distance+16),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 };
 if(!items.length)return null;
 return <section className="section container"><div className="section-row"><SectionTitle title={t.shopByCategory}/><div className="carousel-buttons"><button type="button" disabled={edges[0]} aria-label={t.previous} onClick={()=>scroll(-1)}>{lang==='ar'?<ChevronRight/>:<ChevronLeft/>}</button><button type="button" disabled={edges[1]} aria-label={t.next} onClick={()=>scroll(1)}>{lang==='ar'?<ChevronLeft/>:<ChevronRight/>}</button></div></div>
  <div className="category-scroll" ref={ref} onScroll={update} onKeyDown={e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();scroll((e.key==='ArrowRight'?1:-1)*(lang==='ar'?-1:1));}}}>{items.map(c=><Link className="category-tile" key={c.slug} to={'/shop?category='+c.slug}><div className="category-image"><StoreImage src={c.image} alt="" width="320" height="240" loading="lazy"/></div><div className="category-tile-footer"><strong>{label(c.name,lang)}</strong><ArrowRight size={19}/></div></Link>)}</div></section>
}
export function Home(){
 const {initial,t,lang,categories,refreshCategories}=useStore();
 const [home,setHome]=useState(()=>initial.home?{products:initial.products,bundles:initial.bundles,bestsellers:initial.bestsellers,error:initial.homeError}:null);
 const [retry,setRetry]=useState(0);
 useEffect(()=>{
  if(initial.home&&retry===0)return;
  const controller=new AbortController();
  const request=path=>api(path,{signal:controller.signal});
  setHome(null);
  Promise.allSettled([request('/products?limit=16&availability=in_stock'),request('/bundles'),request('/bestsellers'),refreshCategories(controller.signal)]).then(([products,bundles,bestsellers,categories])=>{
   if(!controller.signal.aborted)setHome({products:products.value,bundles:bundles.value,bestsellers:bestsellers.value,error:products.status==='rejected'||categories.status==='rejected'});
  });
  return ()=>controller.abort();
 },[retry]);
 const products=home?.products?.items||[];const bundles=home?.bundles||[];const bestsellers=home?.bestsellers||[];
 const winnerSlugs=new Set(bestsellers.map(product=>product.slug));
 const showcase=[...bestsellers,...products.filter(product=>!winnerSlugs.has(product.slug))].slice(0,8);
 const title=bestsellers.length===0?t.featured:bestsellers.length<showcase.length?(lang==='ar'?'الأكثر مبيعًا ومختاراتنا':'Best sellers & featured'):(lang==='ar'?'الأكثر مبيعًا':'Best sellers');
 return <>
  <section className="hero"><div className="hero-background">{initial.hero&&<img src="/hero/gallermo-hero.webp" alt="" fetchpriority="high" loading="eager"/>}</div><div className="container hero-content"><span className="hero-overline">IT’S NOT OVER YET</span><h1>{t.discover}</h1><p>{t.tagline}</p><Link className="button-gold" to="/shop">{t.explore}<ArrowRight size={18}/></Link></div></section>
  {home?.error&&<RetryState lang={lang} onRetry={()=>setRetry(value=>value+1)}/>}
  {bundles.length>0&&<section className="section container"><SectionTitle title={t.bundles}/><div className="product-grid">{bundles.map(b=><article key={b.slug} className="bundle-card"><div className="bundle-image"><img src={b.images?.[0]?.url||'/gallermo-logo.webp'} alt=""/></div><h3>{label(b.name,lang)}</h3><p>{label(b.description,lang)}</p><strong>{money(b.priceEGP,lang)}</strong><Link className="button-secondary" to={'/bundle/'+b.slug}>{t.explore}</Link></article>)}</div></section>}
  {!home&&<div className="container section"><LoadingState kind="products" count={4} label={lang==='ar'?'جارٍ تحميل المنتجات':'Loading products'}/></div>}
  <CategoryCarousel items={categories.map(c=>({...c,image:c.image||products.find(p=>p.categorySlug===c.slug)?.images?.[0]?.url||''}))}/>
  {showcase.length>0&&<section className="section container"><SectionTitle title={title}/><div className="product-grid">{showcase.map(p=><ProductCard key={p.slug} p={p}/>)}</div><div className="view-all"><Link className="button-secondary" to="/shop">{lang==='ar'?'عرض الكل':'View all'}<ArrowRight size={18}/></Link></div></section>}
  <section className="why-section"><div className="container why-grid"><div><span className="eyebrow">IT’S NOT OVER YET</span><h2>{t.why}</h2><p>{t.whyText}</p><Link to="/shop" className="button-secondary">{t.explore}<ArrowRight size={17}/></Link></div><div className="why-badges"><div><Sparkles size={27}/><strong>{lang==='ar'?'تفاصيل جريئة':'Express yourself'}</strong><p>{lang==='ar'?'تصاميم مليانة شخصية':'Designs with personality'}</p></div><div><Package size={27}/><strong>{lang==='ar'?'اختيارات متنوعة':'Your kind of art'}</strong><p>{lang==='ar'?'اختار اللي يشبهك':'Explore your own style'}</p></div><div><ShieldCheck size={27}/><strong>{lang==='ar'?'طلب واضح':'Clear ordering'}</strong><p>{lang==='ar'?'شوف المقاسات والأسعار':'See sizes and prices upfront'}</p></div></div></div></section>
  <Faq/>
 </>
}
export function BundlePage(){
 const {slug}=useParams();
 return <BundleDetail key={slug} slug={slug}/>;
}
function BundleDetail({slug}){
 const {initial,t,lang,add}=useStore();
 const direct=initial.bundle?.slug===slug;
 const [bundle,setBundle]=useState(direct?initial.bundle:null);
 const [status,setStatus]=useState(direct?200:initial.detailSlug===slug?initial.detailStatus:0);
 const [retry,setRetry]=useState(0);
 const [quantity,setQuantity]=useState(1);const [notice,setNotice]=useState('');
 useEffect(()=>{
  if(retry===0&&(direct||initial.detailSlug===slug&&initial.detailStatus>=400))return;
  const controller=new AbortController();
  setStatus(0);
  api('/bundles/'+encodeURIComponent(slug),{signal:controller.signal}).then(bundle=>{setBundle(bundle);setStatus(200);}).catch(error=>{
   if(error.name!=='AbortError')setStatus(error.status||503);
  });
  return ()=>controller.abort();
 },[slug,retry]);
 useEffect(()=>{
  if(!bundle||status!==200)return;
  const title=label(bundle.name,lang);
  document.title=title+' | Gallermo Store';
  const description=document.querySelector('meta[name=description]');
  if(description)description.content=(label(bundle.description,lang)||title).replace(/<[^>]+>/g,'').slice(0,155);
 },[bundle,lang,status]);
 if(!bundle||status!==200)return <div className="container page-shell">{status===404?<p>{lang==='ar'?'هذه الباقة غير موجودة.':'Bundle not found.'}</p>:status?<RetryState lang={lang} onRetry={()=>setRetry(value=>value+1)}/>:<LoadingState label={lang==='ar'?'جارٍ تحميل الباقة':'Loading bundle'}/>}</div>;
 return <div className="container page-shell product-detail bundle-detail"><div className="detail-gallery"><div className="main-photo"><img src={bundle.images?.[0]?.url||'/gallermo-logo.webp'} alt={label(bundle.name,lang)} width="680" height="680"/></div></div>
 <div className="detail-content"><Link className="back-link" to="/">{t.home}</Link><h1>{label(bundle.name,lang)}</h1><div className="detail-price">{money(bundle.priceEGP,lang)}</div><p>{label(bundle.description,lang)}</p>
 <div className="quantity-control bundle-quantity"><button type="button" onClick={()=>setQuantity(q=>Math.max(1,q-1))}><Minus size={16}/></button><span>{quantity}</span><button type="button" onClick={()=>setQuantity(q=>Math.min(10,q+1))}><Plus size={16}/></button></div>
 <button type="button" className="button-primary big-cta" onClick={e=>{const added=add({kind:'bundle',slug:bundle.slug,requiresPrepayment:bundle.requiresPrepayment,quantity,title:label(bundle.name,lang),image:bundle.images?.[0]?.url||'/gallermo-logo.webp',unitPriceEGP:bundle.priceEGP,addons:[]});if(added)FlyToCart(e);setNotice(added?(lang==='ar'?'تمت الإضافة للسلة':'Added to cart'):(lang==='ar'?'تم بلوغ الحد المتاح':'Cart quantity limit reached'))}}>{t.add}<ArrowRight size={18}/></button><p role="status" className="inline-success">{notice}</p>
 </div></div>
}
function CartArtwork({item,lang,onReplace}){
 const dialog=useRef(null);
 return <>
  <button className="text-link" type="button" onClick={()=>dialog.current.showModal()}>{lang==='ar'?'استبدال التصميم':'Replace artwork'}</button>
  <ArtworkDialog dialog={dialog} lang={lang} product={{slug:item.slug}} variant={{sku:item.variantSku}} onAccept={onReplace} replace/>
 </>;
}
export function CartPage(){
 const {cart,cartReady,remove,updateQty,quantityLimit,t,lang,config,replaceArtwork}=useStore();const subtotal=cart.reduce((a,x)=>a+x.quantity*x.unitPriceEGP,0);
 const [policy,setPolicy]=useState(null);
 const [policyError,setPolicyError]=useState(false);
 const signature=JSON.stringify(cart.map(({kind,slug,variantSku,quantity,addons,customizationId})=>({kind,slug,variantSku,quantity,addons,customizationId})));
 useEffect(()=>{
  if(!cartReady||signature==='[]')return;
  const controller=new AbortController();
  setPolicy(null);setPolicyError(false);
  api('/orders/cart-policy',{method:'POST',body:JSON.stringify({lines:JSON.parse(signature)}),signal:controller.signal})
   .then(data=>setPolicy(data.requiresPrepayment)).catch(error=>{if(error.name!=='AbortError')setPolicyError(true);});
  return ()=>controller.abort();
 },[cartReady,signature]);
 const prepayment=policy===true;
 if(!cartReady)return <div className="container page-shell"><LoadingState label={lang==='ar'?'جارٍ تحميل السلة':'Loading cart'}/></div>;
 return <div className="container page-shell narrow-page"><div className="page-intro"><h1>{t.cart}</h1></div>{cart.length===0?<Empty text={t.empty}/>:<div className="cart-layout"><div className="cart-lines">{cart.map((item,i)=><div className="cart-line" key={item.customizationId||[item.kind,item.slug,item.variantSku,(item.addons||[]).join(',')].join(':')}><StoreImage src={item.customizationId?'/api/private/'+item.customizationId:item.image} alt={item.customizationId?(lang==='ar'?'معاينة تصميمك':'Your artwork preview'):''}/><div><strong>{item.title}</strong><small>{item.customizationId?(lang==='ar'?'تصميم مخصص · ':'Custom artwork · '):''}{variantLabel(item.variantLabel||item.variantSku,lang,item.categorySlug)}{item.addons?.length?` · ${item.addons.join(', ')}`:''}</small><span>{money(item.unitPriceEGP,lang)}</span>
 {item.customizationId&&config.customizationAvailable&&<CartArtwork item={item} lang={lang} onReplace={id=>replaceArtwork(i,item.customizationId,id)}/>}</div><div className="quantity-control"><button aria-label={lang==='ar'?'تقليل الكمية':'Decrease quantity'} onClick={()=>item.quantity>1?updateQty(i,item.quantity-1):remove(i)}><Minus size={16}/></button><span>{item.quantity}</span><button aria-label={lang==='ar'?'زيادة الكمية':'Increase quantity'} onClick={()=>updateQty(i,item.quantity+1)} disabled={item.quantity>=quantityLimit(i)}><Plus size={16}/></button></div><button className="icon-button" aria-label={lang==='ar'?'حذف المنتج':'Remove item'} onClick={()=>remove(i)}><Trash2 size={17}/></button></div>)}</div><aside className="order-summary"><h2>{t.total}</h2><div className="summary-line"><span>{t.subtotal}</span><strong>{money(subtotal,lang)}</strong></div><p className="muted">{lang==='ar'?'يتم تأكيد رسوم الشحن عند إتمام الطلب.':'Shipping is confirmed at checkout.'}</p>{policyError&&<p className="muted" role="status">{lang==='ar'?'تعذّر التحقق من بعض خيارات السلة. راجع المنتجات قبل إتمام الطلب.':'Some cart options could not be verified. Review your products before checking out.'}</p>}{prepayment&&<p className="notice-box">{lang==='ar'?'تتطلب سلتك مقدمًا بنسبة ٥٠٪ عند إتمام الطلب.':'Your cart requires a 50% deposit at checkout.'}</p>}{!config.checkoutEnabled&&<p role="status">{t.unavailable}</p>}<Link className="button-primary" to="/checkout">{t.checkout}<ArrowRight size={18}/></Link></aside></div>}</div>
}
export function OrderThankYou(){
 const {number}=useParams();const {t,lang,user}=useStore();const {state}=useLocation();
 const ar=lang==='ar';
 return <div className="container page-shell order-confirmation"><CheckCircle2 size={52}/><h1>{ar?'تم استلام طلبك':'Order received'}</h1>
  <p>{t.orderNumber}</p><div className="big-order-number">{number}</div>
  <p>{state?.order?.paymentStatus==='proof_submitted'?(ar?'تم استلام صورة التحويل وهي قيد التحقق.':'We received your transfer screenshot. Verification is pending.'):(ar?'احتفظ برقم الطلب لمتابعته.':'Keep your order number for tracking.')}</p>
  <Link className="button-primary" to={user?.role==='customer'?'/account/orders':'/track-order'}>{user?.role==='customer'?t.orders:t.track}<ArrowRight size={18}/></Link>
 </div>;
}
export function TrackPage(){const {t,lang,user,sessionReady,sessionError,loadSession}=useStore();const [number,setNumber]=useState('');const [phone,setPhone]=useState('');const [result,setResult]=useState(null);const [error,setError]=useState('');const [loading,setLoading]=useState(false);
 if(!sessionReady)return <div className="container page-shell">{sessionError?<RetryState lang={lang} onRetry={()=>loadSession()}/>:<LoadingState label={lang==='ar'?'جارٍ التحميل':'Loading session'}/>}</div>;
 if(user?.role==='customer')return <div className="container page-shell"><p>{t.myOrders}</p><Link className="button-primary" to="/account/orders">{t.myOrders}</Link></div>;
 if(user?.role==='admin')return <div className="container page-shell"><Link className="button-primary" to="/admin">{t.admin}</Link></div>;
 return <div className="container page-shell form-page"><h1>{t.guestTrack}</h1><p>{lang==='ar'?'اكتب رقم طلبك ورقم الموبايل المستخدم عند الطلب.':'Enter your order number and the phone number used at checkout.'}</p><form onSubmit={async e=>{e.preventDefault();setLoading(true);setError('');try{setResult(await api('/orders/track',{method:'POST',body:JSON.stringify({number,phone})}))}catch(err){setResult(null);setError(orderError(err,lang))}finally{setLoading(false)}}} className="stack-form"><label>{t.orderNumber}<input required value={number} onChange={e=>setNumber(e.target.value)} placeholder="GL-2026..."/></label><label>{t.phone}<input required value={phone} onChange={e=>setPhone(e.target.value)}/></label><button type="submit" className="button-primary" disabled={loading}>{t.track}<ArrowRight size={17}/></button></form><p role="alert" className="inline-error">{error}</p>{result&&<div className="order-status"><strong>{result.number}</strong><p>{t.status}: <b>{orderStatus(result.status,lang)}</b></p><p>{lang==='ar'?'حالة الدفع':'Payment'}: {orderStatus(result.paymentStatus,lang)}</p>{result.canReplacePayment&&result.paymentStatus==='rejected'&&<ReplacePayment number={result.number} lang={lang} onComplete={()=>setResult(old=>({...old,paymentStatus:'proof_submitted'}))}/>}</div>}</div>
}
export function MyOrdersPage(){const {t,user,sessionReady,sessionError,loadSession,lang}=useStore();const [orders,setOrders]=useState(null);const [error,setError]=useState('');const [refresh,setRefresh]=useState(0);useEffect(()=>{const controller=new AbortController();if(user?.role==='customer'){setOrders(null);setError('');api('/orders/mine',{signal:controller.signal}).then(setOrders).catch(e=>{if(e.name!=='AbortError')setError(e.message);});}return()=>controller.abort();},[user,refresh]);
 if(!sessionReady)return <div className="container page-shell">{sessionError?<RetryState lang={lang} onRetry={()=>loadSession()}/>:<LoadingState label={lang==='ar'?'جارٍ التحميل':'Loading session'}/>}</div>;
 if(user?.role!=='customer')return <div className="container page-shell form-page"><h1>{t.myOrders}</h1><p>{lang==='ar'?'سجل دخولك للاطلاع على طلباتك.':'Sign in to see your orders.'}</p><Link to="/login" className="button-primary">{t.signIn}</Link></div>;
 return <div className="container page-shell narrow-page"><div className="page-intro"><h1>{t.myOrders}</h1></div><p role="alert">{error}</p>{error?<RetryState lang={lang} onRetry={()=>setRefresh(n=>n+1)}/>:!orders?<LoadingState label={lang==='ar'?'جارٍ تحميل الطلبات':'Loading orders'}/>:orders.length===0?<Empty text={lang==='ar'?'لسه مفيش طلبات':'No orders yet'}/>:<div className="orders-stack">{orders.map(o=><article className="order-item" key={o._id}><div><strong>{o.number}</strong><small>{new Date(o.createdAt).toLocaleDateString(lang==='ar'?'ar-EG':'en-EG')}</small></div><div><strong>{money(o.totalEGP,lang)}</strong><small>{orderStatus(o.status,lang)} · {orderStatus(o.paymentStatus,lang)}</small>{o.paymentStatus==='rejected'&&<ReplacePayment lang={lang} number={o.number} onComplete={()=>setRefresh(value=>value+1)}/> }</div></article>)}</div>}</div>
}
export function AuthPage({mode}){const {setUser,t,lang}=useStore();const navigate=useNavigate();const [name,setName]=useState('');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 return <div className="container page-shell form-page"><h1>{mode==='login'?t.signIn:t.signUp}</h1><form className="stack-form" onSubmit={async e=>{e.preventDefault();setError('');setBusy(true);try{const user=await api('/auth/'+(mode==='login'?'login':'register'),{method:'POST',body:JSON.stringify({...(mode==='register'?{name}:{}),email,password})});setUser(user);navigate(user.role==='admin'?'/admin':'/account/orders')}catch(e){setError(e.status===401?(lang==='ar'?'البريد الإلكتروني أو كلمة المرور غير صحيحة.':'Invalid email or password'):e.status===409&&mode==='register'?(lang==='ar'?'البريد الإلكتروني مسجل بالفعل.':e.message):orderError(e,lang))}finally{setBusy(false)}}}>{mode==='register'&&<label>{t.fullname}<input value={name} onChange={e=>setName(e.target.value)} required minLength={2}/></label>}<label>{t.email}<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>{t.password}<input required minLength={mode==='register'?12:1} type="password" autoComplete={mode==='register'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/></label><p className="inline-error" role="alert">{error}</p><button disabled={busy} aria-busy={busy} className="button-primary" type="submit">{busy?(lang==='ar'?'جارٍ تسجيل الدخول…':'Submitting…'):mode==='login'?t.login:t.register}<ArrowRight size={17}/></button></form><p>{mode==='login'?<Link to="/register">{t.signUp}</Link>:<Link to="/login">{t.signIn}</Link>}</p></div>
}
export function NotFound(){
 const {lang}=useStore();
 return <div className="container page-shell"><Empty text={lang==='ar'?'الصفحة غير موجودة':'Page not found'}/></div>;
}
