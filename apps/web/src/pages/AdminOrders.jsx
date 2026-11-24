import React,{useState} from 'react';
import {api,money,useStore} from '../App.jsx';
import {orderError} from './Checkout.jsx';

const statuses={
  pending:['Pending','قيد الانتظار'],confirmed:['Confirmed','مؤكد'],processing:['Processing','قيد التجهيز'],
  shipped:['Shipped','تم الشحن'],delivered:['Delivered','تم التوصيل'],cancelled:['Cancelled','ملغي'],
  unpaid:['Unpaid','غير مدفوع'],awaiting_transfer:['Awaiting transfer','بانتظار التحويل'],proof_submitted:['Awaiting verification','قيد التحقق'],
  verified:['Transfer verified','تم التحقق من التحويل'],rejected:['Evidence rejected','تم رفض الإثبات'],
  cod:['Cash on delivery','الدفع عند الاستلام'],instapay:['InstaPay','إنستا باي'],instapay_deposit:['InstaPay deposit','مقدم إنستا باي']
};
const steps={pending:['confirmed','cancelled'],confirmed:['processing','cancelled'],processing:['shipped','cancelled'],shipped:['delivered']};
export function orderStatus(code,lang){return statuses[code]?.[lang==='ar'?1:0]||code;}
export function AdminOrders({items,onRefresh}){
  const {lang,t}=useStore();
  return <div className="orders-stack">{items.map(order=><AdminOrder key={order._id} order={order} lang={lang} t={t} onRefresh={onRefresh}/>)}</div>;
}
function AdminOrder({order,lang,t,onRefresh}){
  const ar=lang==='ar';
  const [amount,setAmount]=useState('');
  const [deliveryAmount,setDeliveryAmount]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const patch=async change=>{
    if(busy)return;
    setBusy(true);setError('');
    try{await api('/admin/orders/'+order._id,{method:'PATCH',body:JSON.stringify(change)});onRefresh();}
    catch(error){setError(orderError(error,lang));}
    finally{setBusy(false);}
  };
  const canFulfill=order.paymentMethod==='cod'||order.paymentStatus==='verified'&&(order.requiredUpfrontPiastres==null||order.verifiedPiastres>=order.requiredUpfrontPiastres);
  const paymentAssets=order.lines?.filter(line=>line.customization?.assetId)||[];
  return <details className="order-item admin-order">
    <summary><strong>{order.number}</strong><span>{orderStatus(order.status,lang)} · {money(order.totalEGP,lang)}</span></summary>
    <p>{order.customer?.name} · {order.customer?.phone}</p>
    <p>{order.customer?.governorate} · {order.customer?.address}</p>
    {order.customer?.notes&&<p>{order.customer.notes}</p>}
    <ul>{order.lines?.map((line,index)=><li key={index}>{line.quantity} × {line.title?.replaceAll('—',' - ')} {line.variantLabel} {line.addons?.join(', ')}</li>)}</ul>
    <p>{orderStatus(order.paymentMethod,lang)} · {orderStatus(order.paymentStatus,lang)}</p>
    {order.totalPiastres!=null&&<dl className="payment-admin-amounts">
      <div><dt>{ar?'المقدم المطلوب':'Required upfront'}</dt><dd>{money(order.requiredUpfrontPiastres/100,lang)}</dd></div>
      <div><dt>{ar?'المبلغ المؤكد':'Verified transfer'}</dt><dd>{money(order.verifiedPiastres/100,lang)}</dd></div>
      <div><dt>{ar?'المبلغ المتبقي':'Remaining balance'}</dt><dd>{money(order.balancePiastres/100,lang)}</dd></div>
    </dl>}
    <div className="admin-actions">
      {order.paymentProofKey&&<a className="small-action" href={'/api/private/'+order.paymentProofKey} target="_blank" rel="noreferrer">{ar?'عرض صورة التحويل':'View transfer screenshot'}</a>}
      {paymentAssets.map((line,index)=><a key={index} className="small-action" href={'/api/private/'+line.customization.assetId}
        target="_blank" rel="noreferrer">{ar?'عرض تصميم العميل':'View customer artwork'} · {line.title?.replaceAll('—',' - ')}</a>)}
    </div>
    {order.paymentReference&&<p>{ar?'الرقم المرجعي':'Reference'} <strong>{order.paymentReference}</strong></p>}
    {order.paymentStatus==='proof_submitted'&&order.status!=='cancelled'&&<form className="stack-form" onSubmit={event=>{
      event.preventDefault();void patch({paymentStatus:'verified',verifiedPiastres:Math.round(Number(amount)*100)});
    }}>
      <p>{ar?'تحقق من المبلغ والرقم المرجعي في الحساب المستلم.':'Verify the received amount and reference in the receiving account.'}</p>
      <label>{ar?'المبلغ المستلم بالجنيه':'Amount received (EGP)'}<input type="number" step=".01" min="0" required value={amount} onChange={event=>setAmount(event.target.value)}/></label>
      <div className="admin-actions">
        <button type="submit" disabled={busy}>{ar?'تأكيد التحويل':'Verify transfer'}</button>
        <button type="button" disabled={busy} onClick={()=>patch({paymentStatus:'rejected'})}>{ar?'رفض الإثبات':'Reject evidence'}</button>
      </div>
    </form>}
    {order.status==='shipped'&&order.balancePiastres>0&&<form className="stack-form" onSubmit={event=>{
      event.preventDefault();void patch({status:'delivered',collectedAtDeliveryPiastres:Math.round(Number(deliveryAmount)*100)});
    }}>
      <label>{ar?'المبلغ المحصل عند الاستلام بالجنيه':'Balance collected at delivery (EGP)'}
        <input type="number" min="0" step=".01" required value={deliveryAmount} onChange={event=>setDeliveryAmount(event.target.value)}/></label>
      <button type="submit" className="button-secondary" disabled={busy}>{ar?'سجّل التسليم':'Record delivery'}</button>
    </form>}
    {steps[order.status]?.length>0&&!(order.status==='shipped'&&order.balancePiastres>0)&&<label className="fulfillment-action">{t.status}<select disabled={busy} value={order.status}
      onChange={event=>{
        const status=event.target.value;
        if(status==='cancelled'&&!window.confirm(ar?'هل تريد إلغاء الطلب؟':'Cancel this order?'))return;
        void patch({status});
      }}>
      <option value={order.status}>{orderStatus(order.status,lang)}</option>
      {steps[order.status].map(step=><option key={step} value={step} disabled={step!=='cancelled'&&!canFulfill}>{orderStatus(step,lang)}</option>)}
    </select></label>}
    {error&&<p className="inline-error" role="alert">{error}</p>}
  </details>;
}
