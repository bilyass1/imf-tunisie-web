'use client';
import { useEffect, useRef, type ElementType, type ReactNode } from 'react';

const pending = new Map<Element, () => void>();
let observer: IntersectionObserver | undefined;
function observe(element: Element, reveal: () => void) {
  observer ??= new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      pending.get(entry.target)?.();
      pending.delete(entry.target);
      observer?.unobserve(entry.target);
    }
    if (!pending.size) { observer?.disconnect(); observer = undefined; }
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
  pending.set(element, reveal);
  observer.observe(element);
  return () => {
    pending.delete(element); observer?.unobserve(element);
    if (!pending.size) { observer?.disconnect(); observer = undefined; }
  };
}
export default function Reveal({children,delay=0,as:Tag='div',className=''}:{children:ReactNode;delay?:number;as?:ElementType;className?:string}) {
  const ref=useRef<HTMLElement>(null);
  useEffect(()=>{
    const element=ref.current;if(!element)return;
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    if(element.getBoundingClientRect().top<window.innerHeight||motion.matches||typeof IntersectionObserver==='undefined')return;
    const reveal=()=>{element.style.transitionDelay=`${motion.matches?0:delay}ms`;element.classList.add('is-in');};
    element.classList.add('reveal-pending');
    const stop=observe(element,reveal);
    const onMotion=()=>{if(motion.matches){reveal();stop();}};
    motion.addEventListener('change',onMotion);
    return ()=>{stop();motion.removeEventListener('change',onMotion);};
  },[delay]);
  return <Tag ref={ref} className={`reveal ${className}`}>{children}</Tag>;
}
