'use client';
import { useReportWebVitals } from 'next/web-vitals';
import { vitalRoute } from '@/lib/web-vitals-route';
const sampled = typeof window !== 'undefined' && Math.random() < 0.1;
function report(metric:Parameters<Parameters<typeof useReportWebVitals>[0]>[0]) {
 if(!sampled || navigator.doNotTrack==='1' || !['LCP','INP','CLS','TTFB','FCP'].includes(metric.name))return;
 const route=vitalRoute(window.location.pathname);if(!route)return;
 const body=JSON.stringify({...route,id:metric.id,metric:metric.name,value:metric.value,device:window.matchMedia('(max-width: 767px)').matches?'mobile':'desktop'});
 // Credentials and page URL/referrer are deliberately omitted.
 void fetch('/api/web-vitals',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true,credentials:'omit',referrerPolicy:'no-referrer'}).catch(()=>{});
}
export default function WebVitals(){useReportWebVitals(report);return null;}
