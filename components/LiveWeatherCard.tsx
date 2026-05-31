'use client';

import { useEffect, useState } from 'react';

type WeatherState = {
  source: string;
  time: string | null;
  temperature: number | null;
  windSpeed: number | null;
  precipitation: number | null;
  label: string;
  recommendation: string;
};

export function LiveWeatherCard({ lat, lng, compact = false }: { lat: number | null; lng: number | null; compact?: boolean }) {
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lat || !lng) return;
    let active = true;
    fetch(`/api/weather?lat=${lat}&lng=${lng}`)
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(`Værdata feilet (${res.status})`)))
      .then((data) => { if (active) setWeather(data); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : String(err)); });
    return () => { active = false; };
  }, [lat, lng]);

  return (
    <section className={`overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-sky-100 via-emerald-50 to-stone-100 shadow-sm ring-1 ring-emerald-900/10 ${compact ? 'p-5' : 'p-6 md:p-7'}`}>
      <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-800 ring-1 ring-emerald-900/10">
        <span>☀️</span> Live turvær
      </div>
      <h3 className={`${compact ? 'mt-3 text-2xl' : 'mt-5 text-3xl md:text-4xl'} max-w-md font-black tracking-tight text-emerald-950`}>
        {weather?.label ?? (error ? 'Demo-vær' : 'Henter værdata...')}
      </h3>
      <p className="mt-3 max-w-md text-sm leading-6 text-emerald-900">
        {weather?.recommendation ?? (error ? 'Kunne ikke hente MET akkurat nå. Sjekk nett og TURRUTE_MET_USER_AGENT senere.' : 'Kobler til MET API basert på turens startpunkt.')}
      </p>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
        <Metric value={weather?.temperature != null ? `${Math.round(weather.temperature)}°` : '—'} label="temp" />
        <Metric value={weather?.windSpeed != null ? `${weather.windSpeed.toFixed(1)} m/s` : '—'} label="vind" />
        <Metric value={weather?.precipitation != null ? `${weather.precipitation.toFixed(1)} mm` : '—'} label="neste t" />
      </div>
      {error ? <p className="mt-3 text-xs font-semibold text-amber-800">Fallback: {error}</p> : null}
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-emerald-900/5"><b className="text-emerald-950">{value}</b><br /><span className="text-xs font-semibold text-slate-500">{label}</span></div>;
}
