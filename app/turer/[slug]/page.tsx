import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TrailRoutePreview } from '@/components/map/TrailRoutePreview';
import { AppBottomNav } from '@/components/ui/AppBottomNav';
import { SuitabilityBadge } from '@/components/ui/SuitabilityBadge';
import { LiveWeatherCard } from '@/components/LiveWeatherCard';
import { SaveTrailButton } from '@/components/SaveTrailButton';
import { AccessibilityReportForm } from '@/components/AccessibilityReportForm';
import { NearbyAmenitiesCard } from '@/components/NearbyAmenitiesCard';
import { getSuitabilityTags, getTrailBySlug } from '@/lib/trails';
import { hasRealRoute } from '@/lib/geo';
import { googleMapsLabelForTrail, googleMapsUrlForTrail, shouldUseGoogleDirections } from '@/lib/googleMaps';

export const dynamic = 'force-dynamic';

export default async function TrailDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { trail, source } = await getTrailBySlug(slug);

  if (!trail) notFound();

  const suitabilityTags = getSuitabilityTags(trail);
  const hasRoute = Boolean(trail.route_geojson?.coordinates?.length && trail.route_geojson.coordinates.length > 1);
  const realRoute = hasRealRoute(trail);
  const googleMapsUrl = googleMapsUrlForTrail(trail);
  const googleMapsHasRoute = shouldUseGoogleDirections(trail);
  const googleMapsLabel = googleMapsLabelForTrail(trail);

  return (
    <main className="min-h-screen bg-[#f4f7f2] pb-24 text-slate-950 md:pb-0">
      <article className="mx-auto max-w-6xl px-5 py-6 md:px-8 md:py-10">
        <div className="overflow-hidden rounded-[2.4rem] bg-white shadow-2xl shadow-emerald-950/10 ring-1 ring-emerald-900/10">
          <div className="relative grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative min-h-[22rem] bg-emerald-100">
              <TrailRoutePreview trail={trail} />
              <div className="absolute left-5 top-5 flex gap-2">
                <Link href="/turer" className="rounded-full bg-white/90 px-4 py-2 text-sm font-black text-emerald-950 shadow-sm backdrop-blur">← Turer</Link>
              </div>
            </div>

            <header className="p-6 md:p-9">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">{trail.municipality}{trail.area ? ` · ${trail.area}` : ''}</p>
              <h1 className="mt-3 text-5xl font-black tracking-tight text-slate-950 md:text-7xl">{trail.name}</h1>
              <p className="mt-5 text-base leading-8 text-slate-600">{trail.description}</p>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                <Metric label="Distanse" value={`${trail.distance_km} km`} />
                <Metric label="Tid" value={`${trail.estimated_minutes} min`} />
                <Metric label="Nivå" value={trail.difficulty} />
                <Metric label="Stigning" value={`${trail.elevation_gain_m ?? 0} m`} />
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {suitabilityTags.map((tag) => <SuitabilityBadge key={tag} label={tag} />)}
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <a className="rounded-full bg-emerald-950 px-6 py-3 font-black text-white hover:bg-emerald-900" href={googleMapsUrl} target="_blank" rel="noreferrer">
                  {googleMapsLabel}
                </a>
                <SaveTrailButton trail={trail} variant="outline" />
              </div>
            </header>
          </div>

          <div className="grid gap-5 border-t border-emerald-900/10 p-6 md:grid-cols-[0.9fr_1.1fr] md:p-8">
            <div className="grid gap-5">
              <LiveWeatherCard lat={trail.lat} lng={trail.lng} compact />
              <NearbyAmenitiesCard lat={trail.lat} lng={trail.lng} />
            </div>
            <section className="rounded-[1.8rem] bg-slate-50 p-5 ring-1 ring-slate-900/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Praktisk informasjon</h2>
                  <p className="mt-1 text-sm text-slate-500">Detaljer som gjør turen lettere å velge.</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${hasRoute ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {hasRoute ? (realRoute ? 'Ekte rute' : 'Rute klar') : 'Kun punkt'}
                </span>
              </div>
              <dl className="mt-5 divide-y divide-slate-200 rounded-[1.4rem] bg-white px-4 ring-1 ring-slate-900/5">
                <Info label="Underlag" value={trail.surface_type ?? 'Ukjent'} />
                <Info label="Turtype" value={trail.route_type ?? 'Ukjent'} />
                <Info label="Parkering" value={trail.has_parking ? 'Ja' : 'Ukjent'} />
                <Info label="Toalett" value={trail.has_toilet ? 'Ja' : 'Ukjent'} />
                <Info label="Koordinater" value={trail.lat && trail.lng ? `${trail.lat}, ${trail.lng}` : 'Mangler'} />
              </dl>
            </section>
          </div>


          <div className="grid gap-5 border-t border-emerald-900/10 p-6 md:grid-cols-[1fr_1fr] md:p-8">
            <AccessibilityReportForm trailId={trail.id} />
            <section className="rounded-[1.8rem] bg-emerald-950 p-6 text-white shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">Neste nivå</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">Kvalitetssikring før lansering</h2>
              <p className="mt-4 text-sm leading-7 text-emerald-50">Denne siden kan nå vise ekte rutegeometri fra Kartverket/Geonorge. Før offentlig lansering bør rullestoltilgang, underlag og praktisk info sjekkes mot feltdata eller lokale kilder.</p>
            </section>
          </div>

          <div className="border-t border-emerald-900/10 p-6 md:p-8">
            <h2 className="text-2xl font-black">Tags og datakilde</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {trail.tags.map((tag) => <span key={tag} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-900/10">{tag}</span>)}
            </div>
            <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-xs font-semibold leading-6 text-amber-900">Google Maps brukes selektivt: gode lineære landruter åpnes som start/slutt-navigasjon, mens rundtur, ukjent rute og sjø-/AnnenRute åpnes som veibeskrivelse til startpunkt. Den eksakte Kartverket-ruten vises i Turrute-kartet på denne siden.</p>
            <p className="mt-5 text-xs leading-6 text-slate-500">Datakilde: {source}. {realRoute ? 'Denne turen har importert rutegeometri fra Kartverket/Geonorge Turrutebasen.' : 'Denne turen bruker demo-GeoJSON eller lokal fallback og bør erstattes med ekte rutedata.'} {trail.data_quality_note ?? ''}</p>
          </div>
        </div>
      </article>
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
