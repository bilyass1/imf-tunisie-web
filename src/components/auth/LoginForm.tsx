'use client';

import { useActionState } from 'react';
import { loginAction, type FormState } from '@/lib/actions';
import { IconArrow, IconLock, IconMail } from '@/components/Icons';

const initial: FormState = { ok: false };

export default function LoginForm({
  locale,
  scope,
  labels,
}: {
  locale: string;
  scope: 'client' | 'admin';
  labels: { email: string; password: string; submit: string; signingIn: string; invalid: string; forgot: string };
}) {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="scope" value={scope} />

      <div>
        <label className="label" htmlFor="login-email">
          {labels.email}
        </label>
        <div className="relative">
          <IconMail className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
          <input
            id="login-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="field !ps-11"
            placeholder="nom@exemple.tn"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="login-password">
          {labels.password}
        </label>
        <div className="relative">
          <IconLock className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
          <input
            id="login-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="field !ps-11"
            placeholder="••••••••"
          />
        </div>
      </div>

      {state.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">{labels.invalid}</p>}

      <button type="submit" disabled={pending} className="btn-gold w-full disabled:opacity-60">
        {pending ? labels.signingIn : labels.submit}
        {!pending && <IconArrow className="h-4 w-4 rtl:rotate-180" />}
      </button>

      <p className="text-center text-[12px] text-ink/40">{labels.forgot}</p>
    </form>
  );
}
