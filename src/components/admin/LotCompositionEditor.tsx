'use client';

import { useActionState } from 'react';
import type { Locale } from '@/i18n/config';
import type { Lot } from '@/lib/types';
import { visibleComposition } from '@/lib/lot-composition';
import { updateLotCompositionAction } from '@/lib/actions';

const copy = {
  fr: { title: 'Composition de l’appartement', hint: 'Une pièce par ligne. Gardez le même ordre et le même nombre de lignes dans les trois langues. La visite 360° ne change pas.', save: 'Enregistrer la composition', saved: 'Composition enregistrée. La fiche publique est mise à jour.', error: 'Vérifiez les trois listes : même nombre de lignes, sans ligne vide (24 pièces maximum).', missing: 'Appartement introuvable.' },
  en: { title: 'Apartment layout', hint: 'One room per line. Keep the same order and number of lines in all three languages. The 360° tour stays unchanged.', save: 'Save layout', saved: 'Layout saved. The public listing is updated.', error: 'Check all three lists: same number of lines, no empty lines (24 rooms maximum).', missing: 'Apartment not found.' },
  ar: { title: 'تركيبة الشقة', hint: 'غرفة واحدة في كل سطر. احتفظ بالترتيب ونفس عدد الأسطر في اللغات الثلاث. تبقى جولة 360° دون تغيير.', save: 'حفظ التركيبة', saved: 'تم حفظ التركيبة وتحديث صفحة الشقة.', error: 'تحقق من القوائم الثلاث: نفس عدد الأسطر دون أسطر فارغة (24 غرفة كحد أقصى).', missing: 'الشقة غير موجودة.' },
} as const;

export default function LotCompositionEditor({ lot, projectSlug, locale }: { lot: Lot; projectSlug: string; locale: Locale }) {
  const [state, action, pending] = useActionState(updateLotCompositionAction, { ok: false });
  const labels = copy[locale];
  const composition = visibleComposition(lot);
  return (
    <section id="composition-editor" className="mt-5 scroll-mt-28 rounded-2xl border border-gold-300/50 bg-white p-5 shadow-card sm:p-7">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-700">{lot.code} · {lot.typology}</p>
      <h2 className="mt-2 font-display text-2xl text-ink">{labels.title}</h2>
      <p className="mt-2 text-[13px] text-ink/55">{labels.hint}</p>
      <form action={action} className="mt-5">
        <input type="hidden" name="projectSlug" value={projectSlug} />
        <input type="hidden" name="lotRef" value={lot.ref} />
        <div className="grid gap-4 lg:grid-cols-3">
          {(['fr', 'en', 'ar'] as const).map((language) => (
            <label key={language} className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink/55">
              {language.toUpperCase()}
              <textarea
                key={`${lot.ref}-${language}`}
                name={`composition${language[0].toUpperCase()}${language.slice(1)}`}
                defaultValue={composition.map((item) => item[language]).join('\n')}
                rows={Math.max(6, Math.min(15, composition.length + 2))}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
                className="mt-2 w-full rounded-xl border border-ink/15 bg-ivory p-3 text-[13px] font-normal normal-case tracking-normal text-ink outline-none focus:border-gold-400"
              />
            </label>
          ))}
        </div>
        {state.error && <p role="alert" className="mt-3 text-[13px] text-red-700">{state.error === 'missing' ? labels.missing : labels.error}</p>}
        {state.done && <p role="status" className="mt-3 text-[13px] text-emerald-700">{labels.saved}</p>}
        <button disabled={pending} type="submit" className="btn-gold mt-5 disabled:opacity-50">{pending ? '…' : labels.save}</button>
      </form>
    </section>
  );
}
