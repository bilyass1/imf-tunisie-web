'use client';

import PasswordField from './PasswordField';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { useState } from 'react';
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
  const [keyBusy,setKeyBusy]=useState(false),[keyError,setKeyError]=useState(false);
  async function verifyKey(){
    if(!state.mfa)return;setKeyBusy(true);setKeyError(false);
    try{
      const mfa=state.mfa;
      const credential=mfa.purpose==='register'?await startRegistration({optionsJSON:mfa.options as Parameters<typeof startRegistration>[0]['optionsJSON']}):await startAuthentication({optionsJSON:mfa.options as Parameters<typeof startAuthentication>[0]['optionsJSON']});
      const response=await fetch('/api/admin-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(credential)});
      if(!response.ok)throw new Error('Refused');window.location.assign(`/${locale}/admin`);
    }catch{setKeyError(true);}finally{setKeyBusy(false);}
  }
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
          <IconMail className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="login-email"
            name="email"
            type="email"
            aria-invalid={Boolean(state.error)}
            aria-describedby={state.error ? "login-error" : undefined}
            required
            autoComplete="email"
            className="field !ps-11"
            placeholder="nom@exemple.tn"
          />
        </div>
      </div>

      <PasswordField label={labels.password} name="password" autoComplete="current-password" minLength={1} locale={locale}/>

      {scope==='admin' && <details className="text-sm"><summary>Première inscription de la clé de sécurité</summary><label className="label mt-3" htmlFor="enrollment-token">Jeton privé fourni par l’exploitant</label><input id="enrollment-token" name="enrollmentToken" type="password" autoComplete="off" className="field" /></details>}
      {state.mfa && <button type="button" disabled={keyBusy} onClick={verifyKey} className="btn-gold w-full">{keyBusy?'Vérification…':state.mfa.purpose==='register'?'Inscrire une clé de sécurité':'Vérifier avec ma clé de sécurité'}</button>}
      {keyError && <p role="alert" className="text-sm text-red-700">Vérification refusée ou annulée. Recommencez la connexion.</p>}
      {state.error && <p id="login-error" role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">{labels.invalid}</p>}

      <button type="submit" disabled={pending} className="btn-gold w-full disabled:opacity-60">
        {pending ? labels.signingIn : labels.submit}
        {!pending && <IconArrow className="h-4 w-4 rtl:rotate-180" />}
      </button>

      <p className="text-center text-[12px] text-muted">{labels.forgot}</p>
    </form>
  );
}
