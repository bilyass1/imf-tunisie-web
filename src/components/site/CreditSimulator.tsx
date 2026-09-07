'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Locale } from '@/i18n/config';
import { formatMoney } from '@/lib/format';
import { IconArrow, IconChart } from '@/components/Icons';

export interface SimulatorLabels {
  title: string;
  subtitle: string;
  price: string;
  contribution: string;
  rate: string;
  duration: string;
  loan: string;
  monthly: string;
  totalInterest: string;
  totalCost: string;
  years: string;
  disclaimer: string;
  askAdvice: string;
  schedule: string;
  year: string;
  principal: string;
  interest: string;
  remaining: string;
}

function monthlyPayment(principal: number, annualRate: number, years: number): number {
  const n = Math.max(1, Math.round(years * 12));
  const i = annualRate / 100 / 12;
  if (i === 0) return principal / n;
  return (principal * i) / (1 - Math.pow(1 + i, -n));
}

export default function CreditSimulator({
  locale,
  labels,
  contactHref,
  defaultPrice = 260000,
}: {
  locale: Locale;
  labels: SimulatorLabels;
  contactHref: string;
  defaultPrice?: number;
}) {
  const [price, setPrice] = useState(defaultPrice);
  const [contribution, setContribution] = useState(Math.round(defaultPrice * 0.2));
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(15);

  const loan = Math.max(0, price - contribution);
  const monthly = useMemo(() => monthlyPayment(loan, rate, years), [loan, rate, years]);
  const totalPaid = monthly * years * 12;
  const totalInterest = Math.max(0, totalPaid - loan);

  const schedule = useMemo(() => {
    const rows: { year: number; principal: number; interest: number; remaining: number }[] = [];
    let balance = loan;
    const i = rate / 100 / 12;
    for (let y = 1; y <= years; y += 1) {
      let principalYear = 0;
      let interestYear = 0;
      for (let m = 0; m < 12; m += 1) {
        const interestMonth = balance * i;
        const principalMonth = Math.min(balance, monthly - interestMonth);
        balance = Math.max(0, balance - principalMonth);
        principalYear += principalMonth;
        interestYear += interestMonth;
      }
      rows.push({ year: y, principal: principalYear, interest: interestYear, remaining: balance });
    }
    return rows;
  }, [loan, rate, years, monthly]);

  const previewYears = [1, Math.ceil(years / 3), Math.ceil((2 * years) / 3), years]
    .filter((y, idx, arr) => y >= 1 && arr.indexOf(y) === idx)
    .map((y) => schedule[y - 1])
    .filter(Boolean);

  const inputs: {
    key: string;
    label: string;
    value: number;
    setValue: (v: number) => void;
    min: number;
    max: number;
    step: number;
    suffix?: string;
  }[] = [
    { key: 'price', label: labels.price, value: price, setValue: setPrice, min: 50000, max: 1500000, step: 5000 },
    {
      key: 'contribution',
      label: labels.contribution,
      value: contribution,
      setValue: (v) => setContribution(Math.min(v, price)),
      min: 0,
      max: 1500000,
      step: 5000,
    },
    { key: 'rate', label: labels.rate, value: rate, setValue: setRate, min: 3, max: 15, step: 0.1, suffix: '%' },
    { key: 'years', label: labels.duration, value: years, setValue: setYears, min: 3, max: 25, step: 1, suffix: labels.years },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
      {/* ---- Entrées ---- */}
      <div className="grid gap-5 sm:grid-cols-2">
        {inputs.map((f) => (
          <div key={f.key} className="rounded-2xl border border-ink/8 bg-white p-5">
            <label className="label" htmlFor={`sim-${f.key}`}>
              {f.label}
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`sim-${f.key}`}
                type="number"
                value={f.value}
                min={f.min}
                max={f.max}
                step={f.step}
                onChange={(e) => f.setValue(Number(e.target.value) || 0)}
                className="field !py-2.5 font-display text-[20px] !text-ink"
              />
              {f.suffix && <span className="shrink-0 text-[13px] font-medium text-ink/45">{f.suffix}</span>}
            </div>
            <input
              type="range"
              value={f.value}
              min={f.min}
              max={f.max}
              step={f.step}
              onChange={(e) => f.setValue(Number(e.target.value))}
              className="mt-4 w-full accent-gold-400"
              aria-label={f.label}
            />
          </div>
        ))}

        {/* ---- Aperçu échéancier ---- */}
        <div className="sm:col-span-2 overflow-hidden rounded-2xl border border-ink/8 bg-white">
          <div className="flex items-center gap-2 border-b border-ink/8 px-5 py-3.5">
            <IconChart className="h-4 w-4 text-gold-500" />
            <h4 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink/60">{labels.schedule}</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[13px]">
              <thead>
                <tr className="bg-sand/40 text-[11px] uppercase tracking-[0.1em] text-ink/50">
                  <th className="px-5 py-2.5 text-start font-semibold">{labels.year}</th>
                  <th className="px-5 py-2.5 text-end font-semibold">{labels.principal}</th>
                  <th className="px-5 py-2.5 text-end font-semibold">{labels.interest}</th>
                  <th className="px-5 py-2.5 text-end font-semibold">{labels.remaining}</th>
                </tr>
              </thead>
              <tbody>
                {previewYears.map((row) => (
                  <tr key={row.year} className="border-t border-ink/5">
                    <td className="px-5 py-3 font-semibold text-ink">{row.year}</td>
                    <td className="px-5 py-3 text-end text-ink/70">{formatMoney(Math.round(row.principal), locale)}</td>
                    <td className="px-5 py-3 text-end text-ink/70">{formatMoney(Math.round(row.interest), locale)}</td>
                    <td className="px-5 py-3 text-end font-medium text-ink">
                      {formatMoney(Math.round(row.remaining), locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ---- Résultat ---- */}
      <aside className="lg:sticky lg:top-28 lg:h-fit">
        <div className="overflow-hidden rounded-2xl bg-ink text-white shadow-lux">
          <div className="border-b border-white/10 px-7 py-7 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-300">{labels.monthly}</p>
            <p className="mt-3 font-display text-[46px] font-light leading-none">
              {formatMoney(Math.round(monthly), locale)}
            </p>
          </div>
          <dl className="divide-y divide-white/8 px-7">
            {[
              { k: labels.loan, v: formatMoney(Math.round(loan), locale) },
              { k: labels.totalInterest, v: formatMoney(Math.round(totalInterest), locale) },
              { k: labels.totalCost, v: formatMoney(Math.round(totalPaid), locale) },
            ].map((row) => (
              <div key={row.k} className="flex items-center justify-between gap-4 py-4">
                <dt className="text-[12px] uppercase tracking-[0.1em] text-white/45">{row.k}</dt>
                <dd className="text-[15px] font-medium">{row.v}</dd>
              </div>
            ))}
          </dl>
          <div className="p-7 pt-4">
            <Link href={contactHref} className="btn-gold w-full">
              {labels.askAdvice}
              <IconArrow className="h-4 w-4 rtl:rotate-180" />
            </Link>
            <p className="mt-5 text-[11.5px] leading-relaxed text-white/40">{labels.disclaimer}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
