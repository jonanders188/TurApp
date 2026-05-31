export function SearchBar({ placeholder = 'Hvor vil du gå tur?' }: { placeholder?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-full bg-white px-5 py-4 shadow-sm ring-1 ring-emerald-900/10">
      <span className="text-lg" aria-hidden="true">⌕</span>
      <span className="flex-1 text-sm font-semibold text-slate-500">{placeholder}</span>
      <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-emerald-900" aria-hidden="true">≡</span>
    </div>
  );
}
