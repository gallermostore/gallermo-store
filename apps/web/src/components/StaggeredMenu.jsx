import React,{useEffect,useRef,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {Menu,X,Languages,Sun,Moon} from 'lucide-react';

export default function StaggeredMenu({links,lang,categoryLinks,categoryLabel,onLogout,onLanguage,onTheme,theme,t}) {
  const ar = lang === 'ar';
  const [open,setOpen] = useState(false);
  const dialog = useRef(null);
  const opener = useRef(null);
  const exitTimer = useRef(null);
  const previousOverflow = useRef(null);
  const location = useLocation();
  const unlockScroll = () => {
    if(previousOverflow.current === null)return;
    document.body.style.overflow=previousOverflow.current;
    previousOverflow.current=null;
  };
  const close = (immediate = false) => {
    const element = dialog.current;
    if (!element?.open || exitTimer.current) return;
    const finish = () => { exitTimer.current = null; unlockScroll(); element.close(); };
    if (immediate || matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
    else {
      element.dataset.closing = '';
      exitTimer.current = setTimeout(finish, 275);
    }
  };
  const show = () => {
    delete dialog.current.dataset.closing;
    dialog.current.showModal();
    previousOverflow.current=document.body.style.overflow;
    document.body.style.overflow='hidden';
    setOpen(true);
  };
  useEffect(()=>{ close(); },[location.key]);
  useEffect(()=>{
    const media = matchMedia('(max-width: 780px)');
    const resize = () => {
      if (media.matches) return;
      clearTimeout(exitTimer.current);
      exitTimer.current = null;
      close(true);
    };
    media.addEventListener('change',resize);
    return ()=>{ media.removeEventListener('change',resize); clearTimeout(exitTimer.current); unlockScroll(); };
  },[]);
  return <div className="stagger-menu">
    <button ref={opener} type="button" className="icon-button" onClick={show} aria-label={ar?'فتح القائمة':'Open menu'} aria-expanded={open} aria-haspopup="dialog">
      <Menu aria-hidden="true" size={24}/>
    </button>
    <dialog ref={dialog} className="navigation-drawer" aria-label={ar?'القائمة الرئيسية':'Main menu'}
      onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if (e.target===e.currentTarget)close();}}
      onClose={()=>{unlockScroll();setOpen(false);if (opener.current?.offsetWidth) opener.current.focus({preventScroll:true});}}>
      <div className="navigation-layer" aria-hidden="true"/>
      <div className="navigation-layer" aria-hidden="true"/>
      <div className="navigation-panel" dir={ar?'rtl':'ltr'}>
        <div className="drawer-actions">
          <button className="icon-button" type="button" autoFocus onClick={()=>close()} aria-label={ar?'إغلاق القائمة':'Close menu'}><X size={24}/></button>
          <button className="icon-button" type="button" onClick={onLanguage} aria-label={t.language}><Languages size={20}/></button>
          <button className="icon-button" type="button" onClick={onTheme} aria-label={theme==='light'?t.dark:t.light}>{theme==='light'?<Moon size={20}/>:<Sun size={20}/>}</button>
        </div>
        <nav className="drawer-links">
          {links.slice(0,2).map(link=><Link key={link.to} className="stagger-link" to={link.to} onClick={()=>close()}>{link.label}</Link>)}
          <details className="mobile-category-details"><summary>{categoryLabel}</summary><div className="mobile-category-links">
            {categoryLinks.map(link=><Link key={link.to} to={link.to} onClick={()=>close()}>{link.label}</Link>)}
          </div></details>
          {links.slice(2).map(link=><Link key={link.to} className="stagger-link" to={link.to} onClick={()=>close()}>{link.label}</Link>)}
          {onLogout&&<button className="text-link" type="button" onClick={()=>{close();void onLogout();}}>{t.logout}</button>}
        </nav>
      </div>
    </dialog>
  </div>;
}
