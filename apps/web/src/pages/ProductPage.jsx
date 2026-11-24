import React,{useEffect,useRef,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {ArrowRight,ChevronLeft,ChevronRight,Minus,Plus} from 'lucide-react';
import {api,FlyToCart,label,money,ProductCard,useStore} from '../App.jsx';
import {LoadingState,RetryState,StoreImage} from '../components/LoadingState.jsx';
import {ArtworkDialog} from '../components/Artwork.jsx';
import {sizeInfo,variantLabel} from '../sizes.js';
import {productStructuredData} from '../product-metadata.js';

export function ProductPage(){
  const {slug}=useParams();
  return <ProductRoute key={slug} slug={slug}/>;
}
function ProductRoute({slug}){
  const {initial,lang}=useStore();
  const direct=initial.product?.slug===slug;
  const path='/products/'+encodeURIComponent(slug);
  const [record,setRecord]=useState(()=>direct?{product:initial.product,related:initial.related}:null);
  const [status,setStatus]=useState(direct?200:initial.detailSlug===slug?initial.detailStatus:0);
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    if(direct&&retry===0)return;
    if(initial.detailSlug===slug&&initial.detailStatus>=400&&retry===0)return;
    const controller=new AbortController();
    setStatus(0);
    api(path,{signal:controller.signal}).then(product=>{
      setRecord({product,related:[]});setStatus(200);
      return api(path+'/related',{signal:controller.signal}).then(related=>setRecord({product,related})).catch(()=>{});
    }).catch(error=>{if(error.name!=='AbortError')setStatus(error.status||503);});
    return ()=>controller.abort();
  },[path,retry]);
  if(!record||status!==200)return <div className="container page-shell">
    {status===404?<p role="status">{lang==='ar'?'هذا المنتج غير موجود.':'Product not found.'}</p>:status?
      <RetryState lang={lang} onRetry={()=>setRetry(value=>value+1)}/>:<LoadingState kind="products" count={2} label={lang==='ar'?'جارٍ تحميل المنتج':'Loading product'}/>}
  </div>;
  return <ProductDetail product={record.product} related={record.related}/>;
}
function ProductDetail({product,related}){
  const {initial,lang,t,add,config}=useStore();
  const ar=lang==='ar';
  const [variant,setVariant]=useState(product.variants.find(item=>item.stock!==0)?.sku||product.variants[0]?.sku);
  const [quantity,setQuantity]=useState(1);
  const [photo,setPhoto]=useState(0);
  const [addons,setAddons]=useState([]);
  const [notice,setNotice]=useState('');
  const upload=useRef(null);
  const touch=useRef(null);
  const choice=product.variants.find(item=>item.sku===variant);
  const limit=Math.min(choice?.stock??10,10);
  const extraCost=(product.addons||[]).filter(item=>addons.includes(item.code)).reduce((sum,item)=>sum+item.priceEGP,0);
  const images=product.images||[];
  const size=sizeInfo(choice?.label,product.categorySlug,lang);
  const categoryName=label(product.category?.name,lang);
  const selectPhoto=delta=>setPhoto(index=>(index+delta+images.length)%images.length);
  const addProduct=customizationId=>{
    const accepted=add({
      kind:'product',slug:product.slug,variantSku:choice.sku,variantLabel:choice.label,stock:choice.stock,
      categorySlug:product.categorySlug,requiresPrepayment:product.category?.requiresPrepayment===true,
      quantity,addons,title:label(product.name,lang),image:images[0]?.url,unitPriceEGP:choice.priceEGP+extraCost,customizationId
    });
    setNotice(accepted?(ar?'تمت الإضافة إلى السلة':'Added to your cart'):(ar?'لا يمكن إضافة هذه الكمية إلى السلة.':'That quantity cannot be added to the cart.'));
    return accepted;
  };
  const compare=size.comparison||size.label;
  const title=label(product.name,lang);
  useEffect(()=>{
    document.title=title+' | Gallermo Store';
    const head=document.querySelector('link[rel=canonical]');
    if(head)head.href=new URL('/product/'+encodeURIComponent(product.slug),head.href).href;
    const summary=(label(product.description,lang)||title).replace(/<[^>]+>/g,'').slice(0,155);
    const description=document.querySelector('meta[name=description]');
    if(description)description.content=summary;
    if(initial.staging||!head)return;
    const structured=document.getElementById('product-schema')||document.createElement('script');
    structured.id='product-schema';
    structured.type='application/ld+json';
    structured.textContent=JSON.stringify(productStructuredData({
      product,name:title,description:summary,canonical:head.href,checkoutEnabled:config.checkoutEnabled
    }));
    if(!structured.isConnected)document.head.appendChild(structured);
    return ()=>structured.remove();
  },[title,lang,product,initial.staging,config.checkoutEnabled]);
  return <div className="container page-shell">
    <nav className="product-breadcrumb" aria-label={ar?'مسار الصفحة':'Breadcrumb'}>
      <Link to="/shop">{t.shop}</Link>{categoryName&&<><span aria-hidden="true">/</span><Link to={'/shop?category='+product.categorySlug}>{categoryName}</Link></>}
    </nav>
    <div className="product-detail">
      <div className="detail-gallery" onKeyDown={event=>{
        if(images.length>1&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();selectPhoto((event.key==='ArrowRight'?1:-1)*(ar?-1:1));}
      }}>
        <div className="main-photo" onTouchStart={event=>{touch.current=event.touches[0].clientX;}} onTouchEnd={event=>{
          if(images.length<2||touch.current===null)return;
          const difference=event.changedTouches[0].clientX-touch.current;touch.current=null;
          if(Math.abs(difference)>40)selectPhoto((difference<0?1:-1)*(ar?-1:1));
        }}>
          <StoreImage src={images[photo]?.url} alt={ar?title:images[photo]?.alt||title} width="680" height="680" loading="eager" fetchpriority="high"/>
          {images.length>1&&<div className="gallery-arrows">
            <button className="icon-button" type="button" aria-label={t.previous} onClick={()=>selectPhoto(-1)}>{ar?<ChevronRight/>:<ChevronLeft/>}</button>
            <button className="icon-button" type="button" aria-label={t.next} onClick={()=>selectPhoto(1)}>{ar?<ChevronLeft/>:<ChevronRight/>}</button>
          </div>}
        </div>
        {images.length>1&&<div className="thumbnails">{images.map((image,index)=><button type="button" key={image.url+index} className={photo===index?'active':''}
          onClick={()=>setPhoto(index)} aria-pressed={photo===index} aria-label={(ar?'عرض الصورة ':'View photo ')+(index+1)}><StoreImage src={image.url} alt="" loading="lazy" width="72" height="72"/></button>)}</div>}
      </div>
      <div className="detail-content">
        <h1>{title}</h1>
        <div className="detail-price">{money((choice?.priceEGP??0)+extraCost,lang)}</div>
        {product.variants.length>1&&<fieldset className="choice-field"><legend>{ar?'اختر المقاس':'Choose size'}</legend><div className="size-buttons">
          {product.variants.map(item=><button type="button" key={item.sku} className={item.sku===variant?'selected':''} disabled={item.stock===0} aria-pressed={item.sku===variant}
            onClick={()=>{setVariant(item.sku);setQuantity(value=>Math.min(value,item.stock??10));setNotice('');}}>{variantLabel(item.label,lang,product.categorySlug)}</button>)}
        </div></fieldset>}
        {product.addons?.length>0&&<fieldset className="choice-field"><legend>{ar?'إضافات':'Optional extras'}</legend>
          {product.addons.map(item=><label className="check-row" key={item.code}><input type="checkbox" checked={addons.includes(item.code)}
            onChange={event=>setAddons(values=>event.target.checked?[...values,item.code]:values.filter(code=>code!==item.code))}/>{label(item.label,lang)} - {money(item.priceEGP,lang)}</label>)}
        </fieldset>}
        <div className="quantity-control detail-quantity" aria-label={ar?'الكمية':'Quantity'}>
          <button type="button" disabled={quantity<=1} aria-label={ar?'تقليل الكمية':'Decrease quantity'} onClick={()=>setQuantity(value=>value-1)}><Minus size={17}/></button>
          <output aria-live="polite">{quantity}</output>
          <button type="button" disabled={quantity>=limit} aria-label={ar?'زيادة الكمية':'Increase quantity'} onClick={()=>setQuantity(value=>value+1)}><Plus size={17}/></button>
        </div>
        {product.category?.requiresPrepayment&&<p className="notice-box">{ar?'يتطلب هذا المنتج مقدمًا عند إتمام الطلب.':'This product requires a deposit at checkout.'}</p>}
        <button type="button" className="button-primary big-cta" disabled={!limit} onClick={event=>{if(addProduct())FlyToCart(event);}}>{limit?t.add:(ar?'غير متاح':'Out of stock')}<ArrowRight size={18}/></button>
        {product.category?.customizationEnabled&&<>
          <button className="button-secondary big-cta customize-cta" disabled={!limit||!config.customizationAvailable} type="button" onClick={()=>upload.current.showModal()}>{ar?'خصّص هذا المنتج':'Customize this'}</button>
          {config.customizationAvailable?<ArtworkDialog dialog={upload} lang={lang} product={product} variant={choice} onAccept={id=>addProduct(id)}/>:
            <p className="muted">{ar?'رفع التصاميم غير متاح مؤقتًا.':'Artwork upload is temporarily unavailable.'}</p>}
        </>}
        <p className="inline-success" role="status">{notice}</p>
        <div className="product-accordions faq-list">
          {label(product.description,lang)&&<details><summary>{ar?'الوصف':'Description'}<Plus size={17}/></summary><p>{label(product.description,lang)}</p></details>}
          {categoryName&&<details><summary>{ar?'التفاصيل':'Details'}<Plus size={17}/></summary><p>{categoryName}{size.label?' · '+size.label:''}</p></details>}
          {size.label&&<details><summary>{ar?'دليل المقاسات':'Size guide'}<Plus size={17}/></summary>
            <p>{product.variants.map(item=>variantLabel(item.label,lang,product.categorySlug)).join(' · ')}</p>
            {size.chart&&initial.chart&&<a className="size-chart" href="/size-charts/frames-sizechart.webp" target="_blank" rel="noreferrer">
              <img src="/size-charts/frames-sizechart.webp" loading="lazy" alt={ar?'دليل مرئي لمقاسات الإطارات المعروضة':'Visual comparison chart for the listed frame sizes'}/></a>}
          </details>}
          {compare&&<details><summary>{ar?'عن هذا المقاس':'About this size'}<Plus size={17}/></summary><p>{compare}</p></details>}
          <details><summary>{ar?'الاسترجاع والاستبدال':'Returns & exchanges'}<Plus size={17}/></summary>
            <p>{ar?'تسري حقوق حماية المستهلك القانونية.':'Statutory consumer rights apply.'} <Link className="text-link" to="/information/returns">{ar?'تفاصيل الاسترجاع':'Returns information'}</Link></p></details>
        </div>
      </div>
    </div>
    {related?.length>0&&<section className="section"><h2>{ar?'قد يعجبك أيضًا':'You may also like'}</h2><div className="product-grid">{related.map(item=><ProductCard p={item} key={item.slug}/>)}</div></section>}
  </div>;
}
