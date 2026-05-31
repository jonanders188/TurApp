export function SearchBar({
  placeholder = 'Søk etter sted, f.eks. Tønsberg, Horten eller Larvik',
  defaultValue = '',
  compact = false,
}: {
  placeholder?: string;
  defaultValue?: string;
  compact?: boolean;
}) {
  return (
    <form action="/turer" method="get" className={`flex items-center gap-2 rounded-full bg-white shadow-sm ring-1 ring-emerald-900/10 ${compact ? 'px-4 py-3' : 'px-5 py-4'}`}>
      <span className="text-lg text-emerald-900" aria-hidden="true">⌕</span>
      <input
        type="search"
        name="sted"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-500"
        aria-label="Søk etter sted"
      />
      <button type="submit" className="shrink-0 rounded-full bg-emerald-950 px-4 py-2 text-sm font-black text-white hover:bg-emerald-900">
        Finn turer
      </button>
    </form>
  );
}
