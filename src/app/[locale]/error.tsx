'use client';

export default function PageError({error,reset}:{error:Error & {digest?:string};reset:()=>void}) {
  const outdated=/UnrecognizedActionError|Server Action|Failed to find|ChunkLoadError|Loading chunk/i.test(`${error.name} ${error.message}`);
  return <main className="container-lux py-24"><div className="mx-auto max-w-lg rounded-2xl border border-ink/10 bg-white p-8 text-center">
    <h1 className="font-display text-3xl">{outdated?'Une nouvelle version est disponible':'La page n’a pas pu se charger'}</h1>
    <p className="my-6 text-ink/65">{outdated?'Actualisez la page, puis recommencez votre opération.':'Rechargez la page ou réessayez dans quelques instants.'}</p>
    <button type="button" className="btn-gold" onClick={()=>window.location.reload()}>Actualiser la page</button>
    {!outdated && <button type="button" className="btn-ghost mt-3 ms-3" onClick={reset}>Réessayer</button>}
  </div></main>;
}
