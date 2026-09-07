import Link from 'next/link';
import { LogoMark } from '@/components/Logo';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink px-6 text-center">
      <LogoMark className="h-14 w-auto" light />
      <p className="mt-10 font-display text-[86px] font-light leading-none text-gold-300">404</p>
      <h1 className="mt-4 font-display text-[30px] font-light text-white">Page introuvable</h1>
      <p className="mt-4 max-w-sm text-[14.5px] leading-relaxed text-white/50">
        La page que vous cherchez n’existe pas ou a été déplacée.
      </p>
      <Link href="/fr" className="btn-gold mt-9">
        Retour à l’accueil
      </Link>
    </main>
  );
}
