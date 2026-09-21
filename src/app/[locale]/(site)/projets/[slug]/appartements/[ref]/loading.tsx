export default function LoadingApartment(){
  return <div aria-busy="true" className="bg-ivory pb-20"><div className="bg-ink pb-16 pt-36"><div className="container-lux space-y-6"><div className="h-4 w-48 animate-pulse rounded bg-white/20"/><div className="h-16 w-40 animate-pulse rounded bg-white/20"/><div className="h-5 max-w-xl animate-pulse rounded bg-white/20"/></div></div><div className="container-lux grid gap-5 py-10 sm:grid-cols-3">{[0,1,2].map(i=><div key={i} className="h-36 animate-pulse rounded-2xl bg-ink/5"/>)}</div></div>;
}
