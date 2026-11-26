import React,{useEffect,useState} from 'react';
import {Headphones,Palette,Pause,Play,Ruler,Scissors,Truck} from 'lucide-react';
import AnimatedContent from './AnimatedContent.jsx';

function MotionStrip({lang,variant,children}){
  const [paused,setPaused]=useState(false);
  const [ready,setReady]=useState(false);
  useEffect(()=>setReady(true),[]);
  const ar=lang==='ar';
  const Icon=paused?Play:Pause;
  const label=paused?(ar?'تشغيل الحركة':'Resume motion'):(ar?'إيقاف الحركة مؤقتًا':'Pause motion');
  return <div className={'motion-strip '+variant} dir={ar?'rtl':'ltr'} data-paused={paused} data-ready={ready}>
    <div className="motion-window">{children}</div>
    <button type="button" className="motion-toggle" aria-label={label} onClick={()=>setPaused(value=>!value)}>
      <Icon size={14} aria-hidden="true"/>
    </button>
  </div>;
}
export function Announcement({lang}){
  return <MotionStrip lang={lang} variant="announcement">
    <p className="motion-track">{lang==='ar'?'لسه الحكاية مخلصتش.':"It's not over yet."}</p>
  </MotionStrip>;
}
const benefits=[
  [Scissors,'Made to order','مصنوع خصيصًا ليك'],
  [Palette,'Free customization','تخصيص بدون رسوم إضافية'],
  [Truck,'Delivery across Egypt','توصيل لكل محافظات مصر'],
  [Headphones,'24/7 support','دعم على مدار الساعة']
];
export function Benefits({lang}){
  const ar=lang==='ar';
  const group=decorative=><ul className="benefits-group" aria-hidden={decorative||undefined}>
    {benefits.map(([Icon,en,arabic],index)=><li key={en}>
      <Icon size={19} aria-hidden="true"/><span>{ar?arabic:en}
        {index===1&&!decorative&&<span className="sr-only">{ar?' للمنتجات المؤهلة':' on eligible products'}</span>}
      </span>
    </li>)}
  </ul>;
  return <MotionStrip lang={lang} variant="benefits"><div className="motion-track">
    {group(false)}{group(true)}
  </div></MotionStrip>;
}
const reasons=[
  [Scissors,'Made for you','Every order is made especially for you.','مصنوع ليك','كل طلب بنعمله مخصوص ليك.'],
  [Palette,'Your style, your rules','Choose designs that express your personality.','ستايلك على كيفك','اختار التصميمات اللي بتعبّر عن شخصيتك.'],
  [Ruler,'Find your perfect fit','Multiple sizes for different spaces.','المقاس اللي يناسبك','مقاسات مختلفة تناسب مساحتك.'],
  [Headphones,'Make it personal','Bring your own artwork to eligible products.','ضيف لمستك','استخدم تصميمك الخاص مع المنتجات المتاحة للتخصيص.']
];
export function WhyGallermo({lang}){
  const ar=lang==='ar';
  return <section className="home-warm why-gallermo" aria-labelledby="why-heading"><div className="container">
    <h2 id="why-heading">{ar?'ليه جاليرمو؟':'Why Gallermo?'}</h2>
    <p>{ar?'تفاصيل بتختارها بنفسك، وقطع بنعملها مخصوص ليك.':'Pieces made to order, with room for your own style.'}</p>
    <AnimatedContent className="why-cards">
      {reasons.map(([Icon,en,caption,arabic,captionAr])=><article key={en}>
        <Icon size={22} aria-hidden="true"/>
        <h3>{ar?arabic:en}</h3><p>{ar?captionAr:caption}</p>
      </article>)}
    </AnimatedContent>
  </div></section>;
}
