'use client';

import { useEffect, useMemo, useState } from 'react';

type WeatherState = {
  source: string;
  time: string | null;
  temperature: number | null;
  windSpeed: number | null;
  precipitation: number | null;
  label: string;
  recommendation: string;
};

type WeatherCardProps = {
  compact?: boolean;
  lat?: number | null;
  lng?: number | null;
  placeLabel?: string | null;
  useUserLocation?: boolean;
};

const FALLBACK = {
  lat: 59.2675,
  lng: 10.4076,
  label: 'Tønsberg',
};

function formatTime(value: string | null) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat('no-NO', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  } catch {
    return null;
  }
}

function sourceText(source: 'gps' | 'place' | 'fallback') {
  if (source === 'gps') return 'basert på posisjonen din';
  if (source === 'place') return 'basert på søkestedet';
  return 'fallback til Vestfold';
}

export function WeatherCard({ compact = false, lat, lng, placeLabel, useUserLocation = true }: WeatherCardProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number; label: string; source: 'gps' | 'place' | 'fallback' }>(() => {
    if (typeof lat === 'number' && typeof lng === 'number') {
      return { lat, lng, label: placeLabel || 'søkestedet', source: 'place' };
    }
    return { ...FALLBACK, source: 'fallback' };
  });
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'asking' | 'allowed' | 'denied'>('idle');

  useEffect(() => {
    if (typeof lat === 'number' && typeof lng === 'number') {
      setCoords({ lat, lng, label: placeLabel || 'søkestedet', source: 'place' });
      return;
    }

    if (!useUserLocation || typeof window === 'undefined' || !navigator.geolocation) {
      setCoords({ ...FALLBACK, source: 'fallback' });
      return;
    }

    setLocationStatus('asking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationStatus('allowed');
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: 'nær deg',
          source: 'gps',
        });
      },
      () => {
        setLocationStatus('denied');
        setCoords({ ...FALLBACK, source: 'fallback' });
      },
      { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 8000 },
    );
  }, [lat, lng, placeLabel, useUserLocation]);

  useEffect(() => {
    let active = true;
    setError(null);
    setWeather(null);

    fetch(`/api/weather?lat=${coords.lat}&lng=${coords.lng}`)
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(`Værdata feilet (${res.status})`)))
      .then((data) => { if (active) setWeather(data); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : String(err)); });

    return () => { active = false; };
  }, [coords.lat, coords.lng]);

  const title = useMemo(() => {
    if (weather?.label) {
      if (coords.source === 'gps') return `${weather.label} nær deg`;
      if (coords.source === 'place') return `${weather.label} i ${coords.label}`;
      return `${weather.label} i Vestfold`;
    }
    if (error) return 'Kunne ikke hente livevær';
    return 'Henter live turvær...';
  }, [coords.label, coords.source, error, weather?.label]);

  const observed = formatTime(weather?.time ?? null);

  return (
    <section className={`overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-sky-100 via-emerald-50 to-stone-100 shadow-sm ring-1 ring-emerald-900/10 ${compact ? 'p-5' : 'p-6 md:p-7'}`}>
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-800 ring-1 ring-emerald-900/10">
            <span>☀️</span> Live turvær
          </div>
          <h3 className={`${compact ? 'mt-3 text-2xl' : 'mt-5 text-3xl md:text-4xl'} max-w-md font-black tracking-tight text-emerald-950`}>
            {title}
          </h3>
          <p className="mt-3 max-w-md text-sm leading-6 text-emerald-900">
            {weather?.recommendation ?? (error ? 'MET/Yr svarte ikke akkurat nå. Prøv igjen, eller sjekk env TURRUTE_MET_USER_AGENT.' : `Henter vær fra MET/Yr ${sourceText(coords.source)}.`)}
          </p>
        </div>
        <div className="hidden min-w-36 rounded-[1.4rem] bg-white/80 p-4 text-center shadow-sm ring-1 ring-emerald-900/10 sm:block">
          <p className="text-4xl font-black text-emerald-950">{weather?.temperature != null ? `${Math.round(weather.temperature)}°` : '—'}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{weather?.windSpeed != null ? `${weather.windSpeed.toFixed(1)} m/s` : '—'} · {weather?.precipitation != null ? `${weather.precipitation.toFixed(1)} mm` : '—'}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
        <Metric value={weather?.temperature != null ? `${Math.round(weather.temperature)}°` : '—'} label="temp" />
        <Metric value={weather?.windSpeed != null ? `${weather.windSpeed.toFixed(1)} m/s` : '—'} label="vind" />
        <Metric value={weather?.precipitation != null ? `${weather.precipitation.toFixed(1)} mm` : '—'} label="neste t" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-emerald-900/80">
        <span>{coords.label} · {sourceText(coords.source)}</span>
        {observed ? <span>Oppdatert {observed}</span> : null}
        {locationStatus === 'denied' ? <span>Posisjon ikke delt</span> : null}
      </div>
      {error ? <p className="mt-3 text-xs font-semibold text-amber-800">Fallback: {error}</p> : null}
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-emerald-900/5"><b className="text-emerald-950">{value}</b><br /><span className="text-xs font-semibold text-slate-500">{label}</span></div>;
}
