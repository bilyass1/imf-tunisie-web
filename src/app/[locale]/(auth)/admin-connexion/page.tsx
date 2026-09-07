import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { getSession } from '@/lib/session';
import { LogoMark } from '@/components/Logo';
import LoginForm from '@/components/auth/LoginForm';
import { IconArrowLeft } from '@/components/Icons';

export default async function AdminLoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);

  const session = await getSession();
  if (session?.role === 'admin') redirect(`/${locale}/admin`);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6 py-16">
      <div className="w-full max-w-md rounded-2xl bg-ivory p-8 shadow-lux sm:p-10">
        <Link
          href={`/${locale}`}
          className="mb-8 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink/45 transition hover:text-gold-600"
        >
          <IconArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {dict.auth.backToSite}
        </Link>

        <LogoMark className="h-11 w-auto" />
        <h1 className="h-display mt-6 text-[30px]">{dict.auth.adminTitle}</h1>
        <div className="rule-gold mt-5" />
        <p className="mt-5 text-[14px] text-ink/55">{dict.auth.adminSubtitle}</p>

        <div className="mt-8">
          <LoginForm
            locale={locale}
            scope="admin"
            labels={{
              email: dict.auth.email,
              password: dict.auth.password,
              submit: dict.auth.submit,
              signingIn: dict.auth.signingIn,
              invalid: dict.auth.invalid,
              forgot: dict.auth.forgot,
            }}
          />
        </div>

        <div className="mt-8 rounded-xl border border-dashed border-ink/15 px-5 py-4 text-[12px] text-ink/50">
          <p className="font-semibold uppercase tracking-[0.14em] text-ink/40">{dict.auth.demoTitle}</p>
          <p className="mt-2">{dict.auth.demoAdmin}</p>
        </div>
      </div>
    </main>
  );
}
