'use client';

import { useActionState, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { submitLeadAction, type FormState } from '@/lib/actions';
import { IconArrow, IconCheck } from '@/components/Icons';
import type { Locale } from '@/i18n/config';

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
  locale = 'fr',
}: {
  labels: ContactFormLabels;
  projects: { slug: string; name: string }[];
  compact?: boolean;
  locale?: Locale;
}) {
  const params = useSearchParams();
  const [state, action, pending] = useActionState(submitLeadAction, initial);
  const [project, setProject] = useState('');
  const [lot, setLot] = useState('');
  const visiting = params.get('intent') === 'visit';
  const visitLabels = {
    fr: { date:'Date souhaitée', time:'Heure souhaitée (Tunis)', mode:'Type de visite', onsite:'Sur place', video:'Visioconférence', note:'Ce créneau est une demande. Notre équipe vous contactera pour confirmer le rendez-vous.', consent:'J’accepte d’être contacté pour organiser cette visite.', message:'Je souhaite visiter cet appartement.', error:'Choisissez une date future dans les six prochains mois et acceptez le contact.', unavailable:'Cet appartement n’est plus disponible pour une visite. Choisissez un autre bien ou contactez notre équipe.' },
    en: { date:'Preferred date', time:'Preferred time (Tunis)', mode:'Visit type', onsite:'On site', video:'Video call', note:'This is a requested time. Our team will contact you to confirm the appointment.', consent:'I agree to be contacted to arrange this visit.', message:'I would like to visit this apartment.', error:'Choose a future date within six months and agree to be contacted.', unavailable:'This apartment is no longer available for a visit. Choose another property or contact our team.' },
    ar: { date:'التاريخ المرغوب', time:'الوقت المرغوب (تونس)', mode:'نوع الزيارة', onsite:'في الموقع', video:'مكالمة فيديو', note:'هذا طلب موعد. سيتصل بك فريقنا لتأكيد الزيارة.', consent:'أوافق على الاتصال بي لتنظيم هذه الزيارة.', message:'أرغب في زيارة هذه الشقة.', error:'اختر موعداً مستقبلياً خلال ستة أشهر ووافق على الاتصال بك.', unavailable:'هذه الشقة لم تعد متاحة للزيارة. اختر عقاراً آخر أو اتصل بفريقنا.' },
  }[locale];

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
      <input type="hidden" name="intent" value={visiting ? 'visit' : 'contact'}/>
      <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
      {visiting && <fieldset className="grid gap-4 rounded-xl border border-gold-300 bg-gold-50 p-5 sm:col-span-2 sm:grid-cols-2">
        <legend className="px-2 font-semibold">{locale==='ar'?'طلب زيارة':locale==='en'?'Request a visit':'Demander une visite'}</legend>
        <label><span className="label">{visitLabels.date}</span><input type="date" name="visitDate" required className="field"/></label>
        <label><span className="label">{visitLabels.time}</span><input type="time" name="visitTime" required className="field"/></label>
        <label className="sm:col-span-2"><span className="label">{visitLabels.mode}</span><select name="visitMode" className="field"><option value="onsite">{visitLabels.onsite}</option><option value="video">{visitLabels.video}</option></select></label>
        <p className="text-sm sm:col-span-2">{visitLabels.note}</p>
        <label className="flex items-start gap-3 text-sm sm:col-span-2"><input type="checkbox" name="consent" required className="mt-1"/>{visitLabels.consent}</label>
      </fieldset>}
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
        <textarea key={visiting ? 'visit' : 'contact'} id="cf-message" name="message" required defaultValue={visiting ? visitLabels.message : ''} maxLength={4000} rows={compact ? 3 : 5} className="field resize-none" />
      </div>

      {state.error && (
        <p className="sm:col-span-2 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {state.error === 'required' ? labels.required : state.error === 'visit' ? visitLabels.error : state.error === 'unavailable' ? visitLabels.unavailable : labels.error}
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
