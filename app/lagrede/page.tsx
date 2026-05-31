import Link from 'next/link';
import { AppBottomNav } from '@/components/ui/AppBottomNav';
import { SavedTrailsList } from '@/components/SavedTrailsList';

export default function SavedPage() {
  return (
    <main className="min-h-screen bg-[#f4f7f2] pb-24 text-slate-950 md:pb-0">
      <section className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-10">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-black text-emerald-950">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-900 text-white">⌁</span>
            <span>Turrute</span>
          </Link>
          <Link href="/turer" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-emerald-900 shadow-sm ring-1 ring-emerald-900/10">Alle turer</Link>
        </nav>

        <header className="mt-8 rounded-[2.2rem] bg-white p-6 shadow-sm ring-1 ring-emerald-900/10 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">Mine turer</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">Lagrede turer</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">Dette er en lettvektsfavoritt i browseren. Neste nivå etter dette er Supabase Auth + serverlagrede favoritter.</p>
        </header>

        <section className="mt-8">
          <SavedTrailsList />
        </section>
      </section>
      <AppBottomNav active="saved" />
    </main>
  );
}
