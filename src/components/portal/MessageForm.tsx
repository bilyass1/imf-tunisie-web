'use client';

import { useActionState, useEffect, useRef } from 'react';
import { sendClientMessageAction, type FormState } from '@/lib/actions';
import { IconArrow } from '@/components/Icons';

const initial: FormState = { ok: false };

export default function MessageForm({ placeholder, send }: { placeholder: string; send: string }) {
  const [state, action, pending] = useActionState(sendClientMessageAction, initial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.done) ref.current?.reset();
  }, [state.done]);

  return (
    <form ref={ref} action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <textarea name="body" rows={3} required placeholder={placeholder} className="field resize-none" />
      <button type="submit" disabled={pending} className="btn-gold shrink-0 disabled:opacity-60">
        {send}
        <IconArrow className="h-4 w-4 rtl:rotate-180" />
      </button>
    </form>
  );
}
