import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Trail } from '@/types/trail';
import { getSuitabilityTags } from '@/lib/trails';
import { trailLocationLabel } from '@/lib/municipality';
import { SuitabilityBadge } from '@/components/ui/SuitabilityBadge';
import { TrailRoutePreview } from '@/components/map/TrailRoutePreview';
import { getGeometryQualityMessage, getRouteShapeLabel, hasRealRoute } from '@/lib/geo';
import { getTrailMode } from '@/lib/routeQuality';
import { googleMapsLabelForTrail, googleMapsUrlForTrail } from '@/lib/googleMaps';

const modeLabel: Record<string, string> = {
  walking: 'Gåtur',
  cycling: 'Sykkelrute',
  skiing: 'Skiløype',
  unknown: 'Tur',
};

export function TrailCard({ trail, featured = false }: { trail: Trail; featured?: boolean }) {
  const tags = getSuitabilityTags(trail).slice(0, 4);
  const googleUrl = googleMapsUrlForTrail(trail);
  const googleLabel = googleMapsLabelForTrail(trail);
  const mode = getTrailMode(trail);
  const routeSummary = getGeometryQualityMessage(trail);
  const shapeLabel = getRouteShapeLabel(trail);
  const realRoute = hasRealRoute(trail);
  const distanceToSearch = typeof trail.distance_to_search_km === 'number' ? trail.distance_to_search_km : null;
  const locationLabel = trailLocationLabel(trail);

  return (
    <article className={`overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-emerald-900/10 transition hover:-translate-y-1 hover:shadow-xl ${featured ? 'ring-2 ring-emerald-300' : ''}`}>
      <Link href={`/turer/${trail.slug}`} className="block" aria-label={`Se ${trail.name}`}>
        <TrailRoutePreview trail={trail} compact />
      </Link>

      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Pill>{modeLabel[mode] ?? 'Tur'}</Pill>
          <Pill>{shapeLabel}</Pill>
          <Pill>{realRoute ? 'Ekte rutedata' : 'Utvalgt tur'}</Pill>
          {distanceToSearch !== null ? <Pill>{distanceToSearch} km fra søk</Pill> : null}
        </div>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{locationLabel}</p>
            <Link href={`/turer/${trail.slug}`} className="mt-1 block text-2xl font-black tracking-tight text-slate-950 hover:text-emerald-800">
              {trail.name}
            </Link>
          </div>
          <div className="shrink-0 rounded-[1.3rem] bg-emerald-950 px-3 py-2 text-right text-sm text-white shadow-sm">
            <div className="font-black">{trail.distance_km} km</div>
            <div className="font-semibold text-emerald-100">{trail.estimated_minutes} min</div>
          </div>
        </div>

        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{trail.description}</p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <Metric value={distanceToSearch !== null ? `${distanceToSearch} km` : trail.difficulty} label={distanceToSearch !== null ? 'fra søk' : 'nivå'} />
          <Metric value={`${trail.elevation_gain_m ?? 0} m`} label="stigning" />
          <Metric value={trail.surface_type ?? 'Ukjent'} label="underlag" />
        </div>

        <div className="mt-4 rounded-[1.25rem] bg-emerald-50/70 p-3 text-xs font-semibold leading-5 text-emerald-950 ring-1 ring-emerald-900/5">
          {routeSummary}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tags.length ? tags.map((tag) => <SuitabilityBadge key={tag} label={tag} />) : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Tilgjengelighet ukjent</span>}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link href={`/turer/${trail.slug}`} className="rounded-full bg-emerald-950 px-4 py-3 text-center text-sm font-black text-white hover:bg-emerald-900">
            Se tur og kart
          </Link>
          <a href={googleUrl} target="_blank" rel="noreferrer" className="rounded-full bg-emerald-50 px-4 py-3 text-center text-sm font-black text-emerald-900 ring-1 ring-emerald-900/10 hover:bg-emerald-100">
            {googleLabel}
          </a>
        </div>
      </div>
    </article>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="rounded-[1rem] bg-slate-50 px-3 py-3 text-center ring-1 ring-slate-900/5"><div className="truncate text-sm font-black text-slate-950">{value}</div><div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div></div>;
}

function Pill({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{children}</span>;
}
