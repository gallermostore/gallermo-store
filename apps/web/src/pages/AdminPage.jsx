import React,{useEffect,useRef,useState} from 'react';
import {CheckCircle2,Plus,Trash2} from 'lucide-react';
import {api,label,money,useStore} from '../App.jsx';
import {AdminOrders} from './AdminOrders.jsx';
import {orderError} from './Checkout.jsx';
import {LoadingState,MutationLabel} from '../components/LoadingState.jsx';

const defaultItem=(kind)=>{
 if(kind==='products')return {slug:'',name:{en:'',ar:''},description:{en:'',ar:''},categorySlug:'',images:[],variants:[{sku:'',label:'Standard',priceEGP:0,stock:null}],addons:[],published:false,featured:false};
 if(kind==='categories')return {slug:'',name:{en:'',ar:''},description:{en:'',ar:''},sortOrder:0,published:false,requiresPrepayment:false,customizationEnabled:false};
 if(kind==='bundles')return {slug:'',name:{en:'',ar:''},description:{en:'',ar:''},items:[],priceEGP:0,images:[],published:false};
 return {code:'',kind:'percent',amount:10,minimumEGP:0,maxUses:null,enabled:false};
};
function AdminEditor({kind,item,onCancel,onSaved,products,categories}){
 const {t,lang,refreshCategories,notify}=useStore();const tr=(en,ar)=>lang==='ar'?ar:en;const [data,setData]=useState(item?structuredClone(item):defaultItem(kind));const [err,setErr]=useState('');const [saving,setSaving]=useState(false);
 const [uploading,setUploading]=useState(false);
 const uploadImage=async event=>{
  const file=event.target.files[0];
  event.target.value='';
  if(!file||uploading)return;
  setUploading(true);setErr('');
  try{
   const {url}=await api('/admin/media',{method:'POST',body:file,headers:{'Content-Type':file.type||'application/octet-stream'}});
   if(kind==='categories')set('image',url);
   else setData(old=>({...old,images:[...old.images,{url,alt:''}]}));
   notify('Image uploaded','تم رفع الصورة');
  }catch(error){setErr(orderError(error,lang));notify('Could not upload the image','تعذّر رفع الصورة',true);}
  finally{setUploading(false);}
 };
 const set=(key,value)=>setData(o=>({...o,[key]:value}));
 const setBi=(field,l,value)=>setData(o=>({...o,[field]:{...o[field],[l]:value}}));
 const editArray=(field,i,key,value)=>setData(o=>({...o,[field]:o[field].map((x,j)=>j===i?{...x,[key]:value}:x)}));
 const removeArray=(field,i)=>setData(o=>({...o,[field]:o[field].filter((_,j)=>i!==j)}));
 const input=(id,txt,value,fn,type='text',props={})=><label key={id}>{txt}<input type={type} value={value??''} onChange={e=>fn(type==='number'?Number(e.target.value):e.target.value)} {...props}/></label>;
 const payload=()=>{
  if(kind==='products')return {slug:data.slug,name:data.name,description:data.description||{en:'',ar:''},categorySlug:data.categorySlug,images:data.images||[],variants:(data.variants||[]).map(v=>({sku:v.sku,label:v.label,priceEGP:Number(v.priceEGP),stock:v.stock===''?null:v.stock??null})),addons:data.addons||[],published:!!data.published,featured:!!data.featured};
  if(kind==='categories')return {slug:data.slug,name:data.name,description:data.description||{en:'',ar:''},sortOrder:Number(data.sortOrder)||0,published:!!data.published,requiresPrepayment:data.requiresPrepayment===true,customizationEnabled:data.customizationEnabled===true,...(data.image?{image:data.image}:{})};
  if(kind==='bundles')return {slug:data.slug,name:data.name,description:data.description||{en:'',ar:''},items:data.items.map(x=>({productSlug:x.productSlug,variantSku:x.variantSku,quantity:Number(x.quantity)})),priceEGP:Number(data.priceEGP),images:data.images||[],published:!!data.published};
  return {code:data.code.toUpperCase(),kind:data.kind,amount:Number(data.amount),minimumEGP:Number(data.minimumEGP),maxUses:data.maxUses===''?null:data.maxUses===null?null:Number(data.maxUses),enabled:!!data.enabled,...(data.expiresAt?{expiresAt:new Date(data.expiresAt).toISOString()}: {})};
 };
 const save=async e=>{e.preventDefault();if(saving||uploading)return;setSaving(true);setErr('');try{
  await api('/admin/'+kind+(item?'/'+item._id:''),{method:item?'PUT':'POST',body:JSON.stringify(payload())});if(kind==='categories')void refreshCategories().catch(()=>{});notify('Changes saved','تم حفظ التغييرات');onSaved();
 }catch(e){setErr(orderError(e,lang));notify('Could not save changes','تعذّر حفظ التغييرات',true);}finally{setSaving(false)}};
 return <form className="admin-editor" onSubmit={save}>
  <div className="section-row"><h2>{item?t.edit:t.create} · {({products:t.products,categories:t.categories,bundles:t.bundles,codes:t.codes})[kind]}</h2><button type="button" className="button-secondary" onClick={onCancel}>{t.cancel}</button></div>
  {(kind==='products'||kind==='categories'||kind==='bundles')&&<>
    <label><MutationLabel busy={uploading} label={tr('Upload catalog image','رفع صورة للكتالوج')} lang={lang}/>
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading||saving||(data.images?.length>=8)} onChange={uploadImage}/>
    </label>
    <div className="form-grid">{input('slug',tr('Slug','معرّف الرابط'),data.slug,v=>set('slug',v),undefined,{required:true,pattern:'[a-z0-9-]{2,96}'})}{input('name-en',tr('English name','الاسم بالإنجليزية'),data.name?.en,v=>setBi('name','en',v),undefined,{required:true})}{input('name-ar',tr('Arabic name','الاسم بالعربية'),data.name?.ar,v=>setBi('name','ar',v))}</div>
    <div className="form-grid"><label>{tr('English description','الوصف بالإنجليزية')}<textarea value={data.description?.en||''} onChange={e=>setBi('description','en',e.target.value)}/></label><label>{tr('Arabic description','الوصف بالعربية')}<textarea value={data.description?.ar||''} onChange={e=>setBi('description','ar',e.target.value)}/></label></div>
  </>}
  {kind==='categories'&&<div className="form-grid">{input('sort',tr('Display order','ترتيب العرض'),data.sortOrder,v=>set('sortOrder',v),'number')}{input('image',tr('Category image URL','مسار صورة الفئة'),data.image||'',v=>set('image',v))}</div>}
  {kind==='products'&&<>
   <label>{tr('Category','الفئة')}<select value={data.categorySlug} onChange={e=>set('categorySlug',e.target.value)} required><option value="">{tr('Choose category','اختر الفئة')}</option>{categories.map(c=><option key={c.slug} value={c.slug}>{label(c.name,lang)}</option>)}</select></label>
   <div className="admin-subsection"><div className="section-row"><h3>{tr('Images','الصور')}</h3><button type="button" className="small-action" onClick={()=>set('images',[...(data.images||[]),{url:'',alt:''}])}><Plus size={15}/> {tr('Add image','أضف صورة')}</button></div>
   {(data.images||[]).map((im,i)=><div className="admin-line-editor" key={i}>{input('img-'+i,tr('Image URL','رابط الصورة'),im.url,v=>editArray('images',i,'url',v),undefined,{required:true})}{input('alt-'+i,tr('Alternative text','النص البديل'),im.alt,v=>editArray('images',i,'alt',v))}<button type="button" aria-label={tr('Remove image','حذف الصورة')} onClick={()=>removeArray('images',i)}><Trash2 size={16}/></button></div>)}
   </div>
   <div className="admin-subsection"><div className="section-row"><h3>{tr('Sizes / variants','المقاسات والخيارات')}</h3><button type="button" className="small-action" onClick={()=>set('variants',[...data.variants,{sku:'',label:'',priceEGP:0,stock:null}])}><Plus size={15}/> {tr('Add option','أضف خيارًا')}</button></div>
   {data.variants?.map((v,i)=><div className="admin-line-editor variant-line" key={i}>{input('sku'+i,tr('SKU','رمز المنتج'),v.sku,x=>editArray('variants',i,'sku',x),undefined,{required:true})}{input('variant'+i,tr('Size / name','المقاس أو الاسم'),v.label,x=>editArray('variants',i,'label',x),undefined,{required:true})}{input('price'+i,tr('Price EGP','السعر بالجنيه'),v.priceEGP,x=>editArray('variants',i,'priceEGP',x),'number',{min:0,required:true})}{input('stock'+i,tr('Stock (empty = unmanaged)','المخزون (اتركه فارغًا إن كان غير محدد)'),v.stock??'',x=>editArray('variants',i,'stock',x===''?null:Number(x)),undefined,{inputMode:'numeric'})}<button type="button" onClick={()=>removeArray('variants',i)} aria-label={tr('Remove option','حذف الخيار')}><Trash2 size={16}/></button></div>)}
   </div>
  </>}
  {kind==='bundles'&&<>
    {input('bundle-price',tr('Bundle price EGP','سعر الباقة بالجنيه'),data.priceEGP,v=>set('priceEGP',v),'number',{required:true,min:0})}
    <div className="admin-subsection"><div className="section-row"><h3>{tr('Bundle contents','محتويات الباقة')}</h3><button type="button" className="small-action" onClick={()=>{const p=products[0];if(p)set('items',[...data.items,{productSlug:p.slug,variantSku:p.variants?.[0]?.sku||'',quantity:1}])}}><Plus size={15}/> {tr('Add product','أضف منتجًا')}</button></div>
     {data.items.map((x,i)=>{const p=products.find(p=>p.slug===x.productSlug);return <div className="admin-line-editor" key={i}><label>{tr('Product','المنتج')}<select value={x.productSlug} onChange={e=>{const np=products.find(p=>p.slug===e.target.value);setData(old=>({...old,items:old.items.map((it,j)=>i===j?{...it,productSlug:np.slug,variantSku:np.variants?.[0]?.sku||''}:it)}))}}>{products.map(pr=><option key={pr.slug} value={pr.slug}>{label(pr.name,lang)}</option>)}</select></label><label>{tr('Option','الخيار')}<select value={x.variantSku} onChange={e=>editArray('items',i,'variantSku',e.target.value)}>{(p?.variants||[]).map(v=><option key={v.sku} value={v.sku}>{v.label}</option>)}</select></label>{input('qty'+i,tr('Quantity','الكمية'),x.quantity,v=>editArray('items',i,'quantity',v),'number',{min:1,max:10})}<button type="button" onClick={()=>removeArray('items',i)}><Trash2 size={16}/></button></div>})}
    </div>

  </>}
  {kind==='codes'&&<div className="form-grid">{input('code',tr('Discount code','كود الخصم'),data.code,v=>set('code',v.toUpperCase()),undefined,{required:true})}<label>{tr('Type','النوع')}<select value={data.kind} onChange={e=>set('kind',e.target.value)}><option value="percent">{tr('Percent','نسبة مئوية')}</option><option value="fixed">{tr('Fixed EGP','مبلغ ثابت بالجنيه')}</option></select></label>{input('amount',tr('Amount','القيمة'),data.amount,v=>set('amount',v),'number',{required:true,min:0,max:data.kind==='percent'?100:undefined})}{input('minimum',tr('Minimum cart EGP','الحد الأدنى للسلة بالجنيه'),data.minimumEGP,v=>set('minimumEGP',v),'number',{min:0})}{input('maximum',tr('Maximum uses (blank = unlimited)','أقصى استخدامات (اتركه فارغًا دون حد)'),data.maxUses??'',v=>set('maxUses',v===''?null:Number(v)),undefined,{inputMode:'numeric'})}<label>{tr('Expires on','تاريخ الانتهاء')}<input type="date" value={data.expiresAt?String(data.expiresAt).slice(0,10):''} onChange={e=>set('expiresAt',e.target.value)}/></label></div>}
  {kind==='categories'&&<div className="category-admin-settings">
    <label><input type="checkbox" checked={data.requiresPrepayment===true} onChange={e=>set('requiresPrepayment',e.target.checked)}/>{lang==='ar'?'يتطلب دفع ٥٠٪ مقدمًا عبر إنستا باي':'Requires 50% InstaPay prepayment'}</label>
    <p className="muted">{lang==='ar'?'ينطبق المقدم على إجمالي الطلب إذا احتوى على منتج من هذه الفئة.':'The deposit applies to the whole order when it includes a product in this category.'}</p>
    <label><input type="checkbox" checked={data.customizationEnabled===true} onChange={e=>set('customizationEnabled',e.target.checked)}/>{lang==='ar'?'السماح للعميل برفع تصميمه':'Allow customer to upload their own design'}</label>
    <p className="muted">{lang==='ar'?'يظل الطلب بالتصميم الأصلي متاحًا.':'Customers can still order the original design.'}</p>
  </div>}
  <div className="checkbox-settings"><label><input type="checkbox" checked={!!(kind==='codes'?data.enabled:data.published)} onChange={e=>set(kind==='codes'?'enabled':'published',e.target.checked)}/> {kind==='codes'?tr('Enabled','مفعّل'):tr('Published','منشور')}</label>{kind==='products'&&<label><input type="checkbox" checked={!!data.featured} onChange={e=>set('featured',e.target.checked)}/> {tr('Featured','ضمن المختارات')}</label>}</div>
  <p className="inline-error" role="alert">{err}</p><button className="button-primary" disabled={saving||uploading} type="submit">{saving?tr('Saving…','جارٍ الحفظ…'):t.save}<CheckCircle2 size={17}/></button>
 </form>
}
export default function AdminPage(){const {user,t,lang,refreshCategories,notify}=useStore();const tr=(en,ar)=>lang==='ar'?ar:en;const [tab,setTab]=useState('products');const [rows,setRows]=useState([]);const [products,setProducts]=useState([]);const [categories,setCategories]=useState([]);const [editing,setEditing]=useState(undefined);const [err,setErr]=useState('');const [busy,setBusy]=useState(false);const [query,setQuery]=useState('');
 const loadVersion=useRef(0);
 const load=async(signal)=>{
  const version=++loadVersion.current;
  setBusy(true);setErr('');
  const options={signal};
  try{
   const primary=api('/admin/'+tab,options);
   const [data,ps,cs]=await Promise.all([primary,tab==='products'?primary:api('/admin/products',options),tab==='categories'?primary:api('/admin/categories',options)]);
   if(version===loadVersion.current&&!signal?.aborted){setRows(data);setProducts(ps);setCategories(cs);}
  }catch(error){if(version===loadVersion.current&&error.name!=='AbortError')setErr(orderError(error,lang));}
  finally{if(version===loadVersion.current&&!signal?.aborted)setBusy(false);}
 };
 useEffect(()=>{
  if(user?.role!=='admin')return;
  const controller=new AbortController();void load(controller.signal);
  return ()=>controller.abort();
 },[tab,user]);
 const tabs=[['products',t.products],['categories',t.categories],['bundles',t.bundles],['codes',t.codes],['orders',t.ordersAdmin]];
 const filtered=rows.filter(x=>`${(label(x.name,lang)||x.name?.en)||x.number||x.code||''} ${x.slug||''}`.toLowerCase().includes(query.toLowerCase()));
 const deleting=useRef(false);
 const remove=async item=>{if(deleting.current||!window.confirm(tr('Remove this entry?','هل تريد حذف هذا العنصر؟')))return;deleting.current=true;try{await api('/admin/'+tab+'/'+item._id,{method:'DELETE'});if(tab==='categories')void refreshCategories().catch(()=>{});notify('Entry removed','تم حذف العنصر');void load()}catch(e){setErr(orderError(e,lang));notify('Could not remove the entry','تعذّر حذف العنصر',true);}finally{deleting.current=false;}};
 return <div className="container page-shell admin-page"><div className="page-intro"><h1>{t.adminConsole}</h1><p>{lang==='ar'?'إدارة المنتجات والأقسام والباقات والخصومات والطلبات':'Products, collections, bundles, promotions and orders.'}</p></div>
  <div className="admin-tabs" role="tablist" aria-label={tr('Admin sections','أقسام الإدارة')}>{tabs.map(([key,title])=><button key={key} type="button" role="tab" aria-selected={tab===key} className={tab===key?'active':''} onClick={()=>{setTab(key);setEditing(undefined);setQuery('')}}>{title}</button>)}</div>
  <p className="inline-error" role="alert">{err}</p>
  {editing!==undefined?<AdminEditor key={editing?._id||'new-'+tab} kind={tab} item={editing} products={products.filter(p=>!p.deletedAt)} categories={categories} onCancel={()=>setEditing(undefined)} onSaved={()=>{setEditing(undefined);load()}}/>:<>
   <div className="admin-toolbar"><label className="admin-search">{tr('Search entries','البحث في السجلات')}<input placeholder={tr('Search entries','البحث في السجلات')} value={query} onChange={e=>setQuery(e.target.value)}/></label><span>{new Intl.NumberFormat(lang==='ar'?'ar-EG':'en-EG').format(filtered.length)} {tr('entries','سجل')}</span>{tab!=='orders'&&<button className="button-primary" onClick={()=>setEditing(null)}><Plus size={16}/>{t.create}</button>}</div>
   {busy?<LoadingState label={lang==='ar'?'جارٍ التحميل':'Loading entries'}/>:tab==='orders'?<AdminOrders items={filtered} onRefresh={()=>void load()}/>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{tr('Name / code','الاسم أو الكود')}</th><th>{tab==='products'?tr('Category','الفئة'):tab==='categories'?tr('Order','الترتيب'):tab==='bundles'?tr('Price','السعر'):tr('Discount','الخصم')}</th><th>{tr('Visibility','حالة النشر')}</th><th>{tr('Actions','الإجراءات')}</th></tr></thead><tbody>{filtered.map(x=><tr key={x._id}><td><strong>{label(x.name,lang)||x.code}</strong><small>{x.slug||x.code}</small></td><td>{tab==='products'?x.categorySlug:tab==='categories'?x.sortOrder:tab==='bundles'?money(x.priceEGP,lang):`${x.amount}${x.kind==='percent'?'%':' EGP'}`}</td><td><span className={'status-pill '+(x.published||x.enabled?'on':'off')}>{x.deletedAt?tr('Archived','مؤرشف'):x.published||x.enabled?tr('Active','نشط'):tr('Draft','مسودة')}</span></td><td><div className="admin-actions"><button type="button" onClick={()=>setEditing(x)}>{t.edit}</button><button type="button" onClick={()=>remove(x)}>{t.remove}</button></div></td></tr>)}</tbody></table></div>}
  </>}
 </div>
}
