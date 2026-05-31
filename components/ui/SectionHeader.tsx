import Link from 'next/link';

export function SectionHeader({ eyebrow, title, href, action = 'Se alle' }: { eyebrow?: string; title: string; href?: string; action?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">{eyebrow}</p> : null}
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">{title}</h2>
      </div>
      {href ? (
        <Link href={href} className="hidden rounded-full bg-white px-5 py-3 text-sm font-bold text-emerald-900 shadow-sm ring-1 ring-emerald-900/10 hover:bg-emerald-50 sm:inline-flex">
          {action} →
        </Link>
      ) : null}
    </div>
  );
}
