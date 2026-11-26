import React from 'react';
import {Link,useLocation,useParams} from 'react-router-dom';
import {Facebook,Instagram,Mail,MessageCircle,Phone,Plus} from 'lucide-react';
import {useStore} from '../App.jsx';

export const madeToOrder=[
  'Every item is made for you. N&N means no change-of-mind refunds or exchanges where legally permitted. Your statutory rights still apply.',
  'نصنع كل قطعة خصيصًا لك. تعني سياسة N&N أن الاسترجاع أو الاستبدال بسبب تغيير الرأي غير متاح حيث يسمح القانون بذلك. تظل حقوقك القانونية سارية.'
];
const shipping=[
  'We deliver to all 27 Egyptian governorates. Shipping costs EGP 90 to Cairo and Giza and EGP 120 elsewhere. Production and delivery take 4–7 days.',
  'نوصل إلى جميع محافظات مصر الـ٢٧. الشحن بـ٩٠ جنيهًا للقاهرة والجيزة، وبـ١٢٠ جنيهًا لباقي المحافظات. يستغرق التصنيع والتوصيل من ٤ إلى ٧ أيام.'
];
const cancel=[
  'Request cancellation through our official WhatsApp before production begins.',
  'اطلب إلغاء الطلب عبر واتساب الرسمي قبل بدء التصنيع.'
];
const remedies=[
  'Contact us if your order arrives damaged, defective or incorrect. We’ll arrange the appropriate refund, replacement or exchange, with no extra delivery charge for replacements.',
  'تواصل معنا إذا وصلك الطلب تالفًا أو معيبًا أو غير صحيح. نرتب الاسترداد أو الاستبدال المناسب، دون رسوم توصيل إضافية للطلبات البديلة.'
];
const customization=[
  'If the product offers customization, upload your own artwork at no extra charge. We use the artwork you submit directly in production without a separate approval stage.',
  'إذا كان التخصيص متاحًا للمنتج، ارفع تصميمك دون رسوم إضافية. نستخدم التصميم المرسل مباشرة في التصنيع دون مرحلة منفصلة لاعتماد التصميم.'
];
const methods=[
  'Regular orders can use cash on delivery or full InstaPay. Orders with qualifying products can use an InstaPay deposit or pay in full with InstaPay.',
  'يمكن دفع الطلبات العادية نقدًا عند الاستلام أو بالكامل عبر إنستاباي. للطلبات التي تتضمن منتجات تتطلب دفعًا مسبقًا، يمكنك دفع مقدم أو دفع الإجمالي عبر إنستاباي.'
];
const deposit=[
  'The deposit is 50% of qualifying products after their share of discounts, excluding delivery and other products. The rest is due on delivery.',
  'المقدم هو ٥٠٪ من سعر المنتجات التي تتطلب دفعًا مسبقًا بعد حصتها من الخصم، دون رسوم الشحن أو أسعار المنتجات الأخرى. يُدفع الباقي عند الاستلام.'
];
const policyHeadings={
  privacy:[['Information we use','البيانات التي نستخدمها'],['Private files','الملفات الخاصة']],
  returns:[['Made-to-order items','المنتجات المصنوعة حسب الطلب'],['Damaged, defective or incorrect items','المنتجات التالفة أو المعيبة أو غير الصحيحة'],['Cancellation requests','طلبات الإلغاء']],
  shipping:[['Coverage, cost and timing','مناطق التوصيل والتكلفة والمدة']],
  terms:[['Made to order','التصنيع حسب الطلب'],['Shipping','الشحن'],['Payment methods','طرق الدفع'],['How deposits work','طريقة حساب المقدم'],['Customization','التخصيص'],['Cancellations','الإلغاء'],['Returns and replacements','الاسترجاع والاستبدال']]
};
const pages={
  privacy:{title:['Privacy Policy','سياسة الخصوصية'],paragraphs:[
    ['We use your contact and delivery details to fulfill orders, provide support and help you track your order. For online transfers, our staff review your transfer reference and screenshot. We use uploaded artwork to produce your customized item.',
      'نستخدم بيانات الاتصال والتوصيل لتنفيذ طلبك ومساعدتك في تتبعه وتقديم الدعم. عند الدفع بالتحويل، يراجع فريقنا الرقم المرجعي وصورة التحويل. ونستخدم التصميم المرفوع لتصنيع منتجك المخصص.'],
    ['Access to payment screenshots and uploaded artwork is restricted. Contact us for questions about your information.',
      'الوصول إلى صور التحويل والتصاميم المرفوعة مقيّد. تواصل معنا لأي سؤال يتعلق ببياناتك.']
  ]},
  returns:{title:['Returns & Refunds','الاسترجاع والاسترداد'],paragraphs:[madeToOrder,remedies,cancel]},
  shipping:{title:['Shipping & Delivery','الشحن والتوصيل'],paragraphs:[shipping]},
  terms:{title:['Terms & Conditions','الشروط والأحكام'],paragraphs:[madeToOrder,shipping,methods,deposit,customization,cancel,remedies]}
};
const whatsapp='https://wa.me/201066041396';
const contacts=[
  [MessageCircle,whatsapp,'WhatsApp','واتساب','+20 106 604 1396'],
  [Phone,'tel:+201066041396','Phone','الهاتف','+20 106 604 1396'],
  [Mail,'mailto:gallermostore@gmail.com','Email','البريد الإلكتروني','gallermostore@gmail.com'],
  [Instagram,'https://www.instagram.com/gallermo_store/','Instagram','إنستغرام','gallermo_store'],
  [Facebook,'https://www.facebook.com/Gallermo.store/','Facebook','فيسبوك','Gallermo.store']
];
function ContactLinks({lang,cards=false}){
  return <div className={cards?'contact-grid':'contact-links'}>{contacts.map(([Icon,href,en,ar,value])=>
    <a key={href} href={href} aria-label={lang==='ar'?ar:en}><Icon size={22} aria-hidden="true"/>{cards&&<span>
      <strong>{lang==='ar'?ar:en}</strong><small dir="ltr">{value}</small></span>}</a>)}</div>;
}
export function Footer(){
  const {lang}=useStore();
  const i=lang==='ar'?1:0;
  return <footer className="footer"><div className="container">
    <div className="footer-grid">
      <Link className="footer-brand" to="/" aria-label="Gallermo"><img src="/gallermo-logo-small.webp" width="64" height="64" alt="Gallermo"/></Link>
      <div><strong>{i?'معلومات':'Information'}</strong>
        {Object.entries(pages).map(([id,page])=><Link key={id} to={'/information/'+id}>{page.title[i]}</Link>)}
        <Link to="/contact">{i?'تواصل معنا':'Contact Us'}</Link></div>
      <div><strong>{i?'خدمة العملاء على مدار الساعة':'24/7 Support'}</strong><ContactLinks lang={lang}/></div>
    </div><div className="footer-copy">© {new Date().getFullYear()} Gallermo Store</div>
  </div></footer>;
}
export function Information(){
  const {lang}=useStore();
  const {page}=useParams();
  const location=useLocation();
  const i=lang==='ar'?1:0;
  const content=Object.hasOwn(pages,page)?pages[page]:null;
  if(!content&&location.pathname!=='/contact')return <div className="container page-shell"><h1>{i?'الصفحة غير موجودة':'Page not found'}</h1></div>;
  return <div className="container page-shell form-page policy-page">
    <h1>{content?content.title[i]:i?'تواصل معنا':'Contact Us'}</h1>
    {content?<><div className="policy-sections">
      {content.paragraphs.map((text,index)=><section key={text[0]}>
        <h2>{policyHeadings[page][index][i]}</h2><p>{text[i]}</p>
      </section>)}
    </div><div className="policy-contact">
      <Link className="button-primary" to="/contact">{i?'تواصل معنا':'Contact Us'}</Link>
      <a className="button-secondary" href={whatsapp}>{i?'راسلنا على واتساب':'Message us on WhatsApp'}</a>
    </div></>:<>
      <p>{i?'خدمة العملاء متاحة على مدار الساعة. جاليرمو متجر أونلاين بدون فرع لاستقبال العملاء.':'Customer support is available 24/7. Gallermo is an online store with no customer-facing location.'}</p><ContactLinks lang={lang} cards/>
      <p>{i?'للدفع فقط عبر إنستاباي':'InstaPay for payments only'} <bdi>+201149504797</bdi></p>
    </>}
  </div>;
}
const faq=[
  {tab:['Orders','الطلبات'],rows:[
    ['How do I place an order?','Add your items to the cart and check out as a guest or sign in. Save the order number from your confirmation.','كيف أقدم طلبًا؟','أضف المنتجات إلى السلة وأكمل الطلب كضيف أو سجّل الدخول. احتفظ برقم الطلب بعد التأكيد.'],
    ['How long does delivery take?',shipping[0],'كم يستغرق التوصيل؟',shipping[1]],
    ['How can I track my order?','Use Track Order with your order number and checkout phone number, or sign in and open My Orders.','كيف أتتبع طلبي؟','استخدم صفحة تتبع الطلب وأدخل رقم الطلب ورقم الهاتف، أو سجّل الدخول وافتح طلباتي.'],
    ['Can I cancel my order?',cancel[0],'هل يمكنني إلغاء طلبي؟',cancel[1]]
  ]},
  {tab:['Payments','الدفع'],rows:[
    ['What payment methods do you accept?',methods[0],'ما طرق الدفع المتاحة؟',methods[1]],
    ['How does the 50% deposit work?',deposit[0],'كيف يُحسب مقدم الـ٥٠٪؟',deposit[1]],
    ['How do I confirm my InstaPay payment?','Enter your transfer reference and upload the screenshot at checkout. Our team verifies the transfer manually.','كيف أؤكد الدفع عبر إنستاباي؟','أدخل الرقم المرجعي وارفع صورة التحويل عند إتمام الطلب. يتحقق فريقنا من التحويل يدويًا.'],
    ['How much does shipping cost?',shipping[0],'كم تبلغ رسوم الشحن؟',shipping[1]]
  ]},
  {tab:['Products','المنتجات'],rows:[
    ['Can I use my own design?',customization[0],'هل أستطيع استخدام تصميمي؟',customization[1]],
    ['How do I choose the right size?','Select a size on the product page and read About This Size. Check the visual Size Guide where available.','كيف أختار المقاس المناسب؟','اختر مقاسًا في صفحة المنتج واقرأ قسم «عن هذا المقاس». اطلع على دليل المقاسات المرئي إن توفر.'],
    ['Can I return or exchange my order?',madeToOrder[0],'هل يمكنني استرجاع طلبي أو استبداله؟',madeToOrder[1]],
    ['What if my order arrives damaged or incorrect?',remedies[0],'ماذا لو وصل طلبي تالفًا أو غير صحيح؟',remedies[1]]
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
