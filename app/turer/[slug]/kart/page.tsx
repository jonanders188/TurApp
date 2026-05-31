import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppBottomNav } from '@/components/ui/AppBottomNav';
import { TrailLeafletMap } from '@/components/map/TrailLeafletMap';
import { getTrailBySlug } from '@/lib/trails';
import { getGeometryQualityLabel, getGeometryQualityMessage, getRoutePointCount } from '@/lib/geo';
import { appleMapsUrlForTrail, googleMapsLabelForTrail, googleMapsUrlForTrail, gpxUrlForTrail, osmUrlForTrail } from '@/lib/googleMaps';

export const dynamic = 'force-dynamic';

export default async function TrailMapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { trail } = await getTrailBySlug(slug);

  if (!trail) notFound();

  const googleMapsUrl = googleMapsUrlForTrail(trail);
  const googleMapsLabel = googleMapsLabelForTrail(trail);
  const gpxUrl = gpxUrlForTrail(trail);
  const appleMapsUrl = appleMapsUrlForTrail(trail);
  const osmUrl = osmUrlForTrail(trail);
  const qualityLabel = getGeometryQualityLabel(trail);
  const qualityMessage = getGeometryQualityMessage(trail);
  const pointCount = getRoutePointCount(trail);

  return (
    <main className="min-h-screen bg-[#f4f7f2] pb-24 text-slate-950 md:pb-0">
      <section className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-10">
        <nav className="flex items-center justify-between gap-3">
          <Link href={`/turer/${trail.slug}`} className="rounded-full bg-white px-4 py-2 text-sm font-black text-emerald-950 shadow-sm ring-1 ring-emerald-900/10">← Til turen</Link>
          <Link href="/kart" className="rounded-full bg-emerald-950 px-4 py-2 text-sm font-black text-white">Alle ruter</Link>
        </nav>

        <header className="mt-5 rounded-[2.2rem] bg-white p-5 shadow-sm ring-1 ring-emerald-900/10 md:p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">Mobil kartmodus</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">{trail.name}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">Denne visningen er laget for når du faktisk går turen: stor rute, høy kontrast og mulighet for å se egen posisjon på kartet.</p>
        </header>

        <section className="mt-5 overflow-hidden rounded-[2.2rem] bg-white p-3 shadow-xl shadow-emerald-950/10 ring-1 ring-emerald-900/10 md:p-4">
          <TrailLeafletMap trail={trail} heightClass="h-[62vh] md:h-[70vh]" interactive followUser />
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-emerald-900/10">
            <div className="flex flex-wrap gap-2">
              <Badge>{qualityLabel}</Badge>
              <Badge>{pointCount} punkter</Badge>
              <Badge>{trail.distance_km} km</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-700">{qualityMessage}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">Hvis dere vil at rutene skal se virkelig pene og detaljerte ut på mobil, trenger dere tettere geometri enn 4–6 punkter. Dagens ruter er gode nok til oversikt, men ikke til premium stifølelse på alle turer.</p>
          </div>

          <div className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-emerald-900/10">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Åpne i annen kartapp</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-emerald-950 px-4 py-3 text-center text-sm font-black text-white hover:bg-emerald-900">{googleMapsLabel}</a>
              <a href={appleMapsUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-black text-slate-950 ring-1 ring-slate-900/10 hover:bg-slate-100">Apple Maps</a>
              <a href={osmUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-stone-50 px-4 py-3 text-center text-sm font-black text-stone-950 ring-1 ring-stone-900/10 hover:bg-stone-100">OpenStreetMap</a>
              <a href={gpxUrl} className="rounded-2xl bg-sky-50 px-4 py-3 text-center text-sm font-black text-sky-950 ring-1 ring-sky-900/10 hover:bg-sky-100">Last ned GPX</a>
            </div>
          </div>
        </section>
      </section>
      <AppBottomNav active="map" />
    </main>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{children}</span>;
}
