import React,{useEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {Link,useLocation} from 'react-router-dom';
/** Accessible GSAP staggered menu, adapted to Gallermo branding from the supplied React Bits reference. */
export default function StaggeredMenu({links,lang,label,categoryLinks=[],categoryLabel="Categories"}){
 const [open,setOpen]=useState(false);const panel=useRef(null);const layers=useRef(null);const toggle=useRef(null);const location=useLocation();
 useEffect(()=>setOpen(false),[location.pathname,location.search]);
 useEffect(()=>{
  if(!panel.current)return;
  const nodes=[...layers.current.children,panel.current];
  const timeline=gsap.timeline();
  if(open){
   timeline.fromTo(nodes,{xPercent:lang==='ar'?-105:105},{xPercent:0,duration:.54,ease:'power4.out',stagger:.06});
   timeline.fromTo(panel.current.querySelectorAll('.stagger-link'),{y:44,opacity:0},{y:0,opacity:1,duration:.35,stagger:.045},'-=.2');
  }else{timeline.to(nodes,{xPercent:lang==='ar'?-105:105,duration:.26,ease:'power3.in',stagger:-.03})}
  return()=>timeline.kill();
 },[open,lang]);
 useEffect(()=>{
  if(!open)return;
  const old=document.body.style.overflow;document.body.style.overflow='hidden';
  const handler=e=>{if(e.key==='Escape'){setOpen(false);toggle.current?.focus()}if(e.key==='Tab'){
   const focusables=[toggle.current,...panel.current.querySelectorAll('a,button')];const index=focusables.indexOf(document.activeElement);
   if(e.shiftKey&&index===0){focusables.at(-1)?.focus();e.preventDefault()}
   else if(!e.shiftKey&&index===focusables.length-1){focusables[0]?.focus();e.preventDefault()}
  }};
  document.addEventListener('keydown',handler);return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',handler)};
 },[open]);
 return <div className={'stagger-menu '+(open?'is-open':'')}>
  <button ref={toggle} className="menu-toggle" type="button" aria-label={open?'Close menu':'Open menu'} aria-expanded={open} aria-controls="gallermo-mobile-panel" onClick={()=>setOpen(x=>!x)}><span>{open?'Close':label}</span><span aria-hidden="true" className="menu-glyph">{open?'×':'+'}</span></button>
  <div aria-hidden="true" className="menu-prelayers" ref={layers}><div/><div/></div>
  {open&&<button className="menu-backdrop" tabIndex={-1} aria-label="Close menu" onClick={()=>setOpen(false)}/>}
  <nav id="gallermo-mobile-panel" className="menu-panel" aria-label="Mobile navigation" ref={panel} aria-hidden={!open} inert={!open?'':undefined}>
    {links.slice(0,2).map(l=><Link key={l.to+l.label} className="stagger-link" to={l.to} onClick={()=>setOpen(false)}>{l.label}</Link>)}
    <details className="mobile-category-details"><summary>{categoryLabel}</summary><div className="mobile-category-links">{categoryLinks.map(l=><Link key={l.to} to={l.to} onClick={()=>setOpen(false)}>{l.label}</Link>)}</div></details>
    {links.slice(2).map(l=><Link key={l.to+l.label} className="stagger-link" to={l.to} onClick={()=>setOpen(false)}>{l.label}</Link>)}
    <div className="menu-panel-end">GALLERMO <span>IT’S NOT OVER YET.</span></div>
  </nav>
 </div>
}
