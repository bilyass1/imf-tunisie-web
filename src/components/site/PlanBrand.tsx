export interface PlanBrandDetails {
  project: string;
  document: string;
  phone: string;
  email: string;
  website: string;
}

/** Site-side identity around the original drawing; never covers its title block. */
export default function PlanBrand({ project, document, phone, email, website }: PlanBrandDetails) {
  return <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-ink/10 bg-white px-4 py-4 text-ink sm:px-6">
    <div className="flex min-w-0 items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brands/imf.webp" alt="IMF - Immobilière Mseddi Frères" width="112" height="60" className="h-12 w-auto max-w-28 object-contain" />
      <div className="min-w-0 border-s border-gold-500 ps-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-700">{project}</p>
        <p className="mt-1 text-sm font-semibold sm:text-base">{document}</p>
      </div>
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink/70 sm:text-xs">
      <a href={`tel:${phone.replace(/\s/g, '')}`} className="hover:text-gold-700">{phone}</a>
      <a href={`mailto:${email}`} className="hover:text-gold-700">{email}</a>
      <a href={website} target="_blank" rel="noopener noreferrer" className="hover:text-gold-700">{website.replace(/^https?:\/\//, '')}</a>
    </div>
  </div>;
}
