import React,{useEffect,useRef,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';

function MenuMark(){
  return <svg className="menu-mark" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 12h16"/><path d="M4 12h16"/><path d="M4 12h16"/>
  </svg>;
}

export default function StaggeredMenu({links,lang,categoryLinks,categoryLabel,onLogout,signIn,t}) {
  const ar=lang==='ar';
  const [open,setOpen]=useState(false);
  const dialog=useRef(null);
  const panel=useRef(null);
  const opener=useRef(null);
  const toggle=useRef(null);
  const version=useRef(0);
  const previousOverflow=useRef(null);
  const {key}=useLocation();

  function unlockScroll(){
    if(previousOverflow.current===null)return;
    document.body.style.overflow=previousOverflow.current;
    previousOverflow.current=null;
  }
  function positionToggle(){
    const button=opener.current.getBoundingClientRect();
    dialog.current.style.setProperty('--menu-top',button.top+'px');
    dialog.current.style.setProperty('--menu-right',(innerWidth-button.right)+'px');
    dialog.current.style.setProperty('--menu-toggle-width',button.width+'px');
    dialog.current.style.setProperty('--menu-toggle-height',button.height+'px');
  }
  function finish(){
    if(!dialog.current?.open)return;
    dialog.current.close();
    unlockScroll();
    setOpen(false);
    if(opener.current?.offsetWidth)opener.current.focus({preventScroll:true});
  }
  function close(immediate=false){
    const element=dialog.current;
    if(!element?.open)return;
    if(immediate){version.current++;finish();return;}
    if(element.dataset.state==='closed')return;
    const closing=++version.current;
    element.dataset.state='closed';
    const transitions=[...panel.current.getAnimations(),...element.querySelector('.navigation-shade').getAnimations()];
    void Promise.allSettled(transitions.map(animation=>animation.finished)).then(()=>{
      if(version.current===closing)finish();
    });
  }
  function show(){
    const element=dialog.current;
    version.current++;
    if(!element.open){
      element.dataset.state='closed';
      previousOverflow.current=document.body.style.overflow;
      document.body.style.overflow='hidden';
      positionToggle();
      element.showModal();
      void panel.current.offsetWidth;
      setOpen(true);
    }
    element.dataset.state='open';
    toggle.current.focus({preventScroll:true});
  }

  useEffect(()=>{close();},[key]);
  useEffect(()=>{
    const resize=()=>{
      if(!dialog.current?.open)return;
      if(!matchMedia('(max-width: 780px)').matches)close(true);
      else positionToggle();
    };
    window.addEventListener('resize',resize);
    return ()=>{version.current++;window.removeEventListener('resize',resize);unlockScroll();};
  },[]);

  return <div className="stagger-menu">
    <button ref={opener} type="button" className="icon-button menu-trigger" onClick={show} aria-label={ar?'فتح القائمة':'Open menu'} aria-expanded={open} aria-haspopup="dialog">
      <MenuMark/>
    </button>
    <dialog ref={dialog} className="navigation-drawer" aria-label={ar?'القائمة الرئيسية':'Main menu'}
      onCancel={event=>{event.preventDefault();close();}} onClick={event=>{if(event.target===event.currentTarget)close();}}>
      <div className="navigation-shade" aria-hidden="true"/>
      <button ref={toggle} type="button" className="icon-button drawer-toggle-copy" aria-label={ar?'إغلاق القائمة':'Close menu'}
        onClick={()=>dialog.current.dataset.state==='closed'?show():close()}><MenuMark/></button>
      <div ref={panel} className="navigation-panel" dir={ar?'rtl':'ltr'}>
        <nav className="drawer-links">
          {links.slice(0,2).map(link=><Link key={link.to} className="stagger-link" to={link.to} onClick={()=>close()}>{link.label}</Link>)}
          <details className="mobile-category-details"><summary>{categoryLabel}</summary><div className="mobile-category-links">
            {categoryLinks.map(link=><Link key={link.to} to={link.to} onClick={()=>close()}>{link.label}</Link>)}
          </div></details>
          {links.slice(2).map(link=><Link key={link.to} className="stagger-link" to={link.to} onClick={()=>close()}>{link.label}</Link>)}
        </nav>
        <div className="drawer-account">
          {signIn&&<Link className="button-primary" to="/login" onClick={()=>close()}>{t.signIn}</Link>}
          {onLogout&&<button className="button-secondary" type="button" onClick={()=>{close();void onLogout();}}>{t.logout}</button>}
        </div>
      </div>
    </dialog>
  </div>;
}
