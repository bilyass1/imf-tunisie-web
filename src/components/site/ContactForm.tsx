'use client';

import { useActionState, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { submitLeadAction, type FormState } from '@/lib/actions';
import { IconArrow, IconCheck } from '@/components/Icons';

export interface ContactFormLabels {
  name: string;
  email: string;
  phone: string;
  project: string;
  lot: string;
  budget: string;
  message: string;
  submit: string;
  sending: string;
  success: string;
  error: string;
  choose: string;
  required: string;
  consent: string;
}

const initial: FormState = { ok: false };

export default function ContactForm({
  labels,
  projects,
  compact = false,
}: {
  labels: ContactFormLabels;
  projects: { slug: string; name: string }[];
  compact?: boolean;
}) {
  const params = useSearchParams();
  const [state, action, pending] = useActionState(submitLeadAction, initial);
  const [project, setProject] = useState('');
  const [lot, setLot] = useState('');

  useEffect(() => {
    setProject(params.get('project') ?? '');
    setLot(params.get('lot') ?? '');
  }, [params]);

  if (state.done) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-8 py-12 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white">
          <IconCheck className="h-7 w-7" />
        </span>
        <p className="max-w-md text-[15px] leading-relaxed text-emerald-900">{labels.success}</p>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className={compact ? 'sm:col-span-2' : ''}>
        <label className="label" htmlFor="cf-name">
          {labels.name} *
        </label>
        <input id="cf-name" name="name" required className="field" autoComplete="name" />
      </div>

      <div>
        <label className="label" htmlFor="cf-phone">
          {labels.phone} *
        </label>
        <input id="cf-phone" name="phone" required className="field" inputMode="tel" autoComplete="tel" placeholder="+216 …" />
      </div>

      <div>
        <label className="label" htmlFor="cf-email">
          {labels.email}
        </label>
        <input id="cf-email" name="email" type="email" className="field" autoComplete="email" />
      </div>

      <div>
        <label className="label" htmlFor="cf-project">
          {labels.project}
        </label>
        <select
          id="cf-project"
          name="project"
          value={project}
          onChange={(e) => setProject(e.target.value)}
          className="field"
        >
          <option value="">{labels.choose}</option>
          {projects.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="cf-lot">
          {labels.lot}
        </label>
        <input
          id="cf-lot"
          name="lot"
          value={lot}
          onChange={(e) => setLot(e.target.value)}
          className="field"
          placeholder="A 1-1"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="label" htmlFor="cf-budget">
          {labels.budget}
        </label>
        <select id="cf-budget" name="budget" className="field">
          <option value="">{labels.choose}</option>
          <option value="< 150 000 TND">&lt; 150 000 TND</option>
          <option value="150 000 – 250 000 TND">150 000 – 250 000 TND</option>
          <option value="250 000 – 400 000 TND">250 000 – 400 000 TND</option>
          <option value="> 400 000 TND">&gt; 400 000 TND</option>
        </select>
      </div>

      <div className="sm:col-span-2">
        <label className="label" htmlFor="cf-message">
          {labels.message} *
        </label>
        <textarea id="cf-message" name="message" required rows={compact ? 3 : 5} className="field resize-none" />
      </div>

      {state.error && (
        <p className="sm:col-span-2 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {state.error === 'required' ? labels.required : labels.error}
        </p>
      )}

      <div className="sm:col-span-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-[11.5px] leading-relaxed text-ink/40">{labels.consent}</p>
        <button type="submit" disabled={pending} className="btn-gold shrink-0 disabled:opacity-60">
          {pending ? labels.sending : labels.submit}
          {!pending && <IconArrow className="h-4 w-4 rtl:rotate-180" />}
        </button>
      </div>
    </form>
  );
}
