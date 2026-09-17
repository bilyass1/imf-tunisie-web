import type { Locale } from '@/i18n/config';

const text = {
  fr: { title: 'Votre acquisition avec FOPROLOS', intro: 'La décision du 3 mars 2025 approuve les prix de 69 logements de la première tranche, blocs A1, A2 et A3. Les prix documentés figurent sur les fiches correspondantes.', income: 'Revenu brut mensuel', rate: 'Taux', grace: 'Différé', years: 'ans', common: 'Jusqu’à 90 % du prix financé · apport minimum 10 % · durée maximale 25 ans · âge maximal à la fin du remboursement 75 ans.', area: 'Surface couverte : jusqu’à 100 m² en individuel, 120 m² en collectif, parties communes comprises. Plafond de vente : 3,3 × SMIG par m² couvert. Les montants en dinars des visuels fournis dépendent du SMIG applicable.', note: 'Conditions et éligibilité à confirmer auprès de BH Bank. La catégorie dépend du revenu du demandeur ; elle ne se déduit pas du prix du logement. Les prix affichés sont ceux approuvés en 2025, à confirmer avant réservation.', awal: 'Masken Awal · premier logement', awalBody: 'BH Bank présente un crédit d’autofinancement pouvant atteindre 20 % du coût, plafonné à 40 000 DT, à 2 %, remboursable sur 7 ans après 5 ans de grâce. Ce dispositif est distinct du FOPROLOS.', decision: 'Décision des prix · 03/03/2025', list: 'Liste des projets · 18/12/2025', bank: 'Conditions BH Bank', source: 'Sources et documents' },
  en: { title: 'Buying with FOPROLOS', intro: 'The decision of 3 March 2025 approves prices for 69 homes in the first tranche, blocks A1, A2 and A3. Documented prices appear on the corresponding apartment pages.', income: 'Monthly gross income', rate: 'Rate', grace: 'Grace period', years: 'years', common: 'Up to 90% financing · minimum 10% contribution · maximum term 25 years · maximum age at repayment 75.', area: 'Covered area: up to 100 m² for individual homes, 120 m² for collective housing including shared areas. Selling-price ceiling: 3.3 × SMIG per covered m². Dinar values in supplied charts depend on the applicable SMIG.', note: 'Confirm conditions and eligibility with BH Bank. Income determines the category, not the apartment price. Displayed prices were approved in 2025 and require confirmation before reservation.', awal: 'Masken Awal · first home', awalBody: 'BH Bank describes a contribution loan of up to 20% of the cost, capped at DT 40,000, at 2%, repaid over 7 years after 5 years of grace. This is a separate programme from FOPROLOS.', decision: 'Price decision · 03/03/2025', list: 'Project list · 18/12/2025', bank: 'BH Bank conditions', source: 'Sources and documents' },
  ar: { title: 'اقتناء مسكن بتمويل فوبرولوس', intro: 'صادق القرار المؤرخ في 3 مارس 2025 على أسعار 69 مسكناً من القسط الأول بالعمارات A1 وA2 وA3. تظهر الأسعار الموثقة في صفحات الشقق المعنية.', income: 'الدخل الشهري الخام', rate: 'الفائدة', grace: 'الإمهال', years: 'سنوات', common: 'تمويل حتى 90٪ · تمويل ذاتي أدنى 10٪ · مدة قصوى 25 سنة · سن أقصى عند انتهاء السداد 75 سنة.', area: 'المساحة المغطاة: حتى 100 م² للمسكن الفردي و120 م² للمسكن الجماعي مع الأجزاء المشتركة. سقف سعر المتر المربع: 3.3 أضعاف الأجر الأدنى. المبالغ بالدينار في الصور مرتبطة بالأجر الأدنى المعتمد.', note: 'تُؤكد الشروط والأهلية لدى بنك BH. تتحدد الفئة حسب الدخل وليس سعر الشقة. الأسعار المنشورة مصادق عليها في 2025 ويجب تأكيدها قبل الحجز.', awal: 'مسكن أول', awalBody: 'يعرض بنك BH قرض تمويل ذاتي حتى 20٪ من الكلفة بسقف 40 ألف دينار وفائدة 2٪، يسدد على 7 سنوات بعد 5 سنوات إمهال. هذا برنامج مستقل عن فوبرولوس.', decision: 'قرار الأسعار · 03/03/2025', list: 'قائمة المشاريع · 18/12/2025', bank: 'شروط بنك BH', source: 'المصادر والوثائق' },
};

