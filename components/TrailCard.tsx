import Link from 'next/link';
import type { Trail } from '@/types/trail';
import { getSuitabilityTags } from '@/lib/trails';
import { SuitabilityBadge } from '@/components/ui/SuitabilityBadge';
import { TrailRoutePreview } from '@/components/map/TrailRoutePreview';
import { hasRealRoute } from '@/lib/geo';
import { getTrailMode } from '@/lib/routeQuality';
import { googleMapsLabelForTrail, googleMapsUrlForTrail, gpxUrlForTrail } from '@/lib/googleMaps';

const modeLabel: Record<string, string> = {
  walking: 'Gåtur',
  cycling: 'Sykkelrute',
  skiing: 'Skiløype',
  sea: 'Sjø-/padlerute',
  unknown: 'Ikke klassifisert',
};

export function TrailCard({ trail, featured = false }: { trail: Trail; featured?: boolean }) {
  const tags = getSuitabilityTags(trail).slice(0, 3);
  const hasRoute = Boolean(trail.route_geojson?.coordinates?.length && trail.route_geojson.coordinates.length > 1);
  const realRoute = hasRealRoute(trail);
  const mode = getTrailMode(trail);
  const googleUrl = googleMapsUrlForTrail(trail);
  const googleLabel = googleMapsLabelForTrail(trail);

  return (
    <article
      className={`group overflow-hidden rounded-[2rem] border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-2xl ${featured ? 'border-emerald-400 ring-4 ring-emerald-100' : 'border-emerald-950/10'}`}
    >
      <Link href={`/turer/${trail.slug}`} className="block" aria-label={`Se ${trail.name}`}>
        <TrailRoutePreview trail={trail} compact />
      </Link>

      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          {realRoute ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">Ekte Kartverket-rute</span> : null}
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{modeLabel[mode] ?? trail.route_type ?? 'Tur'}</span>
          {trail.curated ? <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-800">Kuratert tur</span> : null}
        </div>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{trail.municipality}{trail.area ? ` · ${trail.area}` : ''}</p>
            <Link href={`/turer/${trail.slug}`} className="mt-1 block line-clamp-2 text-2xl font-black tracking-tight text-slate-950 group-hover:text-emerald-800">
              {trail.name}
            </Link>
          </div>
          <div className="shrink-0 rounded-2xl bg-emerald-950 px-3 py-2 text-right text-sm text-white shadow-sm">
            <div className="font-black">{trail.distance_km} km</div>
            <div className="font-semibold text-emerald-100">{trail.estimated_minutes} min</div>
          </div>
        </div>

        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{trail.description}</p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-600">
          <MiniMetric value={trail.difficulty} label="nivå" />
          <MiniMetric value={hasRoute ? 'Synlig' : 'Nei'} label="rute" />
          <MiniMetric value={trail.route_type ?? 'Tur'} label="type" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tags.length ? tags.map((tag) => <SuitabilityBadge key={tag} label={tag} />) : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Tilgjengelighet ukjent</span>}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Link href={`/turer/${trail.slug}`} className="rounded-full bg-emerald-950 px-4 py-2.5 text-center text-sm font-black text-white hover:bg-emerald-900">
            Se tur
          </Link>
          <a href={googleUrl} target="_blank" rel="noreferrer" className="rounded-full bg-emerald-50 px-4 py-2.5 text-center text-sm font-black text-emerald-900 ring-1 ring-emerald-900/10 hover:bg-emerald-100">
            {googleLabel}
          </a>
          <a href={gpxUrlForTrail(trail)} className="rounded-full bg-slate-50 px-4 py-2.5 text-center text-sm font-black text-slate-800 ring-1 ring-slate-900/10 hover:bg-slate-100">
            GPX
          </a>
        </div>
      </div>
    </article>
  );
}

function MiniMetric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2">
      <span className="block truncate font-black text-slate-950">{value}</span>
      <span className="font-semibold">{label}</span>
    </div>
  );
}
