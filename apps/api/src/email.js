import {randomUUID} from 'node:crypto';
import nodemailer from 'nodemailer';
import {Notification} from './models.js';

const maxAttempts=5;
const claimedFor=120_000;
const fromAddress='gallermostore@gmail.com';
export const emailEnabled=()=>process.env.EMAIL_ENABLED==='true';

export function smtpConfig(env=process.env){
  const port=Number(env.SMTP_PORT||465);
  const secure=env.SMTP_SECURE===undefined?port===465:env.SMTP_SECURE==='true';
  const host=env.SMTP_HOST||'smtp.gmail.com';
  if(host!=='smtp.gmail.com'||!((port===465&&secure)||(port===587&&!secure))||
    !env.SMTP_USER||!env.SMTP_APP_PASSWORD)throw new Error('Configure Gmail SMTP and an app password');
  return {
    host,port,secure,requireTLS:!secure,auth:{user:env.SMTP_USER,pass:env.SMTP_APP_PASSWORD},
    connectionTimeout:12_000,greetingTimeout:12_000,socketTimeout:30_000,
    disableFileAccess:true,disableUrlAccess:true
  };
}

const subjects={
  received:['Order received','تم استلام طلبك'],
  proof_submitted:['Transfer pending review','التحويل قيد المراجعة'],
  verified:['Transfer verified','تم التحقق من التحويل'],
  rejected:['Transfer could not be verified','تعذّر التحقق من التحويل'],
  confirmed:['Order confirmed','تم تأكيد الطلب'],
  processing:['Order in production','الطلب قيد التصنيع'],
  shipped:['Order shipped','تم شحن الطلب'],
  delivered:['Order delivered','تم توصيل الطلب'],
  cancelled:['Order cancelled','تم إلغاء الطلب'],
  admin:['New Gallermo order','طلب جديد على جاليرمو'],
  test:['Gallermo email test','اختبار بريد جاليرمو']
};

export function notificationMessage(job){
  const ar=job.locale==='ar';
  const title=subjects[job.kind][ar?1:0];
  const money=amount=>new Intl.NumberFormat(ar?'ar-EG':'en-EG',{style:'currency',currency:'EGP'}).format(amount/100);
  const lines=[title,job.number,Number.isFinite(job.amount)&&((ar?'الإجمالي ':'Total ')+money(job.amount))];
  if(job.kind==='proof_submitted'||(job.kind==='received'&&job.status==='proof_submitted')){
    lines.push(ar?'استلمنا بيانات التحويل وسنتحقق منها يدويًا.':'We received your transfer details for manual review.');
  }
  if(job.kind==='rejected')lines.push(ar?'أرسل إثبات تحويل بديل من صفحة الطلب أو تواصل مع الدعم.':'Submit replacement evidence from your order page or contact support.');
  if(Number.isFinite(job.upfront)&&job.upfront>0&&['received','proof_submitted'].includes(job.kind))
    lines.push((ar?'المبلغ المطلوب بالتحويل ':'Required transfer ')+money(job.upfront));
  if(Number.isFinite(job.balance)&&['received','verified','shipped'].includes(job.kind))
    lines.push((ar?'المبلغ المتبقي عند الاستلام ':'Balance due at delivery ')+money(job.balance));
  return {
    from:process.env.EMAIL_FROM||{name:'Gallermo Store',address:fromAddress},
    to:job.recipient,replyTo:fromAddress,
    subject:title+(job.number?' | '+job.number:''),
    text:[...lines.filter(Boolean),'Gallermo Store',fromAddress].join('\n')
  };
}

export async function enqueueOrderNotification(order,kind,sequence,session,admin=false){
  if(!emailEnabled())return;
  const recipient=admin?process.env.ADMIN_NOTIFICATION_EMAIL:order.customer.email;
  if(!recipient)return;
  const _id=[order.number,sequence,kind].join(':');
  await Notification.updateOne({_id},{$setOnInsert:{
    recipient,locale:admin?'en':order.locale,kind,number:order.number,status:order.paymentStatus,
    amount:order.totalPiastres??Math.round(order.totalEGP*100),upfront:order.requiredUpfrontPiastres,
    balance:kind==='received'&&order.paymentStatus==='proof_submitted'?order.totalPiastres-order.requiredUpfrontPiastres:order.balancePiastres
  }},{upsert:true,session});
}

export async function deliverNext(transport,now=new Date()){
  const leaseToken=randomUUID();
  const eligible={statusOfJob:'pending',nextAttemptAt:{$lte:now}};
  await Notification.updateMany({...eligible,attempts:{$gte:maxAttempts}},{$set:{statusOfJob:'failed'},$unset:{leaseToken:1}});
  const job=await Notification.findOneAndUpdate({...eligible,attempts:{$lt:maxAttempts}},
    {$inc:{attempts:1},$set:{leaseToken,nextAttemptAt:new Date(+now+claimedFor)}},
    {sort:{nextAttemptAt:1,_id:1},new:true}).lean();
  if(!job)return false;
  const claim={_id:job._id,leaseToken};
  try{
    await transport.sendMail({...notificationMessage(job),messageId:'<'+job._id.replaceAll(':','.')+'@gallermostore.gmail.com>'});
  }catch{
    const statusOfJob=job.attempts>=maxAttempts?'failed':'pending';
    await Notification.updateOne(claim,{$set:{statusOfJob,nextAttemptAt:new Date(Date.now()+60_000*2**(job.attempts-1))},$unset:{leaseToken:1}});
    console.warn('[email] delivery deferred or exhausted',job.kind,job.attempts);
    return true;
  }
  await Notification.updateOne(claim,{$set:{statusOfJob:'sent'},$unset:{leaseToken:1,recipient:1}});
  return true;
}

export function startEmailWorker(){
  if(!emailEnabled())return;
  let transport;
  try{transport=nodemailer.createTransport(smtpConfig());}
  catch{console.error('[email] invalid Gmail SMTP configuration');return;}
  let running=false;
  setInterval(async()=>{
    if(running)return;
    running=true;
    try{for(let count=0;count<6;count++){if(!await deliverNext(transport))break;}}
    catch{console.warn('[email] notification queue unavailable');}
    finally{running=false;}
  },15_000).unref();
}