export default function YassamineFinancing({ locale }: { locale: Locale }) {
  const c = text[locale];
  return <section id="foprolos" className="bg-ivory py-20 scroll-mt-28">
    <div className="container-lux">
      <p className="eyebrow">Diar Al Yassamine · BH Bank</p>
      <h2 className="h-display mt-4 text-3xl sm:text-4xl">{c.title}</h2>
      <p className="mt-5 max-w-3xl text-ink/65">{c.intro}</p>
      <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['1–2.5', '2.5–3.5', '3.5–4.5', '4.5–6'].map((income, i) => <article key={income} className="rounded-2xl border border-gold-400/30 bg-white overflow-hidden">
          <h3 className="bg-ink px-6 py-5 text-gold-200 font-serif text-xl">FOPROLOS {i + 1}</h3>
          <dl className="space-y-5 p-6">
            <div><dt className="text-sm text-ink/55">{c.income}</dt><dd className="mt-1 font-medium" dir="ltr">{income} × SMIG</dd></div>
            <div><dt className="text-sm text-ink/55">{c.rate}</dt><dd className="text-3xl text-gold-600">{[1, 3, 5, 7][i]} %</dd></div>
            <div><dt className="text-sm text-ink/55">{c.grace}</dt><dd>{i < 2 ? 3 : 2} {c.years}</dd></div>
          </dl>
        </article>)}
      </div>
      <p className="mt-7 rounded-xl border border-gold-400/30 bg-gold-300/10 p-5 text-ink">{c.common}</p>
      <p className="mt-5 max-w-4xl text-sm leading-relaxed text-ink/65">{c.area}</p>
      <p className="mt-4 max-w-4xl text-sm leading-relaxed text-ink/65">{locale === 'ar' ? 'لمن لا يملك هو أو قرينه مسكناً. بالفئة الأولى يمكن للصندوق التكفل بجزء من التمويل الذاتي بسقف 15 ضعف الأجر الأدنى، بشرط دخل القرين. الضمان: رهن من الدرجة الأولى، توطين الراتب وتأمين الحياة والحريق. القدرة على السداد: 40٪ من الدخل الشهري الخام حسب بنك BH.' : locale === 'en' ? 'Applicants and spouses must not own a home. For category 1, the fund may cover part of the contribution, up to 15 × SMIG, subject to the spouse’s income. Guarantees: first-ranking mortgage, salary domiciliation, life and fire insurance. BH Bank states a repayment-capacity limit of 40% of monthly gross income.' : 'Le demandeur et son conjoint ne doivent pas posséder de logement. En catégorie 1, le fonds peut prendre en charge une partie de l’apport, jusqu’à 15 × SMIG, sous condition du revenu du conjoint. Garanties : hypothèque de premier rang, domiciliation du salaire, assurances vie et incendie. BH Bank indique une capacité de remboursement limitée à 40 % du revenu brut mensuel.'}</p>
      <p className="mt-4 max-w-4xl text-sm leading-relaxed text-ink/55">{c.note}</p>
      <div className="mt-9 rounded-2xl bg-white border border-ink/10 p-6"><h3 className="font-serif text-2xl">{c.awal}</h3><p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/65">{c.awalBody}</p><a className="mt-3 inline-block text-gold-600 underline" href="https://www.bhbank.tn/le-credit-masken-awal" target="_blank" rel="noreferrer">{c.bank}</a></div>
      <h3 className="mt-9 font-medium">{c.source}</h3>
      <div className="mt-4 flex flex-wrap gap-4 text-sm underline text-gold-600">
        <span className="text-ink/55 no-underline">{c.decision}</span>
        <span className="text-ink/55 no-underline">{c.list}</span>
        <a href="https://www.bhbank.tn/le-credit-foprolos" target="_blank" rel="noreferrer">{c.bank}</a>
      </div>
    </div>
  </section>;
}
