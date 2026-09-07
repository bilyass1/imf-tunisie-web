import Link from 'next/link';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { getSession } from '@/lib/session';
import { LogoMark } from '@/components/Logo';
import LoginForm from '@/components/auth/LoginForm';
import { IconArrowLeft } from '@/components/Icons';

export default async function ClientLoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = getDictionary(locale);

  const session = await getSession();
  if (session) redirect(`/${locale}/espace-client`);

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Visuel */}
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/media/la-gloire/facade-nuit-1.jpg" alt="" className="h-full w-full object-cover opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12">
          <LogoMark className="h-12 w-auto" light />
          <h2 className="h-display mt-6 max-w-sm text-[38px] text-white">{dict.auth.clientTitle}</h2>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/55">{dict.auth.clientSubtitle}</p>
        </div>
      </div>

      {/* Formulaire */}
      <div className="flex flex-col justify-center bg-ivory px-6 py-14 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <Link
            href={`/${locale}`}
            className="mb-10 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink/45 transition hover:text-gold-600"
          >
            <IconArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {dict.auth.backToSite}
          </Link>

          <div className="lg:hidden">
            <LogoMark className="h-11 w-auto" />
          </div>

          <h1 className="h-display mt-6 text-[34px]">{dict.auth.clientTitle}</h1>
          <div className="rule-gold mt-5" />
          <p className="mt-5 text-[14.5px] leading-relaxed text-ink/55">{dict.auth.clientSubtitle}</p>

          <div className="mt-9">
            <LoginForm
              locale={locale}
              scope="client"
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

          <div className="mt-10 rounded-xl border border-dashed border-ink/15 bg-white/60 px-5 py-4 text-[12px] text-ink/50">
            <p className="font-semibold uppercase tracking-[0.14em] text-ink/40">{dict.auth.demoTitle}</p>
            <p className="mt-2">{dict.auth.demoClient}</p>
            <p className="mt-1">{dict.auth.demoAdmin}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
