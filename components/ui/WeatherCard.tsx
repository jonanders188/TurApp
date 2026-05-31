export function WeatherCard({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-sky-100 via-emerald-50 to-stone-100 shadow-sm ring-1 ring-emerald-900/10 ${compact ? 'p-5' : 'p-6 md:p-7'}`}>
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-800 ring-1 ring-emerald-900/10">
            <span>☀️</span> Turvær
          </div>
          <h3 className={`${compact ? 'mt-3 text-2xl' : 'mt-5 text-3xl md:text-4xl'} max-w-md font-black tracking-tight text-emerald-950`}>
            Perfekt turvær de neste 3 timene
          </h3>
          <p className="mt-3 max-w-md text-sm leading-6 text-emerald-900">Sol, lite vind og opphold. Senere kobles dette til MET API for ekte anbefalinger.</p>
        </div>
        <div className="hidden min-w-36 rounded-[1.4rem] bg-white/80 p-4 text-center shadow-sm ring-1 ring-emerald-900/10 sm:block">
          <p className="text-4xl font-black text-emerald-950">14°</p>
          <p className="mt-1 text-xs font-bold text-slate-500">3 m/s · 0% regn</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
        <Metric value="14°" label="temp" />
        <Metric value="3 m/s" label="vind" />
        <Metric value="0%" label="regn" />
      </div>
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-emerald-900/5"><b className="text-emerald-950">{value}</b><br /><span className="text-xs font-semibold text-slate-500">{label}</span></div>;
}
