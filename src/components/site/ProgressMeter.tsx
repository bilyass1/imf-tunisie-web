import type { Locale } from '@/i18n/config';
export default function ProgressMeter({value,locale,label}:{value?:number;locale:Locale;label?:string}) {
  if(value==null) return null;
  const title=label??(locale==='ar'?'تقدم الأشغال':locale==='en'?'Construction progress':'Avancement des travaux');
  return <div className="my-6 rounded-xl border border-gold-400/25 bg-white p-5"><div className="flex justify-between gap-4"><span>{title}</span><strong>{value} %</strong></div><div role="progressbar" aria-label={title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} className="mt-3 h-2 rounded-full bg-sand"><div className="h-full rounded-full bg-gold-400" style={{width:`${value}%`}}/></div></div>;
}
