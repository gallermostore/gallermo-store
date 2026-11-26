import React,{useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {label,useStore} from '../App.jsx';
import {StoreImage} from './LoadingState.jsx';

export default function CategoryCarousel({items}){
  const {lang,t}=useStore();
  const [index,setIndex]=useState(0);
  const gesture=useRef(null);
  const stage=useRef(null);
  if(!items.length)return null;
  const active=index%items.length;
  const direction=lang==='ar'?-1:1;
  const move=delta=>setIndex(value=>(value+delta+items.length)%items.length);
  function finishSwipe(event){
    const start=gesture.current;
    if(!start||start.id!==event.pointerId)return;
    const x=event.clientX-start.x;
    const y=event.clientY-start.y;
    if(Math.abs(x)<38||Math.abs(x)<=Math.abs(y)*1.3)return;
    start.swiped=true;
    if(stage.current.contains(document.activeElement))stage.current.focus({preventScroll:true});
    move((x<0?1:-1)*direction);
  }
  return <section className="section container category-section" aria-labelledby="category-heading"
    onKeyDown={event=>{
      if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
      event.preventDefault();
      if(stage.current.contains(document.activeElement))stage.current.focus({preventScroll:true});
      move((event.key==='ArrowRight'?1:-1)*direction);
    }}>
    <h2 id="category-heading">{t.shopByCategory}</h2>
    <div className="depth-stage" ref={stage} tabIndex={-1}
      onPointerDown={event=>{if(event.isPrimary&&event.button===0)gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY};}}
      onPointerUp={finishSwipe} onPointerCancel={()=>{gesture.current=null;}}
      onClickCapture={event=>{if(event.detail&&gesture.current?.swiped){event.preventDefault();event.stopPropagation();gesture.current=null;}}}>
      {items.map((item,i)=>{
        const relative=(i-active+items.length)%items.length;
        const offset=relative>items.length/2?relative-items.length:relative;
        const name=label(item.name,lang);
        return <div className="depth-card" key={item.slug} data-active={offset===0}
          style={{'--depth-offset':offset*direction,'--distance':Math.abs(offset),'--side':Math.sign(offset)*direction}}
          aria-hidden={offset!==0}>
          <Link to={'/shop?category='+item.slug} aria-label={name} tabIndex={offset===0?0:-1} draggable={false}>
            <StoreImage src={item.image} alt="" loading="lazy" decoding="async" fetchpriority="low" width="480" height="480" draggable={false}/>
          </Link>
        </div>;
      })}
    </div>
    <div className="depth-controls">
      <button type="button" aria-label={t.previous} onClick={()=>move(-1)}><ChevronLeft/></button>
      <div className="depth-indicators">{items.map((item,i)=><button key={item.slug} type="button"
        aria-label={label(item.name,lang)} aria-current={i===active?'true':undefined} onClick={()=>setIndex(i)}/>)}</div>
      <button type="button" aria-label={t.next} onClick={()=>move(1)}><ChevronRight/></button>
    </div>
    <div className="view-all"><Link className="button-primary" to="/shop">{lang==='ar'?'تسوّق الكل':'Shop all'}</Link></div>
  </section>;
}
