import React,{useEffect,useRef,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {ArrowRight,Banknote,Copy,Smartphone} from 'lucide-react';
import {api,money,useStore} from '../App.jsx';
import {madeToOrder} from '../components/Information.jsx';
import {uploadFile} from '../components/Artwork.jsx';
import {LoadingState,RetryState,MutationLabel} from '../components/LoadingState.jsx';

const attemptKey='gallermo:pending-order';
function pendingAttempt(){
 try{return JSON.parse(sessionStorage.getItem(attemptKey)||'null');}catch{return null;}
}
function rememberAttempt(value){
 try{if(value)sessionStorage.setItem(attemptKey,JSON.stringify(value));else sessionStorage.removeItem(attemptKey);}catch{}
}
const methods={
  cod:['Cash on delivery','الدفع عند الاستلام'],
  instapay:['Full InstaPay payment','الدفع بالكامل عبر إنستاباي'],
  instapay_deposit:['50% InstaPay deposit','مقدم ٥٠٪ عبر إنستا باي']
};
export function orderError(error,lang){
  if(lang!=='ar')return error.message;
  return ({
    STALE_QUOTE:'تغيّرت تفاصيل الطلب. احسب الإجمالي مرة أخرى.',
    PAYMENT_PLAN_CHANGED:'اختر طريقة دفع متاحة لهذا الطلب.',
    INVALID_IMAGE:'اختر صورة صالحة ضمن الحد المحدد.',
    UPLOAD_UNAVAILABLE:'الصورة غير متاحة. ارفعها مرة أخرى.',
    REFERENCE_USED:'الرقم المرجعي مرتبط بطلب آخر.',
    STOCK_UNAVAILABLE:'الكمية المطلوبة غير متاحة.',
    DISCOUNT_UNAVAILABLE:'كود الخصم غير متاح.',
    BALANCE_REQUIRED:'سجّل المبلغ الذي تم تحصيله عند الاستلام.',
    PAYMENT_REQUIRED:'تحقق من الدفعة المطلوبة قبل تنفيذ الطلب.',
    SHIPPING_UNAVAILABLE:'الشحن غير متاح لهذه المحافظة.'
  })[error.code]||'تعذّر إكمال الطلب. راجع البيانات وحاول مرة أخرى.';
}
export function checkoutLines(cart){
  return cart.map(({kind,slug,variantSku,quantity,addons,customizationId})=>({kind,slug,variantSku,quantity,addons,customizationId}));
}
export function CheckoutPage(){
  const {cart,cartReady,setCart,user,sessionReady,sessionError,loadSession,config,t,lang,notify}=useStore();
  const ar=lang==='ar';
  const i=ar?1:0;
  const navigate=useNavigate();
  const [form,setForm]=useState({name:'',email:'',phone:'',governorate:'',address:'',notes:''});
  const [discount,setDiscount]=useState('');
  const [appliedDiscount,setAppliedDiscount]=useState('');
  const [quoteRetry,retryQuote]=useState(0);
  const [quoting,setQuoting]=useState(false);
  const [quote,setQuote]=useState(null);
  const [method,setMethod]=useState('');
  const [proof,setProof]=useState(null);
  const [reference,setReference]=useState('');
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [copy,setCopy]=useState('');
  const [pending,setPending]=useState(null);
  const [recoveryError,setRecoveryError]=useState(false);
  const submitKey=useRef(null);
  const proofRef=useRef(null);
  const confirmedDiscount=useRef('');
  const requestedDiscount=useRef(null);
  const draft=JSON.stringify({lines:checkoutLines(cart),discountCode:appliedDiscount,governorate:form.governorate});
  const active=quote?.draft===draft?quote.data:null;
  const plan=active?.plans.find(plan=>plan.method===method);
  const transfer=plan&&plan.method!=='cod'&&plan.requiredUpfrontPiastres>0;
  const enabled=config.checkoutEnabled&&sessionReady&&user?.role!=='admin';
  const cartSignature=JSON.stringify(checkoutLines(cart));
  useEffect(()=>{if(user)setForm(old=>({...old,name:old.name||user.name,email:old.email||user.email}));},[user]);
  function finishOrder(result,clearCart){
    rememberAttempt(null);
    notify('Order received','تم استلام طلبك');
    if(clearCart)setCart([]);
    navigate('/order-confirmed/'+encodeURIComponent(result.number),{state:{order:result},replace:true});
  }
  const recover=async(attempt,signal)=>{
    setRecoveryError(false);
    try{
      const result=await api('/orders/recover',{method:'POST',body:JSON.stringify({key:attempt.key}),signal});
      if(!signal?.aborted)finishOrder(result,attempt.cart===cartSignature);
    }catch(error){
      if(error.name!=='AbortError'&&error.status!==404)setRecoveryError(true);
    }
  };
  useEffect(()=>{
    if(!enabled||!cartReady)return;
    const attempt=pendingAttempt();
    if(!attempt)return;
    setPending(attempt);
    const controller=new AbortController();
    void recover(attempt,controller.signal);
    return ()=>controller.abort();
  },[enabled,cartReady]);
  useEffect(()=>{
    if(!enabled||!cartReady||!cart.length||!form.governorate)return;
    const controller=new AbortController();
    setQuoting(true);setError('');
    api('/orders/quote',{method:'POST',body:draft,signal:controller.signal}).then(data=>{
      setQuote({draft,data});
      confirmedDiscount.current=data.discountCode||'';
      if(requestedDiscount.current!==null&&requestedDiscount.current===appliedDiscount){
        if(appliedDiscount)notify('Discount applied','تم تطبيق الخصم');
        else notify('Discount removed','تمت إزالة الخصم');
        requestedDiscount.current=null;
      }
      setMethod(current=>data.plans.some(option=>option.method===current)?current:data.plans[0].method);
    }).catch(err=>{
      if(err.name==='AbortError')return;
      setQuote(null);setError(orderError(err,lang));
      if(err.code==='DISCOUNT_UNAVAILABLE'){
        notify('That discount code is unavailable','كود الخصم ده غير متاح',true);
        requestedDiscount.current=null;
        setAppliedDiscount(appliedDiscount===confirmedDiscount.current?'':confirmedDiscount.current);
      }else if(requestedDiscount.current!==null){
        requestedDiscount.current=null;
        notify('Could not update the order total','تعذّر تحديث إجمالي الطلب',true);
      }
    }).finally(()=>{if(!controller.signal.aborted)setQuoting(false);});
    return ()=>controller.abort();
  },[enabled,cartReady,draft,quoteRetry]);
  function calculate(){
    const code=discount.trim();
    if(code!==appliedDiscount){requestedDiscount.current=code;setAppliedDiscount(code);}
    else retryQuote(value=>value+1);
  }
  async function submit(event){
    event.preventDefault();
    if(busy||quoting||!active||!plan||!enabled)return;
    setBusy(transfer&&!proofRef.current?.id?'proof':'order');setError('');
    try{
      let proofId;
      if(transfer){
        if(!proof)throw new Error(ar?'أضف صورة التحويل.':'Add a transfer screenshot.');
        if(proofRef.current?.file!==proof)proofRef.current={file:proof,id:(await uploadFile(proof,'payment')).id};
        proofId=proofRef.current.id;
        setBusy('order');
      }
      const {lines,discountCode}=JSON.parse(draft);
      const request={lines,discountCode,customer:form,locale:lang,paymentMethod:method,paymentProofId:proofId,paymentReference:transfer?reference:undefined};
      const fingerprint=JSON.stringify(request);
      if(submitKey.current?.fingerprint!==fingerprint){
        const saved=pendingAttempt();
        submitKey.current={fingerprint,key:saved?.cart===cartSignature?saved.key:crypto.randomUUID()};
      }
      const attempt={key:submitKey.current.key,cart:cartSignature};
      rememberAttempt(attempt);
      setPending(attempt);
      const result=await api('/orders',{method:'POST',body:JSON.stringify({...request,quoteToken:active.quoteToken,idempotencyKey:submitKey.current.key})});
      finishOrder(result,true);
    }catch(error){
      if(error.code==='STALE_QUOTE'||error.code==='PAYMENT_PLAN_CHANGED'){setQuote(null);retryQuote(value=>value+1);}
      if(error.code==='RETRY_MISMATCH'&&pendingAttempt())void recover(pendingAttempt());
      setError(orderError(error,lang));
      notify('Your order could not be submitted','تعذّر إرسال طلبك',true);
    }finally{setBusy('');}
  }
  if(!cartReady)return <div className="container page-shell"><LoadingState label={ar?'جارٍ تحميل السلة':'Loading cart'}/></div>;
  if(!cart.length)return <div className="container page-shell"><h1>{t.checkout}</h1><p>{t.empty}</p><Link className="button-secondary" to="/shop">{t.shop}</Link></div>;
  return <div className="container page-shell narrow-page">
    <div className="page-intro"><h1>{t.checkout}</h1></div>
    {pending&&<div className="notice-box"><button type="button" className="button-secondary" onClick={()=>recover(pending)}>{ar?'تحقّق من الطلب السابق':'Check previous submission'}</button>{recoveryError&&<p role="alert">{ar?'تعذّر التحقق الآن.':'The previous submission could not be checked.'}</p>}</div>}
    {sessionError&&<RetryState lang={lang} onRetry={()=>loadSession()}/>}
    {!enabled&&<p className="notice-box" role="status">{user?.role==='admin'?(ar?'يرجى تسجيل الدخول كعميل.':'Sign in as a customer to check out.'):t.unavailable}</p>}
    <div className="cart-layout checkout-layout">
      <form id="checkout-form" className="checkout-form" onSubmit={submit}>
        <h2>{ar?'بيانات التواصل':'Contact information'}</h2>
        <fieldset disabled={!enabled||!!busy} className="checkout-fields">
          <div className="form-grid">
            {[
              ['name',t.fullname,'text','name'],['email',t.email,'email','email'],['phone',t.phone,'tel','tel']
            ].map(([key,title,type,complete])=><label key={key}>{title}<input value={form[key]} required type={type} autoComplete={complete}
              onChange={event=>setForm(old=>({...old,[key]:event.target.value}))} minLength={key==='name'?2:undefined} maxLength={key==='name'?100:key==='email'?150:16} pattern={key==='phone'?'\\+?[0-9]{10,15}':undefined}/></label>)}
          </div>
          <h2>{ar?'بيانات التوصيل':'Delivery details'}</h2>
          <div className="form-grid">
            <label>{t.address}<input value={form.address} required autoComplete="street-address" minLength={8} maxLength={300} onChange={event=>setForm(old=>({...old,address:event.target.value}))}/></label>
            <label>{t.gov}<select required value={form.governorate} onChange={event=>setForm(old=>({...old,governorate:event.target.value}))}>
              <option value="">{ar?'اختر المحافظة':'Choose governorate'}</option>{config.governorates?.map(zone=><option key={zone.id} value={zone.id}>{zone.name[lang]}</option>)}
            </select></label>
            <label>{t.notes}<textarea value={form.notes} maxLength={500} onChange={event=>setForm(old=>({...old,notes:event.target.value}))}/></label>
          </div>
          <p className="muted">{ar?'يستغرق التصنيع والتوصيل من ٤ إلى ٧ أيام.':'Production and delivery take 4–7 days.'}</p>
          {active&&<><h2>{t.method}</h2>
            {active.requiresPrepayment&&<p className="notice-box">{ar?'المقدم ٥٠٪ من سعر المنتجات المؤهلة بعد حصتها من الخصم. يمكنك أيضًا دفع الإجمالي عبر إنستاباي.':'The deposit is 50% of qualifying products after their share of discounts. You can also pay the full amount with InstaPay.'}</p>}
            <div className="radio-options payment-cards">{active.plans.map(item=>{
              const Icon=item.method==='cod'?Banknote:Smartphone;
              return <label key={item.method} className="payment-card">
                <input name="plan" type="radio" checked={method===item.method} onChange={()=>setMethod(item.method)}/>
                <Icon size={19} aria-hidden="true"/><span>{methods[item.method][i]}</span>
                <small aria-hidden="true">{money((item.method==='cod'?item.balancePiastres:item.requiredUpfrontPiastres)/100,lang)}</small>
              </label>;
            })}</div>
            {transfer&&<div className="notice-box payment-instructions">
              <p>{ar?'حوّل المبلغ الموضح وأرفق صورة التحويل والرقم المرجعي. يتحقق فريق المتجر من الاستلام يدويًا.':'Transfer the amount shown and attach the screenshot and reference. Store staff verify receipt manually.'}</p>
              <p>{ar?'المبلغ المطلوب تحويله':'Amount to transfer'} <strong>{money(plan.requiredUpfrontPiastres/100,lang)}</strong></p>
              <div dir="ltr" className="payment-destination"><strong>{active.instapayNumber}</strong>
                <button className="icon-button" type="button" aria-label={ar?'نسخ رقم إنستا باي':'Copy InstaPay number'} onClick={async()=>{
                  try{await navigator.clipboard.writeText(active.instapayNumber);setCopy('');notify('InstaPay number copied','تم نسخ رقم إنستاباي');}
                  catch{setCopy(ar?'حدّد الرقم وانسخه يدويًا.':'Select the number to copy it.');notify('Could not copy the InstaPay number','تعذّر نسخ رقم إنستاباي',true);}
                }}><Copy size={17}/></button></div><span role="status">{copy}</span>
              <label>{ar?'الرقم المرجعي للتحويل':'Transfer reference'}<input maxLength={48} required value={reference} onChange={event=>setReference(event.target.value)}/></label>
              <label>{ar?'صورة التحويل':'Transfer screenshot'}<input type="file" required={!proof} accept="image/jpeg,image/png,image/webp"
                onChange={event=>{if(event.target.files[0]){proofRef.current=null;setProof(event.target.files[0]);}}}/></label>
              <p role="status" className="muted">{busy==='proof'?(ar?'جارٍ رفع إثبات التحويل…':'Uploading transfer evidence…'):
                proofRef.current?.id?(ar?'تم رفع إثبات التحويل.':'Transfer evidence uploaded.'):proof?.name}</p>
            </div>}
          </>}
        </fieldset>
        {error&&<p className="inline-error" role="alert">{error}</p>}
      </form>
      <aside className="order-summary">
        <h2>{ar?'ملخص الطلب':'Order summary'}</h2>
        <label className="discount-row"><span>{t.discount}</span><input placeholder={ar?'أدخل الكود':'Enter code'} value={discount} maxLength={30}
          onChange={event=>setDiscount(event.target.value.toUpperCase())} disabled={!enabled||!!busy}/></label>
        <button type="button" className="button-secondary" onClick={calculate} disabled={!enabled||!form.governorate||quoting||!!busy}>
          {quoting?(ar?'جارٍ الحساب…':'Calculating…'):(discount.trim()?(ar?'طبّق الخصم':'Apply discount'):(ar?'حدّث الإجمالي':'Refresh total'))}
        </button>
        <div className="checkout-breakdown" aria-live="polite">
          {active?[[t.subtotal,active.subtotalEGP],[t.discount,active.discountEGP],[t.shipping,active.shippingEGP],[t.total,active.totalEGP],
            ...(plan?[[ar?'المبلغ المطلوب الآن':'Due now',plan.requiredUpfrontPiastres/100],[ar?'المتبقي عند الاستلام':'Due at delivery',plan.balancePiastres/100]]:[])
          ].map(([name,amount],index)=><div className={index===3?"summary-line summary-total":index>3?"summary-line summary-payment":"summary-line"} key={name}><span>{name}</span><strong>{money(amount,lang)}</strong></div>):
            <p className="muted">{ar?'اختر المحافظة لحساب إجمالي الطلب.':'Choose a governorate to calculate your total.'}</p>}
        </div>
        <div className="checkout-confirmation">
          <h3>{ar?'تأكيد الطلب':'Confirm order'}</h3>
          <p>{madeToOrder[i]} <Link className="text-link" to="/information/returns">{ar?'سياسة الاسترجاع':'Returns policy'}</Link></p>
          <button className="button-primary big-cta" disabled={!plan||quoting||!!busy} aria-busy={!!busy} form="checkout-form" type="submit"><MutationLabel busy={!!busy} label={t.place} lang={lang}/><ArrowRight size={18}/></button>
        </div>
      </aside>
    </div>
  </div>;
}
export function ReplacePayment({number,onComplete,lang}){
  const {notify}=useStore();
  const uploaded=useRef(null);
  const ar=lang==='ar';
  const [file,setFile]=useState(null);
  const [reference,setReference]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  return <form className="stack-form" onSubmit={async event=>{
    event.preventDefault();if(!file||busy)return;
    setError('');setBusy(true);
    try{
      if(uploaded.current?.file!==file)uploaded.current={file,id:(await uploadFile(file,'payment')).id};
      await api('/orders/'+encodeURIComponent(number)+'/payment',{method:'POST',body:JSON.stringify({paymentProofId:uploaded.current.id,paymentReference:reference})});
      notify('Replacement evidence submitted','تم إرسال إثبات التحويل البديل');onComplete();
    }catch(error){setError(orderError(error,lang));notify('Could not submit payment evidence','تعذّر إرسال إثبات التحويل',true);}finally{setBusy(false);}
  }}>
    <label>{ar?'الرقم المرجعي الجديد':'Transfer reference'}<input value={reference} required maxLength={48} onChange={e=>setReference(e.target.value)}/></label>
    <label>{ar?'صورة تحويل بديلة':'Replacement transfer screenshot'}<input type="file" accept="image/jpeg,image/png,image/webp" required onChange={e=>{if(e.target.files[0])setFile(e.target.files[0]);}}/></label>
    <button className="button-secondary" type="submit" disabled={busy}><MutationLabel busy={busy} lang={lang} label={ar?'أرسل صورة التحويل':'Submit replacement evidence'}/></button>
    {error&&<p role="alert">{error}</p>}
  </form>;
}
