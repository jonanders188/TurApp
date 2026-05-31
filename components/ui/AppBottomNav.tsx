import Link from 'next/link';

export function AppBottomNav({ active = 'home' }: { active?: 'home' | 'trails' | 'map' | 'saved' | 'profile' }) {
  const items = [
    { key: 'home', href: '/', label: 'Hjem', icon: '⌂' },
    { key: 'trails', href: '/turer', label: 'Turer', icon: '⌖' },
    { key: 'map', href: '/kart', label: 'Kart', icon: '⌁' },
    { key: 'saved', href: '/lagrede', label: 'Lagret', icon: '♡' },
    { key: 'profile', href: '#', label: 'Profil', icon: '◌' },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-emerald-900/10 bg-white/90 px-4 py-2 shadow-2xl backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <Link key={item.key} href={item.href} className={`rounded-2xl px-2 py-2 text-center text-xs font-bold ${isActive ? 'bg-emerald-50 text-emerald-900' : 'text-slate-500'}`}>
              <span className="block text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
