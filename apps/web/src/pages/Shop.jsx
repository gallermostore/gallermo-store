import React,{useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {Search,SlidersHorizontal,ArrowDownUp} from 'lucide-react';
import {api,label,ProductCard,useStore} from '../App.jsx';
import {catalogQuery} from '../catalog-query.js';
import {LoadingState,RetryState} from '../components/LoadingState.jsx';

const fields=['category','availability','minPrice','maxPrice'];
const sorts=[
  ['featured','Featured','مختارات'],['newest','Newest','الأحدث'],['price_asc','Price: low to high','السعر: من الأقل للأعلى'],
  ['price_desc','Price: high to low','السعر: من الأعلى للأقل'],['name','Name','الاسم']
];
function valuesFrom(params) {
  return Object.fromEntries(fields.map(key=>[key,params.get(key)||'']));
}
function FilterForm({initial,categories,lang,t,onApply,dialog=false}) {
  const ar=lang==='ar';
  const [draft,setDraft]=useState(initial);
  const [error,setError]=useState('');
  const change=event=>{setDraft({...draft,[event.target.name]:event.target.value});setError('');};
  return <form className="catalog-filters" onSubmit={event=>{
    event.preventDefault();
    if(draft.minPrice&&draft.maxPrice&&Number(draft.minPrice)>Number(draft.maxPrice)){
      setError(ar?'يجب ألا يقل الحد الأقصى عن الحد الأدنى.':'Maximum price must be at least the minimum.');
      return;
    }
    onApply(draft);
  }}>
    <details open><summary>{t.categories}</summary><label className="filter-select"><span className="sr-only">{t.categories}</span>
      <select name="category" value={draft.category} onChange={change}>
        <option value="">{ar?'جميع الفئات':'All categories'}</option>
        {categories.map(category=><option key={category.slug} value={category.slug}>{label(category.name,lang)}</option>)}
      </select></label></details>
    <details open><summary>{ar?'التوفر':'Availability'}</summary><label className="filter-select"><span className="sr-only">{ar?'التوفر':'Availability'}</span>
      <select name="availability" value={draft.availability} onChange={change}><option value="">{t.all}</option>
        <option value="in_stock">{ar?'متاح':'In stock'}</option><option value="out_of_stock">{ar?'غير متاح':'Out of stock'}</option>
      </select></label></details>
    <details open><summary>{ar?'السعر (ج.م.)':'Price (EGP)'}</summary><div className="price-inputs">
      <label>{ar?'الأدنى':'Minimum'}<input type="number" inputMode="decimal" name="minPrice" min="0" max="1000000" step=".01" value={draft.minPrice} onChange={change}/></label>
      <label>{ar?'الأقصى':'Maximum'}<input type="number" inputMode="decimal" name="maxPrice" min="0" max="1000000" step=".01" value={draft.maxPrice} onChange={change}/></label>
    </div></details>
    {error&&<p className="inline-error" role="alert">{error}</p>}
    <button className="button-secondary" type="button" onClick={()=>{
      const cleared=valuesFrom(new URLSearchParams());
      setDraft(cleared);setError('');
      if(!dialog)onApply(cleared);
    }}>{ar?'مسح الكل':'Clear all'}</button>
    <button className="button-primary" type="submit">{dialog?(ar?'عرض النتائج':'View results'):(ar?'تطبيق الفلاتر':'Apply filters')}</button>
  </form>;
}
export function Shop(){
  const {initial,t,lang,categories}=useStore();
  const ar=lang==='ar';
  const [params,setParams]=useSearchParams();
  const key=catalogQuery(params);
  const q=params.get('q')||'';
  const [text,setText]=useState(q);
  const [retry,setRetry]=useState(0);
  const [record,setRecord]=useState(()=>initial.shopQuery===key?{key,data:initial.products,status:initial.productsStatus}:null);
  const unusedInitial=useRef(initial.shopQuery===key);
  const dialog=useRef(null);
  const results=useRef(null);
  const focusOnChange=useRef(false);
  const opener=useRef(null);
  const [drawer,setDrawer]=useState(null);
  const [sortDraft,setSortDraft]=useState('featured');
  const sort=params.get('sort')||'featured';
  const selectedCategory=categories.find(category=>category.slug===params.get('category'));
  const current=record?.key===key?record:null;
  const loading=!current||current.status==='loading';
  const state=current?.data;
  useEffect(()=>setText(q),[q]);
  useEffect(()=>{
    if(unusedInitial.current){unusedInitial.current=false;return;}
    const controller=new AbortController();
    setRecord({key,status:'loading'});
    api('/products?'+key,{signal:controller.signal}).then(data=>setRecord({key,status:200,data})).catch(error=>{
      if(error.name!=='AbortError')setRecord({key,status:error.status||503});
    });
    return ()=>controller.abort();
  },[key,retry]);
  useEffect(()=>{
    if(!loading && focusOnChange.current){
      focusOnChange.current=false;
      results.current?.focus({preventScroll:true});
      results.current?.scrollIntoView({block:'start',behavior:'instant'});
    }
  },[loading,key]);
  useEffect(()=>{
    if(!drawer)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const breakpoint=matchMedia('(min-width:781px)');
    const resize=()=>{if(breakpoint.matches)dialog.current?.close();};
    breakpoint.addEventListener('change',resize);
    return ()=>{document.body.style.overflow=previous;breakpoint.removeEventListener('change',resize);};
  },[drawer]);
  const update=(changes)=>{
    const next=new URLSearchParams(params);
    next.delete('page');
    for(const [name,value] of Object.entries(changes)){
      if(value)next.set(name,value);
      else next.delete(name);
    }
    if(catalogQuery(next)===key)return;
    focusOnChange.current=true;
    setParams(next);
  };
  const open=(type,event)=>{
    opener.current=event.currentTarget;
    setSortDraft(sort);
    setDrawer(type);
    dialog.current.showModal();
  };
  const pager=number=>{
    const next=new URLSearchParams(params);
    if(number>1)next.set('page',String(number));
    else next.delete('page');
    return '/shop'+(next.size?'?'+next.toString():'');
  };
  const filterLabel=ar?'الفلاتر':'Filters';
  const sortLabel=ar?'الترتيب':'Sort';
  const sortOptions=sorts.map(([value,en,arabic])=><option key={value} value={value}>{ar?arabic:en}</option>);
  const apply=filters=>{dialog.current?.close();update(filters);};
  return <div className="container page-shell">
    <div className="page-intro"><h1>{selectedCategory?label(selectedCategory.name,lang):t.shop}</h1>
      <p>{selectedCategory?label(selectedCategory.description,lang):ar?'اختر القطعة التي تعبّر عنك.':'Find the piece that feels like you.'}</p></div>
    <form className="search-form catalog-search" onSubmit={e=>{e.preventDefault();update({q:text.trim()});}}>
      <label htmlFor="catalog-search">{ar?'بحث':'Search'}</label><Search size={19} aria-hidden="true"/>
      <input id="catalog-search" value={text} maxLength={75} onChange={e=>setText(e.target.value)} placeholder={t.search}/>
      <button type="submit">{ar?'بحث':'Search'}</button>
    </form>
    <div className="mobile-catalog-controls">
      <button type="button" className="button-secondary" onClick={e=>open('filters',e)}><SlidersHorizontal size={17}/>{filterLabel}</button>
      <button type="button" className="button-secondary" onClick={e=>open('sort',e)}><ArrowDownUp size={17}/>{sortLabel}</button>
    </div>
    <dialog ref={dialog} className="catalog-dialog" aria-label={drawer==='filters'?filterLabel:sortLabel}
      onClick={e=>{if(e.target===e.currentTarget){const bounds=e.currentTarget.getBoundingClientRect();if(e.clientX<bounds.left||e.clientX>bounds.right||e.clientY<bounds.top||e.clientY>bounds.bottom)dialog.current.close();}}}
      onClose={()=>{setDrawer(null);opener.current?.focus({preventScroll:true});}}>
      {drawer&&<div className="catalog-dialog-content"><div className="section-row"><h2>{drawer==='filters'?filterLabel:sortLabel}</h2>
        <button type="button" className="button-secondary" onClick={()=>dialog.current.close()}>{t.cancel}</button></div>
        {drawer==='filters'?<FilterForm initial={valuesFrom(params)} categories={categories} lang={lang} t={t} onApply={apply} dialog/>:
          <form className="stack-form" onSubmit={e=>{e.preventDefault();apply({sort:sortDraft==='featured'?'':sortDraft});}}>
            <label>{sortLabel}<select value={sortDraft} onChange={e=>setSortDraft(e.target.value)}>{sortOptions}</select></label>
            <button type="submit" className="button-primary">{ar?'عرض النتائج':'View results'}</button>
          </form>}
      </div>}
    </dialog>
    <div className="catalog-layout">
      <aside className="desktop-catalog-filters"><h2>{filterLabel}</h2>
        <FilterForm key={JSON.stringify(valuesFrom(params))} initial={valuesFrom(params)} categories={categories} lang={lang} t={t} onApply={update}/>
      </aside>
      <section className="catalog-results" ref={results} tabIndex={-1} aria-label={ar?'النتائج':'Results'}>
        <div className="catalog-result-bar">
          <span role="status">{loading?(ar?'جارٍ التحميل…':'Loading…'):state?`${new Intl.NumberFormat(ar?'ar-EG':'en-EG').format(state.total)} ${ar?'منتج':'products'}`:''}</span>
          <label>{sortLabel}<select value={sort} onChange={e=>update({sort:e.target.value==='featured'?'':e.target.value})}>{sortOptions}</select></label>
          <span className="mobile-active-sort">{sorts.find(([id])=>id===sort)?.[ar?2:1]}</span>
        </div>
        {loading?<LoadingState kind="products" label={ar?'جارٍ التحميل':'Loading products'} count={8}/>:!state?
          <RetryState lang={lang} invalid={current.status===400} onRetry={current.status===400?()=>setParams(new URLSearchParams()):()=>setRetry(value=>value+1)}/>:
          state.items.length?<div className="product-grid">{state.items.map(product=><ProductCard key={key+product.slug} p={product}/>)}</div>:
          <div className="empty-state"><p>{t.noProducts}</p><button type="button" className="button-secondary" onClick={()=>update(valuesFrom(new URLSearchParams()))}>{ar?'مسح الفلاتر':'Clear filters'}</button></div>}
        {state&&state.total>state.limit&&<nav className="pagination" aria-label={ar?'صفحات النتائج':'Result pages'}>
          {state.page>1&&<Link to={pager(state.page-1)} onClick={()=>{focusOnChange.current=true;}}>{t.previous}</Link>}
          <span>{state.page} / {Math.ceil(state.total/state.limit)}</span>
          {state.page<Math.ceil(state.total/state.limit)&&<Link to={pager(state.page+1)} onClick={()=>{focusOnChange.current=true;}}>{t.next}</Link>}
        </nav>}
      </section>
    </div>
  </div>;
}
