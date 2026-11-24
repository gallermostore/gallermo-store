import React from 'react';
import {Link,useLocation,useParams} from 'react-router-dom';
import {Facebook,Instagram,Phone,Plus} from 'lucide-react';
import {useStore} from '../App.jsx';

export const contacts=[
  {url:'https://www.facebook.com/Gallermo.store',en:'Facebook',ar:'فيسبوك',icon:Facebook},
  {url:'https://www.instagram.com/gallermo_store/',en:'Instagram',ar:'إنستغرام',icon:Instagram},
  {url:'tel:+201066041396',en:'Phone',ar:'الهاتف',icon:Phone}
];
const pages={
  privacy:{title:['Privacy Policy','سياسة الخصوصية'],text:[
    'We use your account and order details to manage your account, fulfill orders and provide support. Payment screenshots and custom artwork are available to authorized staff for verification and fulfillment. Contact us with questions about your information.',
    'نستخدم بيانات حسابك وطلبك لإدارة الحساب وتنفيذ الطلبات وتقديم الدعم. يمكن للموظفين المخولين الاطلاع على صور التحويل والتصاميم المخصصة للتحقق والتنفيذ. تواصل معنا للاستفسار عن بياناتك.']},
  returns:{title:['Returns & Refunds','الاسترجاع والاستبدال'],text:[
    'Egyptian consumer protection rules generally allow eligible returns or exchanges within 14 days of receipt. Goods made to your specifications may qualify for an exception if they match those specifications. Defective goods have a 30-day return or exchange window under Egyptian consumer protection rules. Contact us about defective, incorrect or nonconforming goods. Your statutory remedies apply.',
    'تتيح قواعد حماية المستهلك المصرية عمومًا الاسترجاع أو الاستبدال للسلع المؤهلة خلال ١٤ يومًا من الاستلام. قد ينطبق استثناء على السلع المصنوعة وفق مواصفاتك إذا كانت مطابقة لها. تتيح القواعد استرجاع أو استبدال السلع المعيبة خلال ٣٠ يومًا. تواصل معنا بخصوص السلع المعيبة أو الخاطئة أو غير المطابقة. تظل حقوقك القانونية سارية.']},
  shipping:{title:['Shipping & Delivery','الشحن والتوصيل'],text:[
    'Contact Gallermo for current shipping availability. When checkout is available, the shipping charge is shown before you submit your order.',
    'تواصل مع جاليرمو للاستفسار عن مناطق الشحن المتاحة. عند تفعيل إتمام الطلب، تظهر رسوم الشحن قبل إرساله.']},
  terms:{title:['Terms & Conditions','الشروط والأحكام'],text:[
    'Review your selected sizes, artwork, total and payment terms before placing an order. InstaPay payment requires manual verification. Statutory consumer rights apply.',
    'راجع المقاسات والتصاميم والإجمالي وشروط الدفع قبل إرسال الطلب. يتطلب الدفع عبر إنستا باي التحقق اليدوي. تسري حقوق حماية المستهلك القانونية.']}
};
function ContactLinks({lang}) {
  return <div className="social-links">{contacts.map(({url,en,ar,icon:Icon})=>
    <a key={url} href={url} className="icon-button" aria-label={lang==='ar'?ar:en}><Icon size={20}/></a>)}</div>;
}
export function Footer(){
  const {lang}=useStore();
  return <footer className="footer"><div className="container">
    <div className="footer-grid">
      <Link className="footer-brand" to="/" aria-label="Gallermo"><img src="/gallermo-logo.webp" width="64" height="64" alt="Gallermo"/></Link>
      <div><strong>{lang==='ar'?'معلومات':'Information'}</strong><Link to="/contact">{lang==='ar'?'تواصل معنا':'Contact us'}</Link></div>
      <div><strong>{lang==='ar'?'خليك على تواصل':'Get in touch'}</strong><ContactLinks lang={lang}/></div>
    </div><div className="footer-copy">© {new Date().getFullYear()} Gallermo Store</div>
  </div></footer>;
}
export function Information(){
  const {lang}=useStore();
  const {page}=useParams();
  const location=useLocation();
  const i=lang==='ar'?1:0;
  const content=Object.hasOwn(pages,page)?pages[page]:null;
  if(!content&&location.pathname!=='/contact')return <div className="container page-shell"><h1>{lang==='ar'?'الصفحة غير موجودة':'Page not found'}</h1></div>;
  return <div className="container page-shell form-page">
    <h1>{content?content.title[i]:lang==='ar'?'تواصل معنا':'Contact us'}</h1>
    {content?<><p className="notice-box">{lang==='ar'?'مسودة للمراجعة':'Draft for review'}</p><p>{content.text[i]}</p>
      {page==='returns'&&<p><a href="https://cpa.gov.eg/ar-EG/اسئلة-متكررة">{lang==='ar'?'جهاز حماية المستهلك':'Egyptian Consumer Protection Agency'}</a></p>}
      <Link to="/contact">{lang==='ar'?'تواصل معنا':'Contact us'}</Link></>:<><ContactLinks lang={lang}/><a href="tel:+201066041396" dir="ltr">+20 106 604 1396</a></>}
  </div>;
}
const faq=[
  {tab:['Orders','الطلبات'],rows:[
    ['Can I order as a guest?','Guest ordering is available when checkout is enabled.','هل يمكنني الطلب كضيف؟','الطلب كضيف متاح عند تفعيل الشراء.'],
    ['How do guests track orders?','Use Track Order with your order number and checkout phone number.','كيف يتابع الضيف طلبه؟','استخدم تتبع الطلب برقم الطلب ورقم الهاتف المستخدم عند الشراء.'],
    ['Where are my account orders?','Sign in as a customer and go to My Orders.','أين أجد طلبات حسابي؟','سجّل الدخول كعميل وافتح طلباتي.'],
    ['Is checkout available now?','Checkout availability appears in your cart and at checkout.','هل الشراء متاح الآن؟','تظهر حالة الشراء في السلة وعند إتمام الطلب.']
  ]},
  {tab:['Payments','طرق الدفع'],rows:[
    ['When is a deposit required?','When checkout is enabled, a category that requires prepayment triggers an InstaPay deposit for the entire order.','متى يلزم دفع مقدم؟','عند تفعيل الشراء، وجود منتج من فئة تشترط الدفع المسبق يعني دفع مقدم عبر إنستا باي للطلب كله.'],
    ['Which orders allow cash on delivery?','Orders without a prepayment requirement can use cash on delivery when checkout is enabled.','متى يمكن الدفع عند الاستلام؟','عند تفعيل الشراء يمكن الدفع عند الاستلام للطلبات التي لا تتطلب مقدمًا.'],
    ['How do I know my transfer was received?','Staff verify the transfer amount and reference before confirming payment.','كيف أعرف أن التحويل وصل؟','يتحقق فريق المتجر من مبلغ التحويل والرقم المرجعي قبل تأكيد الدفع.'],
    ['Where do I find the transfer details?','Choose the InstaPay payment plan at checkout to see the amount and destination.','أين أجد تفاصيل التحويل؟','اختر خطة الدفع عبر إنستا باي عند إتمام الطلب لعرض المبلغ والوجهة.']
  ]},
  {tab:['Products & customization','المنتجات والتخصيص'],rows:[
    ['How do I choose a size?','Open the product page and review its available options and prices.','كيف أختار المقاس؟','افتح صفحة المنتج وراجع الخيارات المتاحة وأسعارها.'],
    ['Which products accept my artwork?','Look for Customize This on the product page.','ما المنتجات التي تقبل تصميمي؟','ابحث عن خيار خصّص هذا المنتج في صفحة المنتج.'],
    ['Can I order the original design?','Use Add to Cart to choose the standard product.','هل يمكنني طلب التصميم الأصلي؟','اختر أضف إلى السلة لطلب المنتج بتصميمه الأصلي.'],
    ['What does the artwork preview show?','It shows the image you supplied.','ماذا تعرض معاينة التصميم؟','تعرض الصورة التي رفعتها.']
  ]}
];
export function Faq(){
  const {lang,t}=useStore();
  const [group,setGroup]=React.useState(0);
  const i=lang==='ar'?1:0;
  return <section className="section container faq-section"><h2>{t.faq}</h2>
    <div className="faq-tabs" role="group" aria-label={t.categories}>{faq.map(({tab},index)=>
      <button key={index} className="button-secondary" type="button" aria-pressed={index===group} onClick={()=>setGroup(index)}>{tab[i]}</button>)}</div>
    <div className="faq-list">{faq[group].rows.map(row=><details key={row[0]}><summary>{row[i*2]}<Plus size={19} aria-hidden="true"/></summary><p>{row[i*2+1]}</p></details>)}</div>
  </section>;
}
