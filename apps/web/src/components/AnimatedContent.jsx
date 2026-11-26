import React,{useEffect,useRef} from 'react';

export default function AnimatedContent({children,className}){
  const ref=useRef(null);
  useEffect(()=>{
    const element=ref.current;
    const motion=matchMedia('(prefers-reduced-motion: no-preference)');
    if(!motion.matches||element.getBoundingClientRect().top<innerHeight||!('IntersectionObserver' in window))return;
    let disposed=false;
    let reveal;
    const observer=new IntersectionObserver(([entry])=>{
      if(!entry.isIntersecting)return;
      observer.disconnect();
      import('gsap').then(({gsap})=>{
        if(disposed||!motion.matches)return;
        reveal=gsap.fromTo([...element.children],{y:14},{y:0,duration:.42,stagger:.045,ease:'power2.out',clearProps:'transform'});
      }).catch(()=>{});
    },{threshold:.08});
    const stopMotion=()=>{if(!motion.matches)reveal?.revert();};
    motion.addEventListener('change',stopMotion);
    observer.observe(element);
    return ()=>{disposed=true;observer.disconnect();motion.removeEventListener('change',stopMotion);reveal?.revert();};
  },[]);
  return <div className={className} ref={ref}>{children}</div>;
}
