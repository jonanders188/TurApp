import Link from 'next/link';
import { TrailCard } from '@/components/TrailCard';
import { WaitlistForm } from '@/components/WaitlistForm';
import { AppBottomNav } from '@/components/ui/AppBottomNav';
import { FilterChip } from '@/components/ui/FilterChip';
import { SearchBar } from '@/components/ui/SearchBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { WeatherCard } from '@/components/ui/WeatherCard';
import { TrailRoutePreview } from '@/components/map/TrailRoutePreview';
import { getBestTrailNow, getTrails } from '@/lib/trails';

const quickFilters = [
  { label: 'Barnevogn', href: '/turer?suitable=stroller', icon: '◴' },
  { label: 'Bæremeis', href: '/turer?suitable=carrier', icon: '🎒' },
  { label: 'Lett å gå', href: '/turer?suitable=easy', icon: '↗' },
  { label: 'Rullestol', href: '/turer?suitable=wheelchair', icon: '♿' },
  { label: 'Barn', href: '/turer?suitable=children', icon: '👧' },
  { label: 'Hund', href: '/turer?suitable=dog', icon: '🐾' },
];

export default async function HomePage() {
  const { trails, source } = await getTrails();
  const bestTrail = getBestTrailNow(trails);
  const previewTrails = bestTrail ? [bestTrail, ...trails.filter((trail) => trail.id !== bestTrail.id).slice(0, 5)] : trails.slice(0, 6);

  return (
    <main className="min-h-screen bg-[#f4f7f2] pb-24 text-slate-950 md:pb-0">
      <section className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-10">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-black text-emerald-950">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-900 text-white shadow-lg shadow-emerald-900/15">⌁</span>
            <span className="text-xl">Turrute</span>
          </Link>
          <div className="hidden items-center gap-7 text-sm font-bold text-slate-600 md:flex">
            <Link href="/turer" className="hover:text-emerald-800">Turer</Link>
            <Link href="/kart" className="hover:text-emerald-800">Kart</Link>
            <Link href="/admin/import" className="hover:text-emerald-800">Dataimport</Link>
            <a href="#venteliste" className="rounded-full bg-emerald-950 px-5 py-2.5 text-white hover:bg-emerald-900">Venteliste</a>
          </div>
        </nav>

        <div className="mt-8 grid gap-7 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
          <section className="rounded-[2.4rem] bg-gradient-to-br from-emerald-950 via-emerald-900 to-[#12382c] p-6 text-white shadow-2xl shadow-emerald-950/20 md:p-10">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-100">Vestfold · levende ruter</p>
            <h1 className="mt-5 max-w-2xl text-5xl font-black tracking-tight md:text-7xl">
              Finn turen som faktisk passer i dag.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-emerald-50 md:text-lg">
              Turrute matcher nærturer med vær, tid og behov som barnevogn, bæremeis, lett å gå og rullestol.
            </p>
            <div className="mt-7">
              <SearchBar />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {quickFilters.slice(0, 4).map((filter) => (
                <Link key={filter.href} href={filter.href} className="rounded-full bg-white/12 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20 hover:bg-white/20">
                  <span className="mr-2">{filter.icon}</span>{filter.label}
                </Link>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/turer" className="rounded-full bg-white px-6 py-3 font-black text-emerald-950 shadow-sm hover:bg-emerald-50">
                Se Vestfold-turer
              </Link>
              <Link href="/kart" className="rounded-full bg-emerald-100 px-6 py-3 font-black text-emerald-950 shadow-sm hover:bg-white">
                Åpne kart
              </Link>
              <Link href="/turer?suitable=stroller" className="rounded-full border border-white/25 px-6 py-3 font-black text-white hover:bg-white/10">
                Finn barnevognvennlig
              </Link>
            </div>
            <p className="mt-6 text-xs font-semibold text-emerald-100">Datakilde: {source === 'supabase' ? 'Supabase TurApp' : 'lokal JSON fallback'}. Ekte importerte ruter vises under Kart.</p>
          </section>

          <section className="grid gap-5">
            <WeatherCard />
            {bestTrail ? (
              <div className="rounded-[2rem] bg-white p-4 shadow-xl ring-1 ring-emerald-900/10">
                <div className="grid gap-4 md:grid-cols-[1fr_0.9fr] md:items-center">
                  <TrailRoutePreview trail={bestTrail} compact />
                  <div className="p-2">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Best akkurat nå</p>
                    <h2 className="mt-2 text-3xl font-black tracking-tight text-emerald-950">{bestTrail.name}</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">Kort, enkel og praktisk tur med demo-rute på kartet. Værkortet kan senere kobles til MET API.</p>
                    <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
                      <Metric value={`${bestTrail.distance_km} km`} label="distanse" />
                      <Metric value={`${bestTrail.estimated_minutes} min`} label="tid" />
                      <Metric value={`${bestTrail.elevation_gain_m ?? 0} m`} label="stigning" />
                    </div>
                    <Link href={`/turer/${bestTrail.slug}`} className="mt-5 inline-flex rounded-full bg-emerald-950 px-5 py-3 text-sm font-black text-white hover:bg-emerald-900">Se turen →</Link>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <section className="mt-10 rounded-[2rem] bg-white/70 p-4 shadow-sm ring-1 ring-emerald-900/10 md:p-5">
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((filter) => <FilterChip key={filter.href} href={filter.href} label={filter.label} icon={filter.icon} />)}
          </div>
        </section>

        <section className="mt-12">
          <SectionHeader eyebrow="Utvalgte turer" title="Ruter i første versjon" href="/turer" />
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {previewTrails.map((trail, index) => <TrailCard key={trail.id} trail={trail} featured={index === 0} />)}
          </div>
        </section>

        <section id="venteliste" className="mt-12 overflow-hidden rounded-[2.2rem] bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <div className="grid gap-6 md:grid-cols-[1fr_0.9fr] md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200">Tidlig tilgang</p>
              <h2 className="mt-3 text-3xl font-black md:text-5xl">Vil du teste Turrute?</h2>
              <p className="mt-4 max-w-2xl text-slate-300">Legg igjen e-post. API-et lagrer i Supabase når server key er satt, ellers kan du fortsatt teste flyten lokalt.</p>
            </div>
            <WaitlistForm />
          </div>
        </section>
      </section>
      <AppBottomNav active="home" />
    </main>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="rounded-2xl bg-emerald-50 p-3"><b className="text-emerald-950">{value}</b><br /><span className="text-xs font-semibold text-slate-500">{label}</span></div>;
}
