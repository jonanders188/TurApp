import Link from 'next/link';

export function FilterChip({ href, label, active = false, icon }: { href: string; label: string; active?: boolean; icon?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
        active
          ? 'bg-emerald-950 text-white shadow-lg shadow-emerald-900/15'
          : 'bg-white text-emerald-950 ring-1 ring-emerald-900/10 hover:bg-emerald-50'
      }`}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {label}
    </Link>
  );
}
