import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppBottomNav } from '@/components/ui/AppBottomNav';
import { TrailLeafletMap } from '@/components/map/TrailLeafletMap';
import { SuitabilityBadge } from '@/components/ui/SuitabilityBadge';
import { LiveWeatherCard } from '@/components/LiveWeatherCard';
import { SaveTrailButton } from '@/components/SaveTrailButton';
import { AccessibilityReportForm } from '@/components/AccessibilityReportForm';
import { NearbyAmenitiesCard } from '@/components/NearbyAmenitiesCard';
import { getSuitabilityTags, getTrailBySlug } from '@/lib/trails';
import {
  getGeometryQualityLabel,
  getGeometryQualityMessage,
  getRoutePointCount,
  getRouteShapeLabel,
  hasRealRoute,
} from '@/lib/geo';
import { appleMapsUrlForTrail, googleMapsLabelForTrail, googleMapsUrlForTrail, gpxUrlForTrail, osmUrlForTrail } from '@/lib/googleMaps';

export const dynamic = 'force-dynamic';

export default async function TrailDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { trail, source } = await getTrailBySlug(slug);

  if (!trail) notFound();

  const suitabilityTags = getSuitabilityTags(trail);
  const realRoute = hasRealRoute(trail);
  const googleMapsUrl = googleMapsUrlForTrail(trail);
  const googleMapsLabel = googleMapsLabelForTrail(trail);
  const gpxUrl = gpxUrlForTrail(trail);
  const appleMapsUrl = appleMapsUrlForTrail(trail);
  const osmUrl = osmUrlForTrail(trail);
  const qualityLabel = getGeometryQualityLabel(trail);
  const qualityMessage = getGeometryQualityMessage(trail);
  const shapeLabel = getRouteShapeLabel(trail);
  const pointCount = getRoutePointCount(trail);

  return (
    <main className="min-h-screen bg-[#f4f7f2] pb-28 text-slate-950 md:pb-0">
      <article className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-10">
        <Link href="/turer" className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-emerald-950 shadow-sm ring-1 ring-emerald-900/10">← Til turene</Link>

        <div className="mt-5 overflow-hidden rounded-[2.2rem] bg-white shadow-xl shadow-emerald-950/10 ring-1 ring-emerald-900/10">
          <div className="p-4 md:p-6">
            <TrailLeafletMap trail={trail} heightClass="h-[23rem] md:h-[32rem]" interactive followUser={false} />
          </div>

          <div className="grid gap-6 px-5 pb-6 md:px-8 md:pb-8 lg:grid-cols-[1.05fr_0.95fr]">
            <section>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{qualityLabel}</Badge>
                <Badge>{shapeLabel}</Badge>
                <Badge>{realRoute ? 'Ekte rutedata' : 'Kuratert rute'}</Badge>
              </div>

              <p className="mt-4 text-xs font-black uppercase tracking-[0.24em] text-emerald-700">{trail.municipality}{trail.area ? ` · ${trail.area}` : ''}</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">{trail.name}</h1>
              <p className="mt-4 text-base leading-7 text-slate-600">{trail.description}</p>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Distanse" value={`${trail.distance_km} km`} />
                <Metric label="Tid" value={`${trail.estimated_minutes} min`} />
                <Metric label="Nivå" value={trail.difficulty} />
                <Metric label="Stigning" value={`${trail.elevation_gain_m ?? 0} m`} />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {suitabilityTags.length ? suitabilityTags.map((tag) => <SuitabilityBadge key={tag} label={tag} />) : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Tilgjengelighet ukjent</span>}
              </div>

              <div className="mt-5 rounded-[1.5rem] bg-amber-50 p-4 ring-1 ring-amber-200">
                <p className="text-sm font-black text-amber-950">Kartkvalitet: {qualityLabel}</p>
                <p className="mt-2 text-sm leading-6 text-amber-900">{qualityMessage}</p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Link className="rounded-full bg-emerald-950 px-6 py-3 text-center font-black text-white hover:bg-emerald-900" href={`/turer/${trail.slug}/kart`}>
                  Start tur på kart
                </Link>
                <a className="rounded-full bg-emerald-50 px-6 py-3 text-center font-black text-emerald-950 ring-1 ring-emerald-900/10 hover:bg-emerald-100" href={googleMapsUrl} target="_blank" rel="noreferrer">
                  {googleMapsLabel}
                </a>
                <a className="rounded-full bg-sky-50 px-6 py-3 text-center font-black text-sky-950 ring-1 ring-sky-900/10 hover:bg-sky-100" href={gpxUrl}>
                  Last ned GPX
                </a>
                <SaveTrailButton trail={trail} variant="outline" />
              </div>
            </section>

            <section className="grid gap-5">
              <div className="rounded-[1.8rem] bg-slate-50 p-5 ring-1 ring-slate-900/5">
                <h2 className="text-2xl font-black tracking-tight text-slate-950">Når bør du gå?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Bruk vær og egnethet til å bestemme om denne turen passer akkurat nå.</p>
                <div className="mt-4">
                  <LiveWeatherCard lat={trail.lat} lng={trail.lng} compact />
                </div>
              </div>

              <div className="rounded-[1.8rem] bg-slate-50 p-5 ring-1 ring-slate-900/5">
                <h2 className="text-2xl font-black tracking-tight text-slate-950">Praktisk informasjon</h2>
                <dl className="mt-4 divide-y divide-slate-200 rounded-[1.4rem] bg-white px-4 ring-1 ring-slate-900/5">
                  <Info label="Turform" value={shapeLabel} />
                  <Info label="Underlag" value={trail.surface_type ?? 'Ukjent'} />
                  <Info label="Parkering" value={trail.has_parking ? 'Ja' : 'Ukjent'} />
                  <Info label="Toalett" value={trail.has_toilet ? 'Ja' : 'Ukjent'} />
                  <Info label="Rutepunkter" value={String(pointCount)} />
                </dl>
              </div>

              <NearbyAmenitiesCard lat={trail.lat} lng={trail.lng} />
            </section>
          </div>

          <div className="grid gap-5 border-t border-emerald-900/10 p-5 md:grid-cols-[1fr_1fr] md:p-8">
            <AccessibilityReportForm trailId={trail.id} />
            <section className="rounded-[1.8rem] bg-emerald-950 p-6 text-white shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">Kart og navigasjon</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">Åpne turen i riktig kartverktøy</h2>
              <p className="mt-4 text-sm leading-7 text-emerald-50">Turrute-kartet er best for å se selve turen. Google og Apple er best for å komme deg til start eller for enkel navigasjon. GPX er best når du trenger et faktisk spor i en ekstern app.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Link href={`/turer/${trail.slug}/kart`} className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-emerald-950 hover:bg-emerald-50">Åpne stort Turrute-kart</Link>
                <a href={osmUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-white/10 px-4 py-3 text-center text-sm font-black text-white ring-1 ring-white/15 hover:bg-white/15">OpenStreetMap</a>
                <a href={appleMapsUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-white/10 px-4 py-3 text-center text-sm font-black text-white ring-1 ring-white/15 hover:bg-white/15">Apple Maps</a>
                <a href={gpxUrl} className="rounded-2xl bg-white/10 px-4 py-3 text-center text-sm font-black text-white ring-1 ring-white/15 hover:bg-white/15">Last ned GPX</a>
              </div>
            </section>
          </div>

          <div className="border-t border-emerald-900/10 p-5 md:px-8 md:pb-8">
            <p className="text-xs leading-6 text-slate-500">Datakilde: {source}. {realRoute ? 'Denne turen bruker rutegeometri fra Kartverket/Turrutebasen.' : 'Denne turen bruker en kuratert app-rute som bør erstattes eller forbedres med tettere geometri om dere vil gi virkelig detaljert mobilnavigasjon.'} {trail.data_quality_note ?? ''}</p>
          </div>
        </div>
      </article>

      <div className="fixed inset-x-0 bottom-16 z-20 px-4 md:hidden">
        <div className="mx-auto flex max-w-md gap-2 rounded-[1.4rem] bg-white/95 p-2 shadow-2xl ring-1 ring-emerald-900/10 backdrop-blur">
          <Link href={`/turer/${trail.slug}/kart`} className="flex-1 rounded-[1rem] bg-emerald-950 px-4 py-3 text-center text-sm font-black text-white">Start tur</Link>
          <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="rounded-[1rem] bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-950 ring-1 ring-emerald-900/10">Kartapp</a>
        </div>
      </div>
      <AppBottomNav active="trails" />
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-[1.25rem] bg-emerald-50 p-4 ring-1 ring-emerald-900/5"><dt className="text-xs font-black uppercase tracking-wider text-emerald-700">{label}</dt><dd className="mt-1 text-xl font-black text-emerald-950">{value}</dd></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 py-3 text-sm"><dt className="font-bold text-slate-500">{label}</dt><dd className="text-right font-black text-slate-900">{value}</dd></div>;
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{children}</span>;
}
