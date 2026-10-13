'use client';

import LotStatusEditor from './LotStatusEditor';
import type { LotOwner } from './LotStatusFields';
import Link from 'next/link';
import type { Lot } from '@/lib/types';
import { updateLotPriceAction } from '@/lib/actions';

export default function LotRow({
  lot,
  projectSlug,
  floorText,
  areaText,
  compositionHref,
  compositionLabel,
  owner,
  clients,
}: {
  lot: Lot;
  projectSlug: string;
  floorText: string;
  areaText: string;
  statusLabels: Record<Lot['status'], string>;
  compositionHref: string;
  compositionLabel: string;
  owner?: LotOwner;
  clients: LotOwner[];
}) {
  return (
    <tr className="border-t border-ink/6">
      <td className="px-4 py-2.5 font-semibold text-ink">{lot.code}</td>
      <td className="px-4 py-2.5 text-ink/55">{floorText}</td>
      <td className="px-4 py-2.5 text-ink/55">{lot.typology}</td>
      <td className="px-4 py-2.5 text-ink/70">{areaText}</td>
      <td className="px-4 py-2.5">
        <LotStatusEditor key={`${lot.ref}/${lot.status}/${lot.reservationNote}/${owner?.id}`} compact projectSlug={projectSlug} lot={lot} owner={owner} clients={clients}/>
      </td>
      <td className="px-4 py-2.5">
        <form action={updateLotPriceAction} className="flex items-center gap-1.5">
          <input type="hidden" name="projectSlug" value={projectSlug} />
          <input type="hidden" name="lotRef" value={lot.ref} />
          <input
            name="price"
            type="number"
            defaultValue={lot.price ?? ''}
            placeholder="—"
            className="w-28 rounded-lg border border-ink/12 px-3 py-1.5 text-[12.5px] outline-none focus:border-gold-400"
          />
          <button
            type="submit"
            className="rounded-lg border border-ink/12 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink/50 transition hover:border-gold-400 hover:text-gold-600"
          >
            OK
          </button>
        </form>
      </td>
      <td className="px-4 py-2.5">
        <Link href={compositionHref} className="rounded-lg border border-ink/12 px-3 py-2 text-[11px] font-semibold text-ink/65 hover:border-gold-400 hover:text-gold-600">
          {compositionLabel}
        </Link>
      </td>
    </tr>
  );
}
