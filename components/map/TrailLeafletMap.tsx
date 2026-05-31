'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, ScaleControl, useMap } from 'react-leaflet';
import type { Trail } from '@/types/trail';
import { getGeometryQualityLabel, getTrailCoordinates, hasRouteGeometry } from '@/lib/geo';

type LatLngTuple = [number, number];

function toLatLngs(trail: Trail): LatLngTuple[] {
  return getTrailCoordinates(trail).map(([lng, lat]) => [lat, lng]);
}

function FitRoute({ points }: { points: LatLngTuple[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 14, { animate: false });
      return;
    }
    map.fitBounds(points, { padding: [28, 28] });
  }, [map, points]);

  return null;
}

function LocateMe({ enabled }: { enabled?: boolean }) {
  const map = useMap();
  const [position, setPosition] = useState<LatLngTuple | null>(null);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  if (!position) return null;

  return (
    <>
      <CircleMarker center={position} {...({ radius: 10 } as any)} pathOptions={{ color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 0.9, weight: 3 }} />
      <CircleMarker center={position} {...({ radius: 28 } as any)} pathOptions={{ color: '#93c5fd', fillColor: '#bfdbfe', fillOpacity: 0.15, weight: 1 }} />
    </>
  );
}

export function TrailLeafletMap({
  trail,
  heightClass = 'h-[22rem]',
  interactive = true,
  followUser = false,
}: {
  trail: Trail;
  heightClass?: string;
  interactive?: boolean;
  followUser?: boolean;
}) {
  const points = useMemo(() => toLatLngs(trail), [trail]);
  const hasRoute = hasRouteGeometry(trail);
  const qualityLabel = getGeometryQualityLabel(trail);
  const center = points[0] ?? [trail.lat ?? 59.3, trail.lng ?? 10.3];
  const initialBounds = points.length > 1
    ? points
    : [center, [center[0] + 0.003, center[1] + 0.003]];
  const mapProps: any = {
    className: 'h-full w-full',
    bounds: initialBounds,
    boundsOptions: { padding: [28, 28] },
    scrollWheelZoom: interactive,
    dragging: interactive,
    doubleClickZoom: interactive,
    touchZoom: interactive,
    zoomControl: interactive,
    attributionControl: false,
  };

  return (
    <div className={`relative overflow-hidden rounded-[1.8rem] border border-emerald-900/10 bg-[#eaf2ea] ${heightClass}`}>
      <MapContainer {...mapProps}>
        <TileLayer {...({
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '&copy; OpenStreetMap contributors',
        } as any)} />
        <FitRoute points={points} />
        <LocateMe enabled={followUser} />
        {hasRoute && points.length > 1 ? (
          <>
            <Polyline {...({ positions: points, pathOptions: { color: '#ffffff', weight: 13, opacity: 0.95 } } as any)} />
            <Polyline {...({ positions: points, pathOptions: { color: '#0f5d47', weight: 8, opacity: 1 } } as any)} />
            <Polyline {...({ positions: points, pathOptions: { color: '#86efac', weight: 3, opacity: 0.85 } } as any)} />
          </>
        ) : null}
        {points[0] ? <CircleMarker center={points[0]} {...({ radius: 8 } as any)} pathOptions={{ color: '#ffffff', fillColor: '#0f5d47', fillOpacity: 1, weight: 3 }} /> : null}
        {points.length > 1 ? <CircleMarker center={points[points.length - 1]} {...({ radius: 8 } as any)} pathOptions={{ color: '#ffffff', fillColor: '#111827', fillOpacity: 1, weight: 3 }} /> : null}
        <ScaleControl {...({ position: "bottomleft" } as any)} />
      </MapContainer>

      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-emerald-900 shadow-sm ring-1 ring-emerald-900/10">
          {hasRoute ? qualityLabel : 'Kun startpunkt'}
        </span>
        <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-900/10">
          {points.length} punkter
        </span>
      </div>
    </div>
  );
}
