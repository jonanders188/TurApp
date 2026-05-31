import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppBottomNav } from '@/components/ui/AppBottomNav';
import { TrailRoutePreview } from '@/components/map/TrailRoutePreview';
import { getTrailBySlug } from '@/lib/trails';
import { appleMapsUrlForTrail, googleMapsLabelForTrail, googleMapsUrlForTrail, gpxUrlForTrail, osmUrlForTrail } from '@/lib/googleMaps';
import { getTrailCoordinates } from '@/lib/geo';

export const dynamic = 'force-dynamic';

export default async function TrailMapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { trail } = await getTrailBySlug(slug);

  if (!trail) notFound();

  const coords = getTrailCoordinates(trail);
  const googleMapsUrl = googleMapsUrlForTrail(trail);
  const googleMapsLabel = googleMapsLabelForTrail(trail);
  const gpxUrl = gpxUrlForTrail(trail);
  const appleMapsUrl = appleMapsUrlForTrail(trail);
  const osmUrl = osmUrlForTrail(trail);

  return (
    <main className="min-h-screen bg-[#f4f7f2] pb-24 text-slate-950 md:pb-0">
      <section className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-10">
        <nav className="flex items-center justify-between gap-4">
          <Link href={`/turer/${trail.slug}`} className="rounded-full bg-white px-4 py-2 text-sm font-black text-emerald-950 shadow-sm ring-1 ring-emerald-900/10">← Til turen</Link>
          <Link href="/kart" className="rounded-full bg-emerald-950 px-4 py-2 text-sm font-black text-white">Alle ruter</Link>
        </nav>

        <header className="mt-6 grid gap-6 rounded-[2.4rem] bg-emerald-950 p-6 text-white shadow-2xl shadow-emerald-950/15 md:p-9 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-emerald-200">Rutevisning</p>
            <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">{trail.name}</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-emerald-50">
              Se selve turen før du går. Denne visningen bruker rutegeometrien som ligger i Turrute, ikke bare et startpunkt.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm font-black text-emerald-950">
            <span className="rounded-2xl bg-white px-4 py-3">{trail.distance_km} km</span>
            <span className="rounded-2xl bg-white px-4 py-3">{trail.estimated_minutes} min</span>
            <span className="rounded-2xl bg-white px-4 py-3">{coords.length} punkt</span>
          </div>
        </header>

        <section className="mt-8 overflow-hidden rounded-[2.4rem] bg-white p-3 shadow-2xl shadow-emerald-950/10 ring-1 ring-emerald-900/10">
          <TrailRoutePreview trail={trail} />
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-5">
          <Link href={`/turer/${trail.slug}`} className="rounded-[1.4rem] bg-white p-5 font-black text-emerald-950 shadow-sm ring-1 ring-emerald-900/10 hover:bg-emerald-50">Turdetaljer</Link>
          <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="rounded-[1.4rem] bg-emerald-950 p-5 font-black text-white shadow-sm hover:bg-emerald-900">{googleMapsLabel}</a>
          <a href={gpxUrl} className="rounded-[1.4rem] bg-sky-50 p-5 font-black text-sky-950 shadow-sm ring-1 ring-sky-900/10 hover:bg-sky-100">Last ned GPX</a>
          <a href={appleMapsUrl} target="_blank" rel="noreferrer" className="rounded-[1.4rem] bg-slate-50 p-5 font-black text-slate-950 shadow-sm ring-1 ring-slate-900/10 hover:bg-slate-100">Apple Maps</a>
          <a href={osmUrl} target="_blank" rel="noreferrer" className="rounded-[1.4rem] bg-stone-50 p-5 font-black text-stone-950 shadow-sm ring-1 ring-stone-900/10 hover:bg-stone-100">OpenStreetMap</a>
        </section>

        <section className="mt-6 rounded-[1.8rem] bg-amber-50 p-5 text-sm font-semibold leading-7 text-amber-950 ring-1 ring-amber-200">
          Google Maps og Apple Maps kan ikke alltid vise nøyaktig samme sti som Turrute. For rundtur og korte turer brukes de ofte best til startpunkt. GPX-filen er laget for kartapper som støtter import av turspor.
        </section>
      </section>
      <AppBottomNav active="map" />
    </main>
  );
}
