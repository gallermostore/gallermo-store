import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {ArrowRight,ArrowLeft,ChevronLeft,ChevronRight,ChevronDown,CheckCircle2,Plus,Minus,Package,Truck,ShieldCheck,Sparkles,Trash2,Search as SearchIcon} from 'lucide-react';
import {api,label,money,ProductCard,FlyToCart,useStore} from '../App.jsx';
const Empty=({text})=><div className="empty-state"><Package size={35}/><p>{text}</p><Link to="/shop" className="button-primary">Browse products <ArrowRight size={16}/></Link></div>;
const SectionTitle=({eyebrow,title,description})=><div className="section-heading"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{description&&<p>{description}</p>}</div>;
function CategoryCarousel({items}){
 const {lang,t}=useStore();const ref=useRef(null);
 const scroll=dir=>ref.current?.scrollBy({left:dir*(lang==='ar'?-1:1)*310,behavior:'smooth'});
 return <section className="section container"><div className="section-row"><SectionTitle eyebrow="EXPLORE" title={t.shopByCategory}/><div className="carousel-buttons"><button aria-label="Scroll categories backward" onClick={()=>scroll(-1)}><ChevronLeft/></button><button aria-label="Scroll categories forward" onClick={()=>scroll(1)}><ChevronRight/></button></div></div><div className="category-scroll" ref={ref}>{items.map((c,i)=><Link className="category-tile" key={c.slug} to={'/shop?category='+c.slug}><div className="category-image">{c.image?<img src={c.image} alt="" loading="lazy"/>:<span>{String(i+1).padStart(2,'0')}</span>}</div><div className="category-tile-footer"><strong>{label(c.name,lang)}</strong><ArrowRight size={19}/></div></Link>)}</div></section>
}
const faqEn=[['Can I place an order without an account?','Yes. Guest checkout is supported when checkout is enabled, and you can track a guest order using your order number and phone number.'],['How do I choose a size?','Open a product to see its available sizes and the price for each option before adding it to your cart.'],['What payment methods are available?','The planned methods are cash on delivery and InstaPay. Checkout is activated after the store configuration is verified.'],['How can I follow my order?','Guests can use Track Order. Signed-in customers can find their orders in My Orders.']];
const faqAr=[['هل أقدر أطلب من غير حساب؟','أيوه. تقدر تطلب كضيف عند تفعيل الدفع، وتتابع طلبك برقم الطلب ورقم الموبايل.'],['أختار المقاس إزاي؟','افتح صفحة المنتج واختار المقاس وشوف سعر كل اختيار قبل الإضافة للسلة.'],['إيه طرق الدفع؟','طرق الدفع المخطط لها هي الدفع عند الاستلام وإنستا باي. هيتفعل الدفع بعد مراجعة إعدادات المتجر.'],['أتابع طلبي إزاي؟','الضيف يقدر يستخدم تتبع الطلب، والعميل المسجل يلاقي طلباته في صفحة طلباتي.']];
export function Home(){
 const {initial,t,lang}=useStore();const categories=(initial.categories||[]).filter(c=>c.published&&c.slug!=='acrylic-coasters');
 const products=initial.products?.items||[];const bundles=initial.bundles||[];const bestsellers=initial.bestsellers||[];
 const hero=products.find(p=>p.categorySlug==='canvas-prints')||products.find(p=>p.images?.length)||null;
 return <>
  <section className="hero"><div className="hero-background" style={hero?.images?.[0]?.url?{backgroundImage:`linear-gradient(90deg,rgba(21,0,9,.88),rgba(35,0,12,.2)),url('${hero.images[0].url}')`}:undefined}/><div className="container hero-content"><span className="hero-overline">GALLERMO STORE · IT’S NOT OVER YET</span><h1>{t.discover}</h1><p>{t.tagline}</p><Link className="button-gold" to="/shop">{t.explore}<ArrowRight size={18}/></Link></div><span className="hero-pagination">01 — 01</span></section>
  {bundles.length>0&&<section className="section container"><SectionTitle eyebrow="BETTER TOGETHER" title={t.bundles}/><div className="product-grid">{bundles.map(b=><article key={b.slug} className="bundle-card"><div className="bundle-image"><img src={b.images?.[0]?.url||'/gallermo-logo.webp'} alt=""/></div><h3>{label(b.name,lang)}</h3><p>{label(b.description,lang)}</p><strong>{money(b.priceEGP)}</strong><Link className="button-secondary" to={'/bundle/'+b.slug}>{t.explore}</Link></article>)}</div></section>}
  <CategoryCarousel items={categories.map(c=>({...c,image:c.image||products.find(p=>p.categorySlug===c.slug)?.images?.[0]?.url||''}))}/>
  {(bestsellers.length>0||products.length>0)&&<section className="section container"><div className="section-row"><SectionTitle eyebrow={bestsellers.length>0?"CUSTOMER FAVORITES":"DISCOVER THE COLLECTION"} title={bestsellers.length>0?(lang==='ar'?'الأكثر مبيعًا':'Best Sellers'):t.featured}/><Link className="text-link" to="/shop">{t.all}<ArrowRight size={18}/></Link></div><div className="product-grid">{(bestsellers.length>0?bestsellers:products).slice(0,8).map(p=><ProductCard key={p.slug} p={p}/>)}</div></section>}
  <section className="why-section"><div className="container why-grid"><div><span className="eyebrow">IT’S NOT OVER YET</span><h2>{t.why}</h2><p>{t.whyText}</p><Link to="/shop" className="button-secondary">{t.explore}<ArrowRight size={17}/></Link></div><div className="why-badges"><div><Sparkles size={27}/><strong>{lang==='ar'?'تفاصيل جريئة':'Express yourself'}</strong><p>{lang==='ar'?'تصاميم مليانة شخصية':'Designs with personality'}</p></div><div><Package size={27}/><strong>{lang==='ar'?'اختيارات متنوعة':'Your kind of art'}</strong><p>{lang==='ar'?'اختار اللي يشبهك':'Explore your own style'}</p></div><div><ShieldCheck size={27}/><strong>{lang==='ar'?'طلب واضح':'Clear ordering'}</strong><p>{lang==='ar'?'شوف المقاسات والأسعار':'See sizes and prices upfront'}</p></div></div></div></section>
  <section className="section container faq-section"><SectionTitle eyebrow="NEED TO KNOW" title={t.faq}/><div className="faq-list">{(lang==='ar'?faqAr:faqEn).map(([q,a])=><details key={q}><summary>{q}<Plus size={19}/></summary><p>{a}</p></details>)}</div></section>
 </>
}
export function Shop(){
 const {initial,t,lang}=useStore();const [searchParams,setSearchParams]=useSearchParams();
 const category=searchParams.get('category')||'',page=Math.max(1,Number(searchParams.get('page')||1)),q=searchParams.get('q')||'';
 const [text,setText]=useState(q);const [state,setState]=useState(initial.products||{items:[],total:0,page:1,limit:12});const [loading,setLoading]=useState(false);
 useEffect(()=>{setText(q)},[q]);
 useEffect(()=>{let cancelled=false;setLoading(true);api(`/products?page=${page}&limit=12${category?'&category='+encodeURIComponent(category):''}${q?'&q='+encodeURIComponent(q):''}`).then(v=>!cancelled&&setState(v)).catch(()=>!cancelled&&setState({items:[],total:0,limit:12})).finally(()=>!cancelled&&setLoading(false));return()=>{cancelled=true}},[category,page,q]);
 const change=(key,value)=>{const params=new URLSearchParams(searchParams);if(value)params.set(key,value);else params.delete(key);params.delete('page');setSearchParams(params)};
 const pages=Math.max(1,Math.ceil((state.total||0)/(state.limit||12)));
 return <div className="container page-shell"><div className="page-intro"><span className="eyebrow">GALLERMO COLLECTION</span><h1>{t.shop}</h1><p>{lang==='ar'?'التفاصيل اللي بتكمل كل مكان':'Find the piece that feels like you.'}</p></div>
  <div className="shop-toolbar"><form onSubmit={e=>{e.preventDefault();change('q',text)}} className="search-form"><SearchIcon size={20}/><input value={text} onChange={e=>setText(e.target.value)} placeholder={t.search} aria-label={t.search}/><button type="submit">{t.submit}</button></form><label className="sr-only">{t.categories}<select value={category} onChange={e=>change('category',e.target.value)}><option value="">{t.all}</option>{(initial.categories||[]).map(c=><option key={c.slug} value={c.slug}>{label(c.name,lang)}</option>)}</select></label></div>
  <div className="category-filters"><button className={!category?'active':''} onClick={()=>change('category','')}>{t.all}</button>{(initial.categories||[]).map(c=><button key={c.slug} className={category===c.slug?'active':''} onClick={()=>change('category',c.slug)}>{label(c.name,lang)}</button>)}</div>
  <div role="status" aria-live="polite" className="result-label">{loading?(lang==='ar'?'جارٍ التحميل...':'Loading...'):`${state.total||0} ${lang==='ar'?'منتج':'designs'}`}</div>
  {state.items?.length>0?<div className="product-grid">{state.items.map(p=><ProductCard key={p.slug} p={p}/>)}</div>:<Empty text={t.noProducts}/>}
  {pages>1&&<div className="pagination"><button disabled={page<=1} onClick={()=>setSearchParams(prev=>{const x=new URLSearchParams(prev);x.set('page',String(page-1));return x})}>{t.previous}</button><span>{page} / {pages}</span><button disabled={page>=pages} onClick={()=>setSearchParams(prev=>{const x=new URLSearchParams(prev);x.set('page',String(page+1));return x})}>{t.next}</button></div>}
 </div>
}
export function ProductPage(){
 const {slug}=useParams();const {initial,t,lang,add}=useStore();
 const [product,setProduct]=useState(initial.product?.slug===slug?initial.product:null);
 const [variant,setVariant]=useState(initial.product?.slug===slug?initial.product?.variants?.[0]?.sku:'');
 const [photo,setPhoto]=useState(0);const [addons,setAddons]=useState([]);const [notice,setNotice]=useState('');
 useEffect(()=>{let live=true;if(initial.product?.slug===slug){setProduct(initial.product);setVariant(initial.product.variants?.[0]?.sku||'');return}
  setProduct(null);api('/products/'+encodeURIComponent(slug)).then(v=>{if(live){setProduct(v);setVariant(v.variants?.[0]?.sku||'')}}).catch(()=>setProduct(null));return()=>{live=false}},[slug,initial.product]);
 if(!product)return <div className="container page-shell"><Empty text={t.noProducts}/></div>;
 const choice=product.variants?.find(x=>x.sku===variant)||product.variants?.[0];
 const extraCost=(product.addons||[]).filter(x=>addons.includes(x.code)).reduce((a,x)=>a+x.priceEGP,0);
 return <div className="container page-shell product-detail"><div className="detail-gallery"><div className="main-photo"><img src={product.images?.[photo]?.url} alt={product.images?.[photo]?.alt||label(product.name,lang)} width="680" height="680"/></div><div className="thumbnails">{product.images?.map((im,i)=><button className={photo===i?'active':''} key={im.url} onClick={()=>setPhoto(i)} aria-label={`View photo ${i+1}`}><img src={im.url} alt=""/></button>)}</div></div>
  <div className="detail-content"><Link to="/shop" className="back-link"><ChevronLeft size={17}/>{t.shop}</Link><span className="eyebrow">GALLERMO ORIGINAL COLLECTION</span><h1>{label(product.name,lang)}</h1><div className="detail-price">{money((choice?.priceEGP||0)+extraCost)}</div><p>{label(product.description,lang)}</p>
  <fieldset className="choice-field"><legend>{t.size}</legend><div className="size-buttons">{product.variants?.map(v=><button type="button" key={v.sku} className={v.sku===choice?.sku?'selected':''} onClick={()=>setVariant(v.sku)} disabled={v.stock===0} aria-pressed={v.sku===choice?.sku}>{v.label}</button>)}</div></fieldset>
  {product.addons?.length>0&&<fieldset className="choice-field"><legend>{lang==='ar'?'إضافات':'Optional extras'}</legend>{product.addons.map(a=><label className="check-row" key={a.code}><input type="checkbox" checked={addons.includes(a.code)} onChange={e=>setAddons(old=>e.target.checked?[...old,a.code]:old.filter(x=>x!==a.code))}/>{label(a.label,lang)} — {money(a.priceEGP)}</label>)}</fieldset>}
  <button type="button" className="button-primary big-cta" disabled={!choice||choice.stock===0} onClick={e=>{FlyToCart(e);add({kind:'product',slug:product.slug,variantSku:choice.sku,quantity:1,addons,title:label(product.name,lang),image:product.images?.[0]?.url,unitPriceEGP:choice.priceEGP+extraCost});setNotice(lang==='ar'?'تمت الإضافة للسلة':'Added to your cart')}}>{t.add}<ArrowRight size={18}/></button><div className="inline-success" role="status">{notice}</div>
  <div className="detail-help"><Package size={17}/>{lang==='ar'?'السعر بيتغير حسب المقاس المختار.':'Price updates with the size you select.'}</div></div>
 </div>
}
export function BundlePage(){
 const {slug}=useParams();const {initial,t,lang,add}=useStore();
 const [bundle,setBundle]=useState(initial.bundle?.slug===slug?initial.bundle:null);
 const [quantity,setQuantity]=useState(1);const [notice,setNotice]=useState('');
 useEffect(()=>{let active=true;if(initial.bundle?.slug===slug){setBundle(initial.bundle);return}
  api('/bundles/'+encodeURIComponent(slug)).then(v=>active&&setBundle(v)).catch(()=>active&&setBundle(null));return()=>{active=false}},[slug,initial.bundle]);
 if(!bundle)return <div className="container page-shell"><Empty text={t.noProducts}/></div>;
 return <div className="container page-shell product-detail bundle-detail"><div className="detail-gallery"><div className="main-photo"><img src={bundle.images?.[0]?.url||'/gallermo-logo.webp'} alt={label(bundle.name,lang)} width="680" height="680"/></div></div>
 <div className="detail-content"><Link className="back-link" to="/">{t.home}</Link><span className="eyebrow">GALLERMO BUNDLE</span><h1>{label(bundle.name,lang)}</h1><div className="detail-price">{money(bundle.priceEGP)}</div><p>{label(bundle.description,lang)}</p>
 <div className="quantity-control bundle-quantity"><button type="button" onClick={()=>setQuantity(q=>Math.max(1,q-1))}><Minus size={16}/></button><span>{quantity}</span><button type="button" onClick={()=>setQuantity(q=>Math.min(10,q+1))}><Plus size={16}/></button></div>
 <button type="button" className="button-primary big-cta" onClick={e=>{FlyToCart(e);add({kind:'bundle',slug:bundle.slug,quantity,title:label(bundle.name,lang),image:bundle.images?.[0]?.url||'/gallermo-logo.webp',unitPriceEGP:bundle.priceEGP,addons:[]});setNotice(lang==='ar'?'تمت الإضافة للسلة':'Added to cart')}}>{t.add}<ArrowRight size={18}/></button><p role="status" className="inline-success">{notice}</p>
 </div></div>
}
export function CartPage(){
 const {cart,remove,updateQty,t,lang}=useStore();const subtotal=cart.reduce((a,x)=>a+x.quantity*x.unitPriceEGP,0);
 return <div className="container page-shell narrow-page"><div className="page-intro"><span className="eyebrow">YOUR PICKS</span><h1>{t.cart}</h1></div>{cart.length===0?<Empty text={t.empty}/>:<div className="cart-layout"><div className="cart-lines">{cart.map((item,i)=><div className="cart-line" key={i}><img src={item.image||'/gallermo-logo.webp'} alt=""/><div><strong>{item.title}</strong><small>{item.variantSku}{item.addons?.length?` · ${item.addons.join(', ')}`:''}</small><span>{money(item.unitPriceEGP)}</span></div><div className="quantity-control"><button aria-label="Decrease quantity" onClick={()=>item.quantity>1?updateQty(i,item.quantity-1):remove(i)}><Minus size={16}/></button><span>{item.quantity}</span><button aria-label="Increase quantity" onClick={()=>updateQty(i,item.quantity+1)} disabled={item.quantity>=10}><Plus size={16}/></button></div><button className="icon-button" aria-label="Remove item" onClick={()=>remove(i)}><Trash2 size={17}/></button></div>)}</div><aside className="order-summary"><h2>{t.total}</h2><div className="summary-line"><span>{t.subtotal}</span><strong>{money(subtotal)}</strong></div><p className="muted">{lang==='ar'?'يتم تأكيد رسوم الشحن عند إتمام الطلب.':'Shipping is confirmed at checkout.'}</p><Link className="button-primary" to="/checkout">{t.checkout}<ArrowRight size={18}/></Link></aside></div>}</div>
}
export function CheckoutPage(){
 const {cart,t,lang,config,setCart,user}=useStore();const navigate=useNavigate();
 const [form,setForm]=useState({name:user?.name||'',email:user?.email||'',phone:'',governorate:'',address:'',notes:''});
 const [method,setMethod]=useState('cod');const [code,setCode]=useState('');const [quote,setQuote]=useState(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const idKey=useRef(null);
 useEffect(()=>{if(user)setForm(x=>({...x,name:x.name||user.name,email:x.email||user.email}))},[user]);
 const lines=cart.map(({kind,slug,variantSku,quantity,addons})=>({kind,slug,variantSku,quantity,addons}));
 const subtotal=cart.reduce((sum,x)=>sum+x.unitPriceEGP*x.quantity,0);
 const payload=()=>({lines,discountCode:code||undefined});
 useEffect(()=>{setQuote(null)},[cart,code]);
 const check=async()=>{setError('');try{setQuote(await api('/orders/quote',{method:'POST',body:JSON.stringify(payload())}))}catch(e){setError(e.message)}};
 const checkout=async e=>{e.preventDefault();if(busy||!config.checkoutEnabled)return;setBusy(true);setError('');
  try{if(!idKey.current)idKey.current=crypto.randomUUID();
   const order=await api('/orders',{method:'POST',body:JSON.stringify({...payload(),idempotencyKey:idKey.current,customer:form,paymentMethod:method})});
   setCart([]);navigate('/order-confirmed/'+encodeURIComponent(order.number),{state:{order,method,phone:form.phone}});
  }catch(e){setError(e.message)}finally{setBusy(false)}
 };
 if(cart.length===0)return <div className="container page-shell"><Empty text={t.empty}/></div>;
 return <div className="container page-shell narrow-page"><div className="page-intro"><span className="eyebrow">FINAL DETAILS</span><h1>{t.checkout}</h1></div>
  {!config.checkoutEnabled&&<div className="notice-box" role="status">{t.unavailable}</div>}
  <div className="cart-layout"><form className="checkout-form" onSubmit={checkout}>
  <h2>{t.customer}</h2><div className="form-grid">{[['name',t.fullname],['email',t.email],['phone',t.phone],['governorate',t.gov],['address',t.address],['notes',t.notes]].map(([key,labelText])=><label key={key} className={['address','notes'].includes(key)?'wide':''}>{labelText}{key==='notes'?<textarea value={form[key]} onChange={e=>setForm(x=>({...x,[key]:e.target.value}))} maxLength={500}/>:<input required type={key==='email'?'email':'text'} autoComplete={key==='name'?'name':key==='email'?'email':key==='phone'?'tel':'on'} minLength={key==='address'?8:undefined} value={form[key]} onChange={e=>setForm(x=>({...x,[key]:e.target.value}))}/>}</label>)}</div>
  <h2>{t.method}</h2><div className="radio-options"><label><input type="radio" name="paymentMethod" checked={method==='cod'} onChange={()=>setMethod('cod')}/>{t.cod}</label><label><input type="radio" name="paymentMethod" checked={method==='instapay'} onChange={()=>setMethod('instapay')}/>{t.instapay}</label></div>
  {method==='instapay'&&<div className="notice-box">{t.paymentNote}<br/><strong>{config.instapayNumber}</strong></div>}
  <p className="inline-error" role="alert">{error}</p><button className="button-primary big-cta" disabled={!config.checkoutEnabled||busy} type="submit">{busy?'Processing...':t.place}<ArrowRight size={18}/></button>
  </form><aside className="order-summary"><h2>{t.total}</h2><div className="summary-line"><span>{t.subtotal}</span><strong>{money(quote?.subtotalEGP??subtotal)}</strong></div><div className="summary-line"><span>{t.shipping}</span><span>{quote?money(quote.shippingEGP):'—'}</span></div>{quote&&<div className="summary-line"><span>{t.discount}</span><span>−{money(quote.discountEGP)}</span></div>}<div className="summary-total"><strong>{t.total}</strong><strong>{quote?money(quote.totalEGP):money(subtotal)+' + shipping'}</strong></div><div className="discount-row"><input placeholder={t.discount} aria-label={t.discount} value={code} onChange={e=>setCode(e.target.value.trim().toUpperCase())}/><button type="button" disabled={!config.checkoutEnabled} onClick={check}>{t.apply}</button></div><button className="text-link" type="button" disabled={!config.checkoutEnabled} onClick={check}>{lang==='ar'?'تحديث الإجمالي':'Calculate final total'}<ArrowRight size={17}/></button></aside></div>
 </div>
}
export function OrderThankYou(){
 const {number}=useParams();const {t,lang,config}=useStore();
 const method=typeof window!=='undefined'?history.state?.usr?.method:undefined;
 return <div className="container page-shell order-confirmation"><CheckCircle2 size={52}/><h1>{lang==='ar'?'تم استلام طلبك':'Order received'}</h1><p>{t.orderNumber}</p><div className="big-order-number">{number}</div><p>{method==='instapay'?t.paymentNote:lang==='ar'?'احتفظ برقم طلبك لمتابعته.':'Keep this order number for tracking.'}</p>{method==='instapay'&&<p className="payment-destination">InstaPay: <strong>{config.instapayNumber}</strong></p>}<Link className="button-primary" to="/">{t.home}<ArrowRight size={16}/></Link></div>
}
export function TrackPage(){const {t,lang,user}=useStore();const [number,setNumber]=useState('');const [phone,setPhone]=useState('');const [result,setResult]=useState(null);const [error,setError]=useState('');const [loading,setLoading]=useState(false);
 if(user?.role==='customer')return <div className="container page-shell"><p>{t.myOrders}</p><Link className="button-primary" to="/account/orders">{t.myOrders}</Link></div>;
 if(user?.role==='admin')return <div className="container page-shell"><Link className="button-primary" to="/admin">{t.admin}</Link></div>;
 return <div className="container page-shell form-page"><span className="eyebrow">GALLERMO ORDERS</span><h1>{t.guestTrack}</h1><p>{lang==='ar'?'اكتب رقم طلبك ورقم الموبايل المستخدم عند الطلب.':'Enter your order number and the phone number used at checkout.'}</p><form onSubmit={async e=>{e.preventDefault();setLoading(true);setError('');try{setResult(await api('/orders/track',{method:'POST',body:JSON.stringify({number,phone})}))}catch(err){setResult(null);setError(err.message)}finally{setLoading(false)}}} className="stack-form"><label>{t.orderNumber}<input required value={number} onChange={e=>setNumber(e.target.value)} placeholder="GL-2026..."/></label><label>{t.phone}<input required value={phone} onChange={e=>setPhone(e.target.value)}/></label><button type="submit" className="button-primary" disabled={loading}>{t.track}<ArrowRight size={17}/></button></form><p role="alert" className="inline-error">{error}</p>{result&&<div className="order-status"><strong>{result.number}</strong><p>{t.status}: <b>{result.status}</b></p><p>{lang==='ar'?'حالة الدفع':'Payment'}: {result.paymentStatus}</p></div>}</div>
}
export function MyOrdersPage(){const {t,user,sessionReady,lang}=useStore();const [orders,setOrders]=useState([]);const [error,setError]=useState('');useEffect(()=>{if(user?.role==='customer')api('/orders/mine').then(setOrders).catch(e=>setError(e.message))},[user]);
 if(!sessionReady)return <div className="container page-shell">Loading...</div>;
 if(user?.role!=='customer')return <div className="container page-shell form-page"><h1>{t.myOrders}</h1><p>{lang==='ar'?'سجل دخولك للاطلاع على طلباتك.':'Sign in to see your orders.'}</p><Link to="/login" className="button-primary">{t.signIn}</Link></div>;
 return <div className="container page-shell narrow-page"><div className="page-intro"><span className="eyebrow">ORDER HISTORY</span><h1>{t.myOrders}</h1></div><p role="alert">{error}</p>{orders.length===0?<Empty text={lang==='ar'?'لسه مفيش طلبات':'No orders yet'}/>:<div className="orders-stack">{orders.map(o=><article className="order-item" key={o._id}><div><strong>{o.number}</strong><small>{new Date(o.createdAt).toLocaleDateString(lang==='ar'?'ar-EG':'en-EG')}</small></div><div><strong>{money(o.totalEGP)}</strong><small>{o.status} · {o.paymentStatus}</small></div></article>)}</div>}</div>
}
export function AuthPage({mode}){const {setUser,t,lang}=useStore();const navigate=useNavigate();const [name,setName]=useState('');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 return <div className="container page-shell form-page"><span className="eyebrow">GALLERMO ACCOUNT</span><h1>{mode==='login'?t.signIn:t.signUp}</h1><form className="stack-form" onSubmit={async e=>{e.preventDefault();setError('');setBusy(true);try{const user=await api('/auth/'+(mode==='login'?'login':'register'),{method:'POST',body:JSON.stringify({...(mode==='register'?{name}:{}),email,password})});setUser(user);navigate(user.role==='admin'?'/admin':'/account/orders')}catch(e){setError(e.message)}finally{setBusy(false)}}}>{mode==='register'&&<label>{t.fullname}<input value={name} onChange={e=>setName(e.target.value)} required minLength={2}/></label>}<label>{t.email}<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>{t.password}<input required minLength={mode==='register'?12:1} type="password" autoComplete={mode==='register'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/></label><p className="inline-error" role="alert">{error}</p><button disabled={busy} className="button-primary" type="submit">{mode==='login'?t.login:t.register}<ArrowRight size={17}/></button></form><p>{mode==='login'?<Link to="/register">{t.signUp}</Link>:<Link to="/login">{t.signIn}</Link>}</p></div>
}
export function NotFound(){return <div className="container page-shell"><Empty text="Page not found"/></div>}

const defaultItem=(kind)=>{
 if(kind==='products')return {slug:'',name:{en:'',ar:''},description:{en:'',ar:''},categorySlug:'',images:[],variants:[{sku:'',label:'Standard',priceEGP:0,stock:null}],addons:[],published:false,featured:false};
 if(kind==='categories')return {slug:'',name:{en:'',ar:''},description:{en:'',ar:''},sortOrder:0,published:false};
 if(kind==='bundles')return {slug:'',name:{en:'',ar:''},description:{en:'',ar:''},items:[],priceEGP:0,images:[],published:false};
 return {code:'',kind:'percent',amount:10,minimumEGP:0,maxUses:null,enabled:false};
};
function AdminEditor({kind,item,onCancel,onSaved,products,categories}){
 const {t,lang}=useStore();const [data,setData]=useState(item?structuredClone(item):defaultItem(kind));const [err,setErr]=useState('');const [saving,setSaving]=useState(false);
 const set=(key,value)=>setData(o=>({...o,[key]:value}));
 const setBi=(field,l,value)=>setData(o=>({...o,[field]:{...o[field],[l]:value}}));
 const editArray=(field,i,key,value)=>setData(o=>({...o,[field]:o[field].map((x,j)=>j===i?{...x,[key]:value}:x)}));
 const removeArray=(field,i)=>setData(o=>({...o,[field]:o[field].filter((_,j)=>i!==j)}));
 const input=(id,txt,value,fn,type='text',props={})=><label key={id}>{txt}<input type={type} value={value??''} onChange={e=>fn(type==='number'?Number(e.target.value):e.target.value)} {...props}/></label>;
 const payload=()=>{
  if(kind==='products')return {slug:data.slug,name:data.name,description:data.description||{en:'',ar:''},categorySlug:data.categorySlug,images:data.images||[],variants:(data.variants||[]).map(v=>({sku:v.sku,label:v.label,priceEGP:Number(v.priceEGP),stock:v.stock===''?null:v.stock??null})),addons:data.addons||[],published:!!data.published,featured:!!data.featured};
  if(kind==='categories')return {slug:data.slug,name:data.name,description:data.description||{en:'',ar:''},sortOrder:Number(data.sortOrder)||0,published:!!data.published,...(data.image?{image:data.image}:{})};
  if(kind==='bundles')return {slug:data.slug,name:data.name,description:data.description||{en:'',ar:''},items:data.items.map(x=>({productSlug:x.productSlug,variantSku:x.variantSku,quantity:Number(x.quantity)})),priceEGP:Number(data.priceEGP),images:data.images||[],published:!!data.published};
  return {code:data.code.toUpperCase(),kind:data.kind,amount:Number(data.amount),minimumEGP:Number(data.minimumEGP),maxUses:data.maxUses===''?null:data.maxUses===null?null:Number(data.maxUses),enabled:!!data.enabled,...(data.expiresAt?{expiresAt:new Date(data.expiresAt).toISOString()}: {})};
 };
 const save=async e=>{e.preventDefault();setSaving(true);setErr('');try{
  await api('/admin/'+kind+(item?'/'+item._id:''),{method:item?'PUT':'POST',body:JSON.stringify(payload())});onSaved();
 }catch(e){setErr(e.message)}finally{setSaving(false)}};
 return <form className="admin-editor" onSubmit={save}>
  <div className="section-row"><h2>{item?t.edit:t.create} · {kind}</h2><button type="button" className="button-secondary" onClick={onCancel}>{t.cancel}</button></div>
  {(kind==='products'||kind==='categories'||kind==='bundles')&&<>
    <div className="form-grid">{input('slug','Slug',data.slug,v=>set('slug',v),undefined,{required:true,pattern:'[a-z0-9-]{2,96}'})}{input('name-en','English name',data.name?.en,v=>setBi('name','en',v),undefined,{required:true})}{input('name-ar','Arabic name',data.name?.ar,v=>setBi('name','ar',v))}</div>
    <div className="form-grid"><label>English description<textarea value={data.description?.en||''} onChange={e=>setBi('description','en',e.target.value)}/></label><label>Arabic description<textarea value={data.description?.ar||''} onChange={e=>setBi('description','ar',e.target.value)}/></label></div>
  </>}
  {kind==='categories'&&<div className="form-grid">{input('sort','Display order',data.sortOrder,v=>set('sortOrder',v),'number')}{input('image','Category image URL',data.image||'',v=>set('image',v))}</div>}
  {kind==='products'&&<>
   <label>Category<select value={data.categorySlug} onChange={e=>set('categorySlug',e.target.value)} required><option value="">Choose category</option>{categories.map(c=><option key={c.slug} value={c.slug}>{c.name.en}</option>)}</select></label>
   <div className="admin-subsection"><div className="section-row"><h3>Images</h3><button type="button" className="small-action" onClick={()=>set('images',[...(data.images||[]),{url:'',alt:''}])}><Plus size={15}/> Add image</button></div>
   {(data.images||[]).map((im,i)=><div className="admin-line-editor" key={i}>{input('img-'+i,'Image path (/catalog/...)',im.url,v=>editArray('images',i,'url',v),undefined,{required:true})}{input('alt-'+i,'Alternative text',im.alt,v=>editArray('images',i,'alt',v))}<button type="button" aria-label="Remove image" onClick={()=>removeArray('images',i)}><Trash2 size={16}/></button></div>)}
   <p className="muted">Only existing /catalog/ image URLs work in this foundation. Secure cloud media upload comes next.</p></div>
   <div className="admin-subsection"><div className="section-row"><h3>Sizes / variants</h3><button type="button" className="small-action" onClick={()=>set('variants',[...data.variants,{sku:'',label:'',priceEGP:0,stock:null}])}><Plus size={15}/> Add option</button></div>
   {data.variants?.map((v,i)=><div className="admin-line-editor variant-line" key={i}>{input('sku'+i,'SKU',v.sku,x=>editArray('variants',i,'sku',x),undefined,{required:true})}{input('variant'+i,'Size / name',v.label,x=>editArray('variants',i,'label',x),undefined,{required:true})}{input('price'+i,'Price EGP',v.priceEGP,x=>editArray('variants',i,'priceEGP',x),'number',{min:0,required:true})}{input('stock'+i,'Stock (empty = unmanaged)',v.stock??'',x=>editArray('variants',i,'stock',x===''?null:Number(x)),undefined,{inputMode:'numeric'})}<button type="button" onClick={()=>removeArray('variants',i)} aria-label="Remove option"><Trash2 size={16}/></button></div>)}
   </div>
  </>}
  {kind==='bundles'&&<>
    {input('bundle-price','Bundle price EGP',data.priceEGP,v=>set('priceEGP',v),'number',{required:true,min:0})}
    <div className="admin-subsection"><div className="section-row"><h3>Bundle contents</h3><button type="button" className="small-action" onClick={()=>{const p=products[0];if(p)set('items',[...data.items,{productSlug:p.slug,variantSku:p.variants?.[0]?.sku||'',quantity:1}])}}><Plus size={15}/> Add product</button></div>
     {data.items.map((x,i)=>{const p=products.find(p=>p.slug===x.productSlug);return <div className="admin-line-editor" key={i}><label>Product<select value={x.productSlug} onChange={e=>{const np=products.find(p=>p.slug===e.target.value);setData(old=>({...old,items:old.items.map((it,j)=>i===j?{...it,productSlug:np.slug,variantSku:np.variants?.[0]?.sku||''}:it)}))}}>{products.map(pr=><option key={pr.slug} value={pr.slug}>{pr.name.en}</option>)}</select></label><label>Option<select value={x.variantSku} onChange={e=>editArray('items',i,'variantSku',e.target.value)}>{(p?.variants||[]).map(v=><option key={v.sku} value={v.sku}>{v.label}</option>)}</select></label>{input('qty'+i,'Quantity',x.quantity,v=>editArray('items',i,'quantity',v),'number',{min:1,max:10})}<button type="button" onClick={()=>removeArray('items',i)}><Trash2 size={16}/></button></div>})}
    </div>
    <p className="muted">Bundle availability and component stock enforcement must be finalized before activating sales.</p>
  </>}
  {kind==='codes'&&<div className="form-grid">{input('code','Discount code',data.code,v=>set('code',v.toUpperCase()),undefined,{required:true})}<label>Type<select value={data.kind} onChange={e=>set('kind',e.target.value)}><option value="percent">Percent</option><option value="fixed">Fixed EGP</option></select></label>{input('amount','Amount',data.amount,v=>set('amount',v),'number',{required:true,min:0,max:data.kind==='percent'?100:undefined})}{input('minimum','Minimum cart EGP',data.minimumEGP,v=>set('minimumEGP',v),'number',{min:0})}{input('maximum','Maximum uses (blank = unlimited)',data.maxUses??'',v=>set('maxUses',v===''?null:Number(v)),undefined,{inputMode:'numeric'})}<label>Expires on<input type="date" value={data.expiresAt?String(data.expiresAt).slice(0,10):''} onChange={e=>set('expiresAt',e.target.value)}/></label></div>}
  <div className="checkbox-settings"><label><input type="checkbox" checked={!!(kind==='codes'?data.enabled:data.published)} onChange={e=>set(kind==='codes'?'enabled':'published',e.target.checked)}/> {kind==='codes'?'Enabled':'Published'}</label>{kind==='products'&&<label><input type="checkbox" checked={!!data.featured} onChange={e=>set('featured',e.target.checked)}/> Featured</label>}</div>
  <p className="inline-error" role="alert">{err}</p><button className="button-primary" disabled={saving} type="submit">{saving?'Saving...':t.save}<CheckCircle2 size={17}/></button>
 </form>
}
function AdminOrders({items,onRefresh}){const [err,setErr]=useState('');const patch=async(id,field,value)=>{try{await api('/admin/orders/'+id,{method:'PATCH',body:JSON.stringify({[field]:value})});onRefresh()}catch(e){setErr(e.message)}};
 return <><p role="alert" className="inline-error">{err}</p><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Fulfillment</th><th>Payment</th><th>Date</th></tr></thead><tbody>{items.map(x=><tr key={x._id}><td><strong>{x.number}</strong></td><td>{x.customer?.name}<small>{x.customer?.phone}</small></td><td>{money(x.totalEGP)}<small>{x.paymentMethod}</small></td><td><select value={x.status} onChange={e=>patch(x._id,'status',e.target.value)}>{['pending','confirmed','processing','shipped','delivered','cancelled'].map(v=><option key={v}>{v}</option>)}</select></td><td><select value={x.paymentStatus} onChange={e=>patch(x._id,'paymentStatus',e.target.value)}>{['unpaid','awaiting_transfer','proof_submitted','verified','rejected'].map(v=><option key={v}>{v}</option>)}</select></td><td>{new Date(x.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div><p className="muted">Manually verify InstaPay inside the receiving banking account before setting payment to verified. No screenshot can be considered proof on its own.</p></>
}
export function AdminPage(){const {user,sessionReady,t,lang}=useStore();const [tab,setTab]=useState('products');const [rows,setRows]=useState([]);const [products,setProducts]=useState([]);const [categories,setCategories]=useState([]);const [editing,setEditing]=useState(undefined);const [err,setErr]=useState('');const [busy,setBusy]=useState(false);const [query,setQuery]=useState('');
 const load=async()=>{setBusy(true);setErr('');try{const [data,ps,cs]=await Promise.all([api('/admin/'+(tab==='orders'?'orders':tab)),api('/admin/products'),api('/admin/categories')]);setRows(data);setProducts(ps);setCategories(cs)}catch(e){setErr(e.message)}finally{setBusy(false)}};
 useEffect(()=>{if(user?.role==='admin')load()},[tab,user]);
 if(!sessionReady)return <div className="container page-shell">Loading...</div>;
 if(user?.role!=='admin')return <div className="container page-shell form-page"><h1>Restricted admin area</h1><Link className="button-primary" to="/login">{t.signIn}</Link></div>;
 const tabs=[['products',t.products],['categories',t.categories],['bundles',t.bundles],['codes',t.codes],['orders',t.ordersAdmin]];
 const filtered=rows.filter(x=>`${x.name?.en||x.number||x.code||''} ${x.slug||''}`.toLowerCase().includes(query.toLowerCase()));
 const remove=async item=>{if(!window.confirm(`Remove ${item.name?.en||item.code||item.slug}?`))return;try{await api('/admin/'+tab+'/'+item._id,{method:'DELETE'});load()}catch(e){setErr(e.message)}};
 return <div className="container page-shell admin-page"><div className="page-intro"><span className="eyebrow">GALLERMO / MANAGEMENT</span><h1>{t.adminConsole}</h1><p>{lang==='ar'?'إدارة المنتجات والأقسام والباقات والخصومات والطلبات':'Products, collections, bundles, promotions and orders.'}</p></div>
  <div className="admin-tabs" role="tablist" aria-label="Admin sections">{tabs.map(([key,title])=><button key={key} type="button" role="tab" aria-selected={tab===key} className={tab===key?'active':''} onClick={()=>{setTab(key);setEditing(undefined);setQuery('')}}>{title}</button>)}</div>
  <p className="inline-error" role="alert">{err}</p>
  {editing!==undefined?<AdminEditor key={editing?._id||'new-'+tab} kind={tab} item={editing} products={products.filter(p=>!p.deletedAt)} categories={categories} onCancel={()=>setEditing(undefined)} onSaved={()=>{setEditing(undefined);load()}}/>:<>
   <div className="admin-toolbar"><label className="admin-search">Search entries<input placeholder="Search entries" value={query} onChange={e=>setQuery(e.target.value)}/></label><span>{filtered.length} entries</span>{tab!=='orders'&&<button className="button-primary" onClick={()=>setEditing(null)}><Plus size={16}/>{t.create}</button>}</div>
   {busy?<p>Loading...</p>:tab==='orders'?<AdminOrders items={filtered} onRefresh={load}/>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name / code</th><th>{tab==='products'?'Category':tab==='categories'?'Order':tab==='bundles'?'Price':'Discount'}</th><th>Visibility</th><th>Actions</th></tr></thead><tbody>{filtered.map(x=><tr key={x._id}><td><strong>{x.name?.en||x.code}</strong><small>{x.slug||x.code}</small></td><td>{tab==='products'?x.categorySlug:tab==='categories'?x.sortOrder:tab==='bundles'?money(x.priceEGP):`${x.amount}${x.kind==='percent'?'%':' EGP'}`}</td><td><span className={'status-pill '+(x.published||x.enabled?'on':'off')}>{x.deletedAt?'Archived':x.published||x.enabled?'Active':'Draft'}</span></td><td><div className="admin-actions"><button type="button" onClick={()=>setEditing(x)}>{t.edit}</button><button type="button" onClick={()=>remove(x)}>{t.remove}</button></div></td></tr>)}</tbody></table></div>}
  </>}
 </div>
}
