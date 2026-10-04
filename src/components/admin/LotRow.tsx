'use client';

import { useRef } from 'react';
import type { Lot } from '@/lib/types';
import { updateLotStatusAction, updateLotPriceAction } from '@/lib/actions';

export default function LotRow({
  lot,
  projectSlug,
  floorText,
  areaText,
  statusLabels,
}: {
  lot: Lot;
  projectSlug: string;
  floorText: string;
  areaText: string;
  statusLabels: Record<Lot['status'], string>;
}) {
  const statusForm = useRef<HTMLFormElement>(null);

  const tone =
    lot.status === 'available'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
      : lot.status === 'reserved'
        ? 'border-amber-300 bg-amber-50 text-amber-800'
        : 'border-ink/15 bg-ink/[0.04] text-ink/55';

  return (
    <tr className="border-t border-ink/6">
      <td className="px-4 py-2.5 font-semibold text-ink">{lot.code}</td>
      <td className="px-4 py-2.5 text-ink/55">{floorText}</td>
      <td className="px-4 py-2.5 text-ink/55">{lot.typology}</td>
      <td className="px-4 py-2.5 text-ink/70">{areaText}</td>
      <td className="px-4 py-2.5">
        <form ref={statusForm} action={updateLotStatusAction}>
          <input type="hidden" name="projectSlug" value={projectSlug} />
          <input type="hidden" name="lotRef" value={lot.ref} />
          <select
            name="status"
            defaultValue={lot.status}
            onChange={() => statusForm.current?.requestSubmit()}
            className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold outline-none transition ${tone}`}
          >
            <option value="available">{statusLabels.available}</option>
            <option value="reserved">{statusLabels.reserved}</option>
            <option value="sold">{statusLabels.sold}</option>
            <option value="unconfirmed">{statusLabels.unconfirmed}</option>
          </select>
        </form>
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
    </tr>
  );
}
